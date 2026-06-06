import { Hono } from "hono";
import vento from "ventojs";
import { config } from "./config.ts";
import { errorHandler } from "./middleware/error-handler.ts";
import { guardian } from "./services/guardian.ts";
import { HttpError, resolveDnsAndRedirect } from "./services/redirect.ts";
import { dnsCacheSize, dnsInflightSize } from "./helpers/dns.ts";
import { createDb } from "./services/db.ts";
import {
  getPlan,
  listCustomerDomainsInScope,
  markPlanInactive,
  migrate,
  seedPlans,
  upsertPlan,
} from "./services/paid-store.ts";
import { AuthzCache } from "./services/authz-cache.ts";
import { verifyPolarSignature } from "./services/polar-signature.ts";
import { buildTierLadders, mapPlanEvent } from "./services/polar-webhook.ts";
import {
  type CertStore,
  deleteCertsForSubscription,
} from "./services/cert-teardown.ts";
import { IssuanceRateLimiter } from "./services/issuance-rate-limit.ts";
import { decideTlsCheck } from "./services/tls-check.ts";
import { mountDashboard } from "./services/dashboard.ts";

const app = new Hono();

// Pre-render homepage at startup (raw + gzip) to avoid per-request
// template execution and CompressionStream allocations.
const homepage = await (async () => {
  const env = vento({
    includes: new URL("../views", import.meta.url).pathname,
    autoescape: false,
  });
  const template = await env.load("index.vto");
  const result = await template({ app: config });
  const html = result.content;

  const htmlBytes = new TextEncoder().encode(html);
  const gzipStream = new CompressionStream("gzip");
  const compressed = await new Response(
    new Blob([htmlBytes]).stream().pipeThrough(gzipStream),
  ).arrayBuffer();

  return { html, gzip: new Uint8Array(compressed) };
})();

app.onError(errorHandler);

// Access log middleware
app.use("/", async (c, next) => {
  // remoteAddr = real TCP connection IP (can't be spoofed).
  // x-forwarded-for/x-real-ip are only trustworthy behind a reverse proxy, so
  // they take precedence only when TRUST_PROXY is set (e.g. behind Caddy).
  const remoteIp =
    ((c.env as Record<string, unknown>)?.remoteAddr as Deno.NetAddr | undefined)
      ?.hostname;
  const forwardedIp = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip");
  const ip = (config.trustProxy
    ? (forwardedIp || remoteIp)
    : (remoteIp || forwardedIp)) || "-";
  const host = c.req.header("host") || "-";
  const method = c.req.method;
  const url = new URL(c.req.url);
  const path = url.pathname + url.search;
  const ua = c.req.header("user-agent") || "-";

  // Log BEFORE processing
  console.log(
    `[req] ${ip} "${method} ${path}" host=${host} ua="${ua}"`,
  );

  const start = Date.now();
  await next();
  const ms = Date.now() - start;

  // Log AFTER processing
  const status = c.res.status;
  const location = c.res.headers.get("location") || "-";

  console.log(
    `[res] ${ip} "${method} ${path}" host=${host} ${status} location=${location} ${ms}ms`,
  );
});

// v2 authorization cache (ADR-0002): the redirect paywall and /tls-check both gate
// HTTPS on this in-process snapshot of Plans + Domains (no DB round-trip on the
// handshake hot path). Hoisted to module scope so the redirect path can reach it.
let authz: AuthzCache | undefined;

