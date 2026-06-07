import { assertEquals, assertFalse, assertStringIncludes } from "@std/assert";
import {
  esc,
  loginPage,
  magicLinkEmail,
  portalPage,
  privacyPage,
  refundsPage,
  type ScopeView,
  termsPage,
  verifyErrorPage,
} from "./dashboard-views.ts";

// ---------------------------------------------------------------------------
// esc — the single XSS chokepoint. Domains and emails reach these pages from
// user input and from Polar; every interpolation goes through esc.
// ---------------------------------------------------------------------------

// WHY: an unescaped value is stored XSS — a domain or email containing markup
// would execute in the dashboard. All five HTML-significant chars must encode.
Deno.test("esc encodes every HTML-significant character", () => {
  assertEquals(
    esc(`<script>alert("x")&'`),
    "&lt;script&gt;alert(&quot;x&quot;)&amp;&#39;",
  );
});

// WHY: a normal hostname must pass through byte-for-byte, or the displayed/stored
// value would drift from what the authorizer compares against.
Deno.test("esc leaves an ordinary hostname untouched", () => {
  assertEquals(esc("www.example.com"), "www.example.com");
});

// ---------------------------------------------------------------------------
// loginPage
// ---------------------------------------------------------------------------

// WHY: the default page is useless unless it posts an email field to the auth
// route. Also locks the page-level contract (noindex, lang).
Deno.test("loginPage (default) renders the email form", () => {
  const html = loginPage();
  assertStringIncludes(html, "<!doctype html>");
  assertStringIncludes(html, 'lang="en"');
  assertStringIncludes(html, 'content="noindex"');
  assertStringIncludes(html, 'action="/auth/request"');
  assertStringIncludes(html, 'type="email"');
  assertStringIncludes(html, "Email me a sign-in link");
  assertFalse(html.includes("Check your inbox"));
});

// WHY: anti-enumeration (ADR-0003) — after a request the page must confirm
// "sent" WITHOUT revealing whether the email is a real Customer, and must still
// let the user resend.
Deno.test("loginPage (sent) confirms without revealing the account, and allows resend", () => {
  const html = loginPage({ sent: true });
  assertStringIncludes(html, "Check your inbox");
  assertStringIncludes(html, "If that email belongs to a customer");
  assertStringIncludes(html, "Send another link");
  assertStringIncludes(html, 'action="/auth/request"');
});

// WHY: the error string is rendered verbatim, so it must be escaped — otherwise a
// future caller could smuggle markup through it.
Deno.test("loginPage escapes the error message", () => {
  const html = loginPage({ error: "<b>boom</b>" });
  assertStringIncludes(html, "&lt;b&gt;boom&lt;/b&gt;");
  assertFalse(html.includes("<b>boom</b>"));
});

// WHY: a deliberate product decision — the access pages are light-only to match
// the marketing site. A regression to an auto dark-mode block would break that.
Deno.test("loginPage is light-only (no dark-mode media query)", () => {
  const html = loginPage();
  assertStringIncludes(html, "color-scheme: light;");
  assertFalse(html.includes("prefers-color-scheme"));
});

// ---------------------------------------------------------------------------
// verifyErrorPage
// ---------------------------------------------------------------------------

// WHY: a dead magic link must explain itself and route the user back to request
// a fresh one, or they're stranded.
Deno.test("verifyErrorPage explains and links back to /login", () => {
  const html = verifyErrorPage();
  assertStringIncludes(html, "That link didn't work");
  assertStringIncludes(html, 'href="/login"');
});

// ---------------------------------------------------------------------------
// portalPage
// ---------------------------------------------------------------------------

function scope(o: Partial<ScopeView> = {}): ScopeView {
  return {
    scope: "single",
    label: "Single hosts",
    cap: 5,
    domains: [],
    overCap: false,
    ...o,
  };
}

