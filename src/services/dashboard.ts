// Dashboard + passwordless auth routes (ADR-0003, Phases 10–12). Mounted only when
// the paid tier is on AND a SESSION_SECRET is set; with the secret absent the app
// serves the free redirects + /tls-check exactly as before (no auth surface).
//
// Identity is a Polar customer_id carried in a signed, rolling session cookie. The
// pure token logic lives in signed-token.ts; everything here is the I/O glue:
// Polar customer lookup, email delivery, cookies, and HTML rendering.

import type { Context, Hono, Next } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { type Claims, signToken, verifyToken } from "./signed-token.ts";
import { createEmailSender, type EmailSender } from "./email.ts";
import {
  createCustomerSession,
  findCustomerIdByEmail,
  getCheckoutCustomer,
} from "./polar-api.ts";
import {
  getActivePlanCap,
  listCustomerDomainsInScope,
  removeDomain,
  upsertDomain,
} from "./paid-store.ts";
import { decideAddDomain } from "./domain-rules.ts";
import {
  loginPage,
  magicLinkEmail,
  portalPage,
  type ScopeView,
  verifyErrorPage,
} from "./dashboard-views.ts";
import { normalizeDomain, type Scope } from "./authorization.ts";
import { type CertStore, deleteCertsForSubscription } from "./cert-teardown.ts";
import type { AuthzCache } from "./authz-cache.ts";
import type { Sql } from "./db.ts";
import type { AppConfig } from "../config.ts";

const SESSION_COOKIE = "rc_session";
const MAGIC_TTL_MS = 15 * 60 * 1000; // single-use sign-in link
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // rolling 30-day session

const SCOPES: ReadonlyArray<{ scope: Scope; label: string }> = [
  { scope: "single", label: "Single hosts" },
  { scope: "whole-domain", label: "Whole domains" },
];

export interface DashboardDeps {
  app: Hono;
  db: Sql;
  config: AppConfig;
  // The in-process authorization cache, refreshed after every Domain change so a
  // /tls-check / paywall decision reflects the dashboard within the same request.
  cache: AuthzCache;
  // S3 cert store for teardown on remove (#5). Absent when S3 isn't configured —
  // the Domain is still deactivated, the cert just isn't deleted.
  certStore?: CertStore;
}