// Caddy on-demand TLS authorization (`ask`): 200 authorizes a certificate,
// anything else denies it. Only mounted when the paid HTTPS tier is enabled —
// with the flag off this route does not exist and no TLS/datastore code runs.
if (config.httpsTierEnabled) {
  // v2 durable store (ADR-0002): Postgres holds Plans + Domains; the in-process
  // AuthzCache answers /tls-check and the paywall off the handshake hot path.
  // migrate is idempotent.
  const db = createDb(config.databaseUrl);
  await migrate(db);
  const cache = new AuthzCache(db);
  if (config.seedPlansSpec) {
    const { plans, domains } = await seedPlans(
      db,
      config.seedPlansSpec,
      Date.now(),
    );
    console.log(`[tls-check] seeded ${plans} plan(s), ${domains} domain(s)`);
  }
  await cache.refresh();
  authz = cache;
  console.log(
    `[tls-check] authz cache loaded: ${cache.counts.plans} plan(s), ${cache.counts.domains} domain(s)`,
  );

  // On-demand issuance rate limit (Phase 7). Caddy removed its built-in
  // on_demand rate limit in 2.9, so the ask endpoint enforces it: even an
  // authorized domain is throttled when new-issuance velocity spikes, so a
  // handshake flood can't drive mass ACME issuance.
  const issuanceLimiter = new IssuanceRateLimiter(
    config.tlsIssuanceRateLimit,
    config.tlsIssuanceRateWindowMs,
    10_000, // dedup: collapse one issuance's repeated ask calls into one event
  );

  app.get("/tls-check", (c) => {
    const domain = (c.req.query("domain") || "").trim();
    const now = Date.now();
    // A 429 makes Caddy skip issuance this handshake; the next one retries and
    // succeeds once the window drains, so legitimate domains aren't locked out.
    const status = decideTlsCheck(
      domain,
      (h, n) => cache.authorize(h, n),
      issuanceLimiter,
      now,
    );
    if (status === 429) {
      console.warn(`[tls-check] issuance rate limit hit for ${domain}`);
    }
    const bodies = {
      400: "Bad Request",
      403: "Forbidden",
      429: "Rate limited",
      200: "OK",
    } as const;
    return c.text(bodies[status], status);
  });

  // Polar product id -> Tier {scope, cap}. The v1 single / whole-domain products
  // are the cap-1 Tier of each Scope; larger bundles come from POLAR_PRODUCT_TIERS.
  // An event for a product not in this map is a noop (the cap is never guessed).
  const productTiers = buildTierLadders(
    config.polarProductSingleId,
    config.polarProductWholeDomainId,
    config.polarProductTiers,
  );

  // S3 cert store for revoke teardown (Phase 4). Dynamically imported so the new
  // remote S3 dependency never loads on the free HTTP path (flag off). Built only
  // when S3 is configured; absent it, a revoke still marks the row inactive.
  let certStore: CertStore | undefined;
  if (config.s3Host && config.s3Bucket) {
    const { S3Client } = await import("s3-lite-client");
    certStore = new S3Client({
      endPoint: `${config.s3Insecure ? "http" : "https"}://${config.s3Host}`,
      region: config.s3Region, // ignored by RustFS; must match the bucket on AWS
      bucket: config.s3Bucket,
      accessKey: config.s3AccessId,
      secretKey: config.s3SecretKey,
      pathStyle: true, // RustFS + most S3 setups; endpoint/bucket/key form
    });
  }

  // Provider webhook: Polar is the source of truth for Plans; this keeps the
  // in-process cache in sync so /tls-check answers instantly during a TLS
  // handshake. Signature is verified against the raw body (#3a) before the pure
  // state machine (#3b) maps the event to a Plan action we apply to Postgres. The
  // cache is refreshed after every write so a Tier change takes effect in seconds.
  app.post("/webhooks/polar", async (c) => {
    const rawBody = await c.req.text();
    const signed = verifyPolarSignature(
      rawBody,
      {
        id: c.req.header("webhook-id"),
        timestamp: c.req.header("webhook-timestamp"),
        signature: c.req.header("webhook-signature"),
      },
      config.polarWebhookSecret,
      Date.now(),
    );
    if (!signed) return c.text("Invalid signature", 401);

    let event: Parameters<typeof mapPlanEvent>[0];
    try {
      event = JSON.parse(rawBody);
    } catch {
      return c.text("Bad Request", 400);
    }

    const action = mapPlanEvent(event, { productTiers });
    const now = Date.now();
    switch (action.type) {
      case "upsert": {
        const p = action.plan;
        await upsertPlan(db, { ...p, status: "active" }, now);
        await cache.refresh();
        console.log(
          `[webhook] upsert plan customer=${p.customerId} scope=${p.scope} cap=${p.cap} until=${
            new Date(p.currentPeriodEnd).toISOString()
          }`,
        );
        break;
      }
      case "revoke": {
        // Read the Plan before flipping it so we know whose Domains (in which
        // Scope) own the certs to remove. Marking the Plan inactive denies future
        // `ask`; deleting the certs is what actually stops HTTPS (the proxy won't
        // re-consult `ask` on renewal). Domain rows are kept — a re-subscribe
        // reactivates them within the new cap.
        const plan = await getPlan(db, action.polarSubscriptionId);
        const matched = await markPlanInactive(
          db,
          action.polarSubscriptionId,
          now,
        );
        if (plan) {
          const domains = await listCustomerDomainsInScope(
            db,
            plan.customerId,
            plan.scope,
          );
          if (certStore) {
            try {
              let deleted = 0;
              for (const domain of domains) {
                deleted += (await deleteCertsForSubscription(
                  certStore,
                  config.s3Prefix,
                  domain,
                  plan.scope,
                )).length;
              }
              console.log(
                `[webhook] revoke plan customer=${plan.customerId} scope=${plan.scope}: inactive, ` +
                  `tore down ${domains.length} domain(s), deleted ${deleted} cert object(s)`,
              );
            } catch (e) {
              // Fail loud and let Polar retry: mark-inactive and the deletes are all
              // idempotent, so a retry safely finishes the teardown.
              console.error(
                `[webhook] revoke ${action.polarSubscriptionId}: cert teardown FAILED, requesting retry: ${
                  e instanceof Error ? e.message : e
                }`,
              );
              return c.text("Cert teardown failed", 500);
            }
          } else {
            console.log(
              `[webhook] revoke plan customer=${plan.customerId} scope=${plan.scope}: ` +
                `marked inactive (no S3 configured; ${domains.length} domain cert(s) not deleted)`,
            );
          }
          await cache.refresh();
        } else {
          console.log(
            `[webhook] revoke ${action.polarSubscriptionId}: no local Plan, nothing to tear down`,
          );
          if (matched) await cache.refresh();
        }
        break;
      }
      case "noop":
        console.log(`[webhook] noop: ${action.reason}`);
        break;
    }
    return c.text("OK", 200);
  });

  // Dashboard + passwordless auth (Phase 10, ADR-0003). Mounted only when a
  // SESSION_SECRET is configured; without it the paid tier still runs (issuance +
  // webhooks) but exposes no auth/dashboard surface.
  if (config.sessionSecret) {
    mountDashboard({ app, db, config });
    console.log("[dashboard] passwordless auth + /portal mounted");
  } else {
    console.log(
      "[dashboard] SESSION_SECRET unset — auth/dashboard routes not mounted",
    );
  }
}