// WHY: the dashboard must identify the signed-in account and always offer sign-out.
Deno.test("portalPage shows the account and a sign-out link", () => {
  const html = portalPage({ email: "demo@redirect.center", scopes: [scope()] });
  assertStringIncludes(html, "demo@redirect.center");
  assertStringIncludes(html, 'href="/logout"');
  assertStringIncludes(html, "My Domains");
});

// WHY: each owned domain needs a working remove control whose target carries the
// URL-encoded host and its scope, so the right Plan is touched. The badge must
// show used/cap so the customer knows their headroom.
Deno.test("portalPage lists domains with a scoped remove form and a used/cap badge", () => {
  const html = portalPage({
    email: "a@b.com",
    scopes: [scope({ domains: ["app.acme.com"] })],
  });
  assertStringIncludes(html, "app.acme.com");
  assertStringIncludes(html, 'action="/domains/app.acme.com/delete"');
  assertStringIncludes(html, 'name="scope" value="single"');
  assertStringIncludes(html, "Remove");
  assertStringIncludes(html, "1 / 5");
});

// WHY: a Plan with spare capacity must expose the add form, or the customer can't
// use what they paid for.
Deno.test("portalPage shows the add form when under cap", () => {
  const html = portalPage({
    email: "a@b.com",
    scopes: [scope({ cap: 5, domains: [] })],
  });
  assertStringIncludes(html, 'action="/domains"');
  assertStringIncludes(html, 'name="domain"');
  assertStringIncludes(html, "Add domain");
});

// WHY: with no Plan there is nothing to add into, so the add form must be absent
// and the page must steer to purchase instead.
Deno.test("portalPage with no plan steers to purchase and hides the add form", () => {
  const html = portalPage({
    email: "a@b.com",
    scopes: [scope({ cap: 0, domains: [] })],
  });
  assertStringIncludes(html, "No active plan");
  assertFalse(html.includes('action="/domains"'));
});

// WHY: regression guard for the bug just fixed — a full cap of 1 must read
// "1 domain" (singular) and offer an upgrade, not "1 domains".
Deno.test("portalPage at a full cap of 1 is singular and offers an upgrade", () => {
  const html = portalPage({
    email: "a@b.com",
    scopes: [scope({ cap: 1, domains: ["only.com"] })],
  });
  assertStringIncludes(html, "all 1 domain in this plan");
  assertFalse(html.includes("all 1 domains"));
  assertStringIncludes(html, "Upgrade to add more");
});

// WHY: over-cap (after a downgrade) must tell the customer exactly how many to
// remove (used - cap) and must not offer the add form while they're over.
Deno.test("portalPage over-cap states how many to remove and hides the add form", () => {
  const html = portalPage({
    email: "a@b.com",
    scopes: [
      scope({ cap: 2, domains: ["a.com", "b.com", "c.com"], overCap: true }),
    ],
  });
  assertStringIncludes(html, "Remove 1"); // 3 used - 2 cap
  assertFalse(html.includes("Add domain"));
});

// WHY: read-only mode must hide every mutating control even when domains exist,
// so a half-shipped feature can't be driven from the UI.
Deno.test("portalPage read-only hides add and remove controls", () => {
  const html = portalPage({
    email: "a@b.com",
    canAddRemove: false,
    scopes: [scope({ domains: ["x.com"] })],
  });
  assertStringIncludes(html, "x.com"); // still listed
  assertFalse(html.includes("/delete"));
  assertFalse(html.includes("Add domain"));
});

// WHY: billing controls may only appear once billing exists; otherwise the upgrade
// CTA must degrade to the marketing funnel rather than a dead /billing route.
Deno.test("portalPage gates billing behind canBilling", () => {
  const withBilling = portalPage({
    email: "a@b.com",
    canBilling: true,
    scopes: [scope({ cap: 1, domains: ["only.com"] })],
  });
  assertStringIncludes(withBilling, 'action="/billing/portal"');

  const noBilling = portalPage({
    email: "a@b.com",
    canBilling: false,
    scopes: [scope({ cap: 1, domains: ["only.com"] })],
  });
  assertFalse(noBilling.includes('action="/billing/portal"'));
  assertStringIncludes(noBilling, "/?scope=upgrade");
});

