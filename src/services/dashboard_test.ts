import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { Hono } from "hono";
import { mountDashboard } from "./dashboard.ts";
import { signToken } from "./signed-token.ts";
import { loadConfig } from "../config.ts";
import type { Sql } from "./db.ts";
import type { AuthzCache } from "./authz-cache.ts";

// Dashboard on the `localhost` FQDN, a known session secret, a LOCAL magic-link
// directory (no Polar), and no email provider (so createEmailSender returns the
// console sender — no network). COOKIE_SECURE=false mirrors the http sandbox.
Deno.env.set("FQDN", "localhost");
Deno.env.set("SESSION_SECRET", "test-secret");
Deno.env.set("DEV_AUTH_CUSTOMERS", "demo@redirect.center:demo");
Deno.env.set("COOKIE_SECURE", "false");
Deno.env.set("POLAR_ACCESS_TOKEN", "");
Deno.env.set("SMTP_HOST", "");
Deno.env.set("RESEND_API_KEY", "");
Deno.env.set("EMAIL_FROM", "");
const config = loadConfig();

// The auth/session routes under test never reach the DB or the authz cache (only
// add/remove do), so these stand in as never-called stubs.
const db = {} as unknown as Sql;
const cache = {
  refresh: () => Promise.resolve(),
  authorize: () => false,
  counts: { plans: 0, domains: 0 },
} as unknown as AuthzCache;

// One app for the whole file: the single-use guard (spent jtis) lives in the
// mountDashboard closure, so the replay test needs the same instance. Tests use
// distinct jtis to stay independent.
const app = new Hono();
mountDashboard({ app, db, config, cache });

// app.request() builds a Request from a URL, which carries NO Host header — but
// every route is gated on `host === fqdn`, so we must set Host explicitly.
function req(
  url: string,
  host = "localhost",
  init: RequestInit = {},
): Response | Promise<Response> {
  return app.request(url, {
    ...init,
    headers: { host, ...(init.headers as Record<string, string> | undefined) },
  });
}

const futureExp = () => Date.now() + 10 * 60 * 1000;
function magicToken(jti: string, email = "demo@redirect.center"): string {
  return signToken(
    { purpose: "magic", customerId: "demo", email, exp: futureExp(), jti },
    config.sessionSecret,
  );
}
const verifyUrl = (token: string) =>
  "http://localhost/auth/verify?token=" + encodeURIComponent(token);

// WHY: the entry point — the sign-in page must render for a GET on the FQDN.
Deno.test("GET /login renders the sign-in page on the FQDN", async () => {
  const res = await req("http://localhost/login");
  assertEquals(res.status, 200);
  assertStringIncludes(await res.text(), "Sign in");
});

// WHY: every dashboard path is FQDN-only — on a customer's redirect host these
// paths belong to their site, so they must fall through (404 here), never serve
// the dashboard.
Deno.test("dashboard routes are scoped to the FQDN host (404 elsewhere)", async () => {
  const res = await req(
    "http://tenant.example.com/login",
    "tenant.example.com",
  );
  assertEquals(res.status, 404);
  await res.text();
});

// WHY: anti-enumeration (ADR-0003) — the response for a known vs unknown email
// must be byte-identical, or the page leaks who is a paying customer.
Deno.test("POST /auth/request is anti-enumerating", async () => {
  const post = (email: string) =>
    req("http://localhost/auth/request", "localhost", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ email }),
    });
  const known = await post("demo@redirect.center");
  const unknown = await post("stranger@nowhere.test");
  assertEquals(known.status, 200);
  assertEquals(unknown.status, 200);
  const a = await known.text();
  const b = await unknown.text();
  assertStringIncludes(a, "Check your inbox");
  assertEquals(a, b);
});

// WHY: a valid magic link is the whole login — it must open a session cookie and
// land the user in the dashboard.
Deno.test("GET /auth/verify opens a session and redirects to /portal", async () => {
  const res = await req(verifyUrl(magicToken("jti-ok")));
  assertEquals(res.status, 302);
  assertEquals(res.headers.get("location"), "/portal");
  assertStringIncludes(res.headers.get("set-cookie") ?? "", "rc_session=");
  await res.text();
});

// WHY: magic links are single-use; replaying a consumed link must fail, or a
// leaked email/link could be reused.
Deno.test("a magic link is single-use (replay rejected)", async () => {
  const token = magicToken("jti-replay");
  const first = await req(verifyUrl(token));
  assertEquals(first.status, 302);
  await first.text();
  const second = await req(verifyUrl(token));
  assertEquals(second.status, 400);
  await second.text();
});

// WHY: a tampered or garbage token must be rejected cleanly (400), never crash or
// authenticate.
Deno.test("GET /auth/verify rejects a garbage token", async () => {
  const res = await req(verifyUrl("not.a.valid.token"));
  assertEquals(res.status, 400);
  assertStringIncludes(await res.text(), "didn't work");
});

// WHY: purpose separation — a long-lived session token must NOT be accepted as a
// magic link (otherwise a leaked cookie value becomes a fresh login).
Deno.test("GET /auth/verify rejects a session-purpose token", async () => {
  const sessionTok = signToken(
    {
      purpose: "session",
      customerId: "demo",
      email: "demo@redirect.center",
      exp: futureExp(),
    },
    config.sessionSecret,
  );
  const res = await req(verifyUrl(sessionTok));
  assertEquals(res.status, 400);
  await res.text();
});

// WHY: the dashboard is gated — an unauthenticated visit to /portal must bounce to
// /login, never render account data.
Deno.test("GET /portal without a session redirects to /login", async () => {
  const res = await req("http://localhost/portal");
  assertEquals(res.status, 302);
  assertEquals(res.headers.get("location"), "/login");
  await res.text();
});

// WHY: sign-out must actually clear the session cookie and return to /login.
Deno.test("GET /logout clears the cookie and returns to /login", async () => {
  const res = await req("http://localhost/logout");
  assertEquals(res.status, 302);
  assertEquals(res.headers.get("location"), "/login");
  assert((res.headers.get("set-cookie") ?? "").includes("rc_session="));
  await res.text();
});