// Homepage - only for the FQDN host (served from pre-rendered cache)
app.get("/", async (c, next) => {
  const host = (c.req.header("host") || "").split(":")[0];

  if (host === config.fqdn) {
    const ua = c.req.header("user-agent");
    if (!ua) return c.json({ statusCode: 403, message: "Forbidden" }, 403);

    const acceptsGzip = c.req.header("accept-encoding")?.includes("gzip") ??
      false;
    const headers: Record<string, string> = {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    };
    if (acceptsGzip) headers["Content-Encoding"] = "gzip";

    return new Response(acceptsGzip ? homepage.gzip : homepage.html, {
      headers,
    });
  }

  // If not FQDN, skip to redirect
  await next();
});

// Diagnostic endpoint — only accessible on the FQDN
app.get("/healthz", (c) => {
  const host = (c.req.header("host") || "").split(":")[0];
  if (host !== config.fqdn) return c.notFound();

  const mem = Deno.memoryUsage();
  return c.json({
    uptime: Math.floor(performance.now() / 1000),
    memory: {
      rss: `${(mem.rss / 1024 / 1024).toFixed(1)}MB`,
      heapUsed: `${(mem.heapUsed / 1024 / 1024).toFixed(1)}MB`,
      heapTotal: `${(mem.heapTotal / 1024 / 1024).toFixed(1)}MB`,
      external: `${(mem.external / 1024 / 1024).toFixed(1)}MB`,
    },
    dnsCache: dnsCacheSize(),
    dnsInflight: dnsInflightSize(),
  });
});

// robots.txt for redirect domains — tells crawlers not to follow/index redirects
app.get("/robots.txt", (c) => {
  const host = (c.req.header("host") || "").split(":")[0];
  if (host === config.fqdn) return c.notFound();
  c.header("Cache-Control", "public, max-age=86400");
  return c.text("User-agent: *\nDisallow: /\n");
});