// WHY: the account email is attacker-influenced (whatever was used at Polar) and
// is printed in the page chrome, so it must be escaped.
Deno.test("portalPage escapes the account email", () => {
  const html = portalPage({ email: "x<b>@h.com", scopes: [scope()] });
  assertStringIncludes(html, "x&lt;b&gt;@h.com");
  assertFalse(html.includes("x<b>@h.com"));
});

// ---------------------------------------------------------------------------
// magicLinkEmail
// ---------------------------------------------------------------------------

// WHY: the email is worthless without the link, and must carry a plain-text
// fallback plus the single-use / 15-minute expectation so the user isn't
// surprised when it stops working.
Deno.test("magicLinkEmail carries the link in both parts plus the expiry", () => {
  const { html, text } = magicLinkEmail("https://r.c/auth/verify?token=abc");
  assertStringIncludes(html, "https://r.c/auth/verify?token=abc");
  assertStringIncludes(html, "15 minutes");
  assertStringIncludes(text, "https://r.c/auth/verify?token=abc");
  assertStringIncludes(text, "15 minutes");
});

// WHY: the link is dropped into an href attribute; an unescaped & corrupts the URL
// and an unescaped quote breaks out of the attribute entirely.
Deno.test("magicLinkEmail escapes the href", () => {
  const { html } = magicLinkEmail('https://r.c/v?a=1&b="x"');
  assertStringIncludes(html, "a=1&amp;b=&quot;x&quot;");
  assertFalse(html.includes('b="x"'));
});

// ---------------------------------------------------------------------------
// Legal pages (Terms / Privacy / Refunds)
// ---------------------------------------------------------------------------

// WHY: legal docs are the one part of the access UI that MUST be crawlable —
// they're public and linked from checkout; a stray noindex would hide them.
Deno.test("legal pages are indexable (not noindex)", () => {
  for (const html of [termsPage(), privacyPage(), refundsPage()]) {
    assertStringIncludes(html, 'content="index, follow"');
    assertFalse(html.includes('content="noindex"'));
  }
});

// WHY: each legal page must be self-identifying, dated, reachable for contact, and
// link to the OTHER two (its own entry renders as bold text, not a link) plus Home.
Deno.test("each legal page has its title, a date, contact, and cross-links", () => {
  const pages: Array<[string, string, string[]]> = [
    [termsPage(), "Terms of Service", ['href="/privacy"', 'href="/refunds"']],
    [privacyPage(), "Privacy Policy", ['href="/terms"', 'href="/refunds"']],
    [refundsPage(), "Refunds &amp; Withdrawal", [
      'href="/terms"',
      'href="/privacy"',
    ]],
  ];
  for (const [html, title, otherLinks] of pages) {
    assertStringIncludes(html, title);
    assertStringIncludes(html, "Last updated:");
    assertStringIncludes(html, "mailto:udlei@nati.biz");
    assertStringIncludes(html, 'href="/"'); // Home
    for (const link of otherLinks) assertStringIncludes(html, link);
  }
});

// WHY: the substance that makes each page legally meaningful must actually be
// present — GDPR rights + the supervisory authority, the 14-day withdrawal rule,
// and Polar as Merchant of Record.
Deno.test("legal pages carry their key substantive clauses", () => {
  const privacy = privacyPage();
  assertStringIncludes(privacy, "GDPR");
  assertStringIncludes(privacy, "CNPD");
  assertStringIncludes(privacy, "rc_session");

  const refunds = refundsPage();
  assertStringIncludes(refunds, "14 days");
  assertStringIncludes(refunds, "withdraw");

  const terms = termsPage();
  assertStringIncludes(terms, "Merchant of Record");
  assertStringIncludes(terms, "Portugal");
});