export function mountDashboard(deps: DashboardDeps): void {
  const { app, db, config, cache, certStore } = deps;
  const baseUrl = config.appBaseUrl || `https://${config.fqdn}`;
  const polarOpts = {
    apiBase: config.polarApiBase,
    accessToken: config.polarAccessToken,
  };
  const email: EmailSender = createEmailSender({
    smtpHost: config.smtpHost,
    smtpPort: config.smtpPort,
    resendApiKey: config.resendApiKey,
    emailFrom: config.emailFrom,
  });

  // Local magic-link directory ("email:customerId,…"), used ONLY when Polar isn't
  // configured — Polar is the real customer directory, so this can never shadow
  // it. Lets the dashboard be exercised end-to-end without a Polar account.
  const devDirectory = new Map<string, string>();
  for (
    const entry of config.devAuthCustomers.split(",").map((s) => s.trim())
      .filter(Boolean)
  ) {
    const i = entry.indexOf(":");
    if (i <= 0) continue;
    devDirectory.set(
      entry.slice(0, i).trim().toLowerCase(),
      entry.slice(i + 1).trim(),
    );
  }
  if (devDirectory.size && !config.polarAccessToken) {
    console.warn(
      `[auth] DEV magic-link directory active (${devDirectory.size} email(s)) — local testing only, no Polar`,
    );
  }

  // Resolve an email to a customer_id: Polar's directory when configured, else the
  // local dev directory. Returns null for an unknown email (anti-enumeration: the
  // route responds the same either way).
  async function resolveCustomerId(addr: string): Promise<string | null> {
    if (config.polarAccessToken) {
      return await findCustomerIdByEmail(polarOpts, addr);
    }
    return devDirectory.get(addr) ?? null;
  }

  // Single-use guard for magic-link jtis: a spent jti maps to its expiry so the
  // set self-prunes. In-process is enough — a link is consumed within ~15 min and
  // a restart only re-allows a link that hasn't expired yet (still bounded).
  const spentJtis = new Map<string, number>();
  const isConsumed = (jti: string) => spentJtis.has(jti);
  function consume(jti: string, exp: number): void {
    const now = Date.now();
    for (const [k, e] of spentJtis) if (e <= now) spentJtis.delete(k);
    spentJtis.set(jti, exp);
  }

  // The dashboard lives on the FQDN; on any other Host these paths belong to a
  // customer's redirect, so fall through to the redirect engine. `fqdnRoute` wraps
  // a handler with that guard (and keeps the Hono return type a clean
  // Promise<Response | void>, never a bare `return next()`).
  const onFqdn = (c: Context) =>
    (c.req.header("host") || "").split(":")[0] === config.fqdn;
  const fqdnRoute =
    (h: (c: Context) => Response | Promise<Response>) =>
    async (c: Context, next: Next): Promise<Response | void> => {
      if (!onFqdn(c)) {
        await next();
        return;
      }
      return await h(c);
    };

  function setSession(c: Context, customerId: string, addr: string): void {
    const token = signToken(
      {
        purpose: "session",
        customerId,
        email: addr,
        exp: Date.now() + SESSION_TTL_MS,
      },
      config.sessionSecret,
    );
    setCookie(c, SESSION_COOKIE, token, {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: "Lax",
      path: "/",
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
    });
  }

  // Read + roll the session: a valid cookie is re-minted on every authed request
  // so an active Customer's 30-day window slides forward. Returns null when absent
  // or invalid (expired/tampered/wrong purpose).
  function rollSession(c: Context): Claims | null {
    const raw = getCookie(c, SESSION_COOKIE);
    if (!raw) return null;
    const res = verifyToken(raw, config.sessionSecret, Date.now());
    if (!res.ok || res.claims.purpose !== "session") return null;
    setSession(c, res.claims.customerId, res.claims.email);
    return res.claims;
  }

  async function buildScopeViews(customerId: string): Promise<ScopeView[]> {
    const now = Date.now();
    const views: ScopeView[] = [];
    for (const { scope, label } of SCOPES) {
      const [cap, domains] = await Promise.all([
        getActivePlanCap(db, customerId, scope, now),
        listCustomerDomainsInScope(db, customerId, scope),
      ]);
      views.push({ scope, label, cap, domains, overCap: domains.length > cap });
    }
    return views;
  }

  // Render the dashboard for the session, optionally with a one-shot notice. Used
  // by GET /portal and by the add/remove handlers (re-render in place, so the
  // result of an action shows immediately). Billing controls arrive in Phase 12.
  async function renderPortal(
    c: Context,
    session: Claims,
    notice?: { kind: "ok" | "err" | "warn"; text: string },
  ): Promise<Response> {
    const scopes = await buildScopeViews(session.customerId);
    return c.html(
      portalPage({
        email: session.email,
        scopes,
        canAddRemove: true,
        canBilling: Boolean(config.polarAccessToken),
        notice,
      }),
    );
  }

  // GET /login — email entry for a magic link.
  app.get("/login", fqdnRoute((c) => c.html(loginPage())));

  // POST /auth/request — email -> (if a known Customer) a magic link. ALWAYS
  // responds the same regardless of whether the email matched, so the page never
  // reveals who is a Customer (anti-enumeration, ADR-0003).
  app.post(
    "/auth/request",
    fqdnRoute(async (c) => {
      const body = await c.req.parseBody();
      const addr = String(body.email ?? "").trim().toLowerCase();
      if (addr) {
        try {
          const customerId = await resolveCustomerId(addr);
          if (customerId) {
            const jti = crypto.randomUUID();
            const token = signToken(
              {
                purpose: "magic",
                customerId,
                email: addr,
                exp: Date.now() + MAGIC_TTL_MS,
                jti,
              },
              config.sessionSecret,
            );
            const link = `${baseUrl}/auth/verify?token=${
              encodeURIComponent(token)
            }`;
            const { html, text } = magicLinkEmail(link);
            await email.send({
              to: addr,
              subject: "Your redirect.center sign-in link",
              html,
              text,
            });
          }
        } catch (e) {
          // Swallow but log: surfacing the error would itself leak enumeration signal.
          console.error(
            `[auth] request for <redacted> failed: ${
              e instanceof Error ? e.message : e
            }`,
          );
        }
      }
      return c.html(loginPage({ sent: true }));
    }),
  );

  // GET /auth/verify?token= — validate a magic link, mark it spent, open a session.
  app.get(
    "/auth/verify",
    fqdnRoute((c) => {
      const token = c.req.query("token") ?? "";
      const res = verifyToken(token, config.sessionSecret, Date.now(), {
        isConsumed,
      });
      if (!res.ok || res.claims.purpose !== "magic" || !res.claims.jti) {
        return c.html(verifyErrorPage(), 400);
      }
      consume(res.claims.jti, res.claims.exp);
      setSession(c, res.claims.customerId, res.claims.email);
      return c.redirect("/portal", 302);
    }),
  );

  // GET /auth/checkout?checkout_id= — post-checkout auto-login. The checkout's
  // success_url carries the id; resolve the Customer and mint a session so the
  // buyer lands in the dashboard with no email round-trip.
  app.get(
    "/auth/checkout",
    fqdnRoute(async (c) => {
      const checkoutId = c.req.query("checkout_id") ?? "";
      if (!checkoutId || !config.polarAccessToken) {
        return c.redirect("/login", 302);
      }
      try {
        const cust = await getCheckoutCustomer(polarOpts, checkoutId);
        if (!cust) {
          return c.redirect("/login", 302);
        }
        setSession(c, cust.customerId, cust.email);
        return c.redirect("/portal", 302);
      } catch (e) {
        console.error(
          `[auth] checkout ${checkoutId} auto-login failed: ${
            e instanceof Error ? e.message : e
          }`,
        );
        return c.redirect("/login", 302);
      }
    }),
  );

  // GET /logout — clear the session cookie.
  app.get(
    "/logout",
    fqdnRoute((c) => {
      deleteCookie(c, SESSION_COOKIE, { path: "/" });
      return c.redirect("/login", 302);
    }),
  );

  // GET /portal — the authenticated "My Domains" dashboard.
  app.get(
    "/portal",
    fqdnRoute((c) => {
      const session = rollSession(c);
      if (!session) return c.redirect("/login", 302);
      return renderPortal(c, session);
    }),
  );

  // POST /domains — add a Domain. Capacity + redundancy are decided by the pure
  // decideAddDomain against the Customer's current Plan/Domains; on success the
  // write refreshes the cache so HTTPS is authorized on the next handshake.
  app.post(
    "/domains",
    fqdnRoute(async (c) => {
      const session = rollSession(c);
      if (!session) return c.redirect("/login", 302);
      const body = await c.req.parseBody();
      const scope: Scope = body.scope === "whole-domain"
        ? "whole-domain"
        : "single";
      const raw = String(body.domain ?? "");
      const now = Date.now();

      const [cap, existingInScope, wholeDomains] = await Promise.all([
        getActivePlanCap(db, session.customerId, scope, now),
        listCustomerDomainsInScope(db, session.customerId, scope),
        listCustomerDomainsInScope(db, session.customerId, "whole-domain"),
      ]);

      const decision = decideAddDomain({
        raw,
        scope,
        cap,
        existingInScope,
        wholeDomains,
      });
      if (!decision.ok) {
        return renderPortal(c, session, {
          kind: "err",
          text: decision.message,
        });
      }

      await upsertDomain(
        db,
        {
          customerId: session.customerId,
          domain: decision.domain,
          scope,
          status: "active",
          createdAt: now,
        },
        now,
      );
      await cache.refresh();
      return renderPortal(c, session, {
        kind: "ok",
        text: `Added ${decision.domain}.`,
      });
    }),
  );

  // Remove a Domain: deactivate it, tear down its cert (#5 — what actually stops
  // HTTPS), then refresh the cache so it's denied immediately. Shared by the HTML
  // form (POST /domains/:domain/delete) and the REST contract (DELETE /domains/:domain).
  async function handleRemove(c: Context): Promise<Response> {
    const session = rollSession(c);
    if (!session) return c.redirect("/login", 302);
    const domain = normalizeDomain(
      decodeURIComponent(c.req.param("domain") ?? ""),
    );
    if (!domain) {
      return renderPortal(c, session, { kind: "err", text: "Unknown domain." });
    }

    const removed = await removeDomain(
      db,
      session.customerId,
      domain,
      Date.now(),
    );
    if (!removed) {
      return renderPortal(c, session, {
        kind: "err",
        text: `${domain} is not on your list.`,
      });
    }
    if (certStore) {
      try {
        await deleteCertsForSubscription(
          certStore,
          config.s3Prefix,
          domain,
          removed.scope,
        );
      } catch (e) {
        // The Domain is already inactive (authorization stops regardless); a stale
        // cert object is harmless until renewal. Log loud, don't fail the request.
        console.error(
          `[dashboard] cert teardown for ${domain} failed: ${
            e instanceof Error ? e.message : e
          }`,
        );
      }
    }
    await cache.refresh();
    return renderPortal(c, session, { kind: "ok", text: `Removed ${domain}.` });
  }

  app.post("/domains/:domain/delete", fqdnRoute(handleRemove));
  app.delete("/domains/:domain", fqdnRoute(handleRemove));

  // POST /billing/portal — deep-link into Polar's hosted portal (Tier change,
  // card, invoices, cancel). Mints a short-lived Polar customer session server-
  // side and redirects there, so no billing UI is built (Phase 12, ADR-0001/0003).
  app.post(
    "/billing/portal",
    fqdnRoute(async (c) => {
      const session = rollSession(c);
      if (!session) return c.redirect("/login", 302);
      if (!config.polarAccessToken) {
        return renderPortal(c, session, {
          kind: "err",
          text: "The billing portal isn't available right now.",
        });
      }
      try {
        const url = await createCustomerSession(polarOpts, session.customerId);
        return c.redirect(url, 302);
      } catch (e) {
        console.error(
          `[billing] portal session for ${session.customerId} failed: ${
            e instanceof Error ? e.message : e
          }`,
        );
        return renderPortal(c, session, {
          kind: "err",
          text: "Couldn't open the billing portal. Please try again.",
        });
      }
    }),
  );
}