// FQDN-only routes: return 404 for non-redirect paths on the service domain
app.all("/*", async (c, next) => {
  const host = (c.req.header("host") || "").split(":")[0];
  if (host === config.fqdn) {
    return c.json({ statusCode: 404, message: "Not Found" }, 404);
  }
  await next();
});

// All other routes - redirect logic
app.all("/*", handleRedirect);

async function handleRedirect(c: import("hono").Context): Promise<Response> {
  let host = c.req.header("host") || "";
  if (!host) throw new HttpError(400, "Bad Request");
  host = host.includes(":") ? host.split(":")[0] : host;

  // Block requests without User-Agent (bots that follow redirects infinitely)
  if (!c.req.header("user-agent")) {
    throw new HttpError(403, "Forbidden");
  }

  // Source guardian check
  if (guardian.isDenied(host)) {
    throw new HttpError(403, "Forbidden");
  }

  // Paid HTTPS paywall (Phase 5). HTTP redirects stay free for every domain; only
  // HTTPS is gated. An HTTPS request for a domain that hasn't paid returns 402,
  // which Caddy turns into the static fallback/win-back page (the proxy intercepts
  // 402 via handle_response). A revoked domain lands here too once its cert is gone.
  // Flag off => authz is undefined and this never runs (byte-for-byte legacy).
  if (authz && c.req.header("x-forwarded-proto") === "https") {
    if (!authz.authorize(host, Date.now())) {
      throw new HttpError(402, "HTTPS is not enabled for this domain");
    }
  }

  // Resolve redirect
  const redirect = await resolveDnsAndRedirect(
    host,
    c.req.url.replace(/^https?:\/\/[^/]+/, ""),
  );

  // Destination guardian check
  if (guardian.isDenied(redirect.fqdn)) {
    throw new HttpError(403, "Forbidden");
  }

  // Self-redirect loop detection: destination points back to the same host
  if (redirect.fqdn === host) {
    throw new HttpError(508, `Loop detected: ${host} redirects to itself`);
  }

  // Encode non-ASCII characters to avoid ByteString errors in Response headers
  let safeLocation: string;
  try {
    safeLocation = new URL(redirect.url).href;
  } catch {
    safeLocation = encodeURI(redirect.url);
  }

  // Use " " instead of null to work around Deno.serve memory leak
  // See: https://github.com/denoland/deno/issues/27545
  return new Response(" ", {
    status: redirect.status,
    headers: {
      "Location": safeLocation,
      "Cache-Control": "public, max-age=15",
    },
  });
}

// Periodic health log — helps correlate CPU spikes in CloudWatch with memory/cache state
// Memory watchdog — graceful restart when RSS exceeds limit (Deno native memory leak workaround)
// See: https://github.com/denoland/deno/issues/28307
const RSS_LIMIT = Number(Deno.env.get("RSS_LIMIT_MB") || "384") * 1024 * 1024;

setInterval(() => {
  const mem = Deno.memoryUsage();
  console.log(
    `[health] rss=${(mem.rss / 1024 / 1024).toFixed(1)}MB heap=${
      (mem.heapUsed / 1024 / 1024).toFixed(1)
    }/${(mem.heapTotal / 1024 / 1024).toFixed(1)}MB external=${
      (mem.external / 1024 / 1024).toFixed(1)
    }MB dnsCache=${dnsCacheSize()} dnsInflight=${dnsInflightSize()}`,
  );

  if (mem.rss > RSS_LIMIT) {
    console.warn(
      `[watchdog] RSS ${(mem.rss / 1024 / 1024).toFixed(0)}MB exceeded limit ${
        (RSS_LIMIT / 1024 / 1024).toFixed(0)
      }MB, restarting...`,
    );
    Deno.exit(0);
  }
}, 60_000);

// Start server
Deno.serve(
  {
    port: config.listenPort,
    hostname: config.listenIp,
    onListen({ hostname, port }) {
      console.log(`[server] Server is listening on ${hostname}:${port}`);
    },
    onError(error) {
      console.error(`[server] ${error}`);
      return new Response("Internal Server Error", { status: 500 });
    },
  },
  app.fetch,
);
