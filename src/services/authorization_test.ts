import {
  assert,
  assertEquals,
  assertFalse,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  isAuthorized,
  isRegistrableDomain,
  normalizeDomain,
  type Subscription,
} from "./authorization.ts";

const NOW = 1_700_000_000_000; // fixed "now" so period checks are deterministic
const FUTURE = NOW + 86_400_000;
const PAST = NOW - 86_400_000;

function sub(partial: Partial<Subscription> & Pick<Subscription, "domain" | "scope">): Subscription {
  return {
    polarSubscriptionId: `sub-${partial.domain}-${partial.scope}`,
    status: "active",
    currentPeriodEnd: FUTURE,
    createdAt: NOW,
    updatedAt: NOW,
    ...partial,
  };
}

// WHY: a `single` apex purchase must protect exactly the apex and its www host —
// the two forms a visitor types — and nothing else, or it would leak free certs
// to sibling hosts the customer never paid for.
Deno.test("single apex authorizes apex and www, denies siblings", () => {
  const subs = [sub({ domain: "example.com", scope: "single" })];
  assert(isAuthorized("example.com", subs, NOW));
  assert(isAuthorized("www.example.com", subs, NOW));
  assertFalse(isAuthorized("blog.example.com", subs, NOW));
  assertFalse(isAuthorized("other.com", subs, NOW));
});

// WHY: a `single` purchase for a non-apex host (a subdomain) covers only that
// exact host — there is no apex, so the www convenience does not apply.
Deno.test("single non-apex authorizes only the exact host", () => {
  const subs = [sub({ domain: "blog.example.com", scope: "single" })];
  assert(isAuthorized("blog.example.com", subs, NOW));
  assertFalse(isAuthorized("www.blog.example.com", subs, NOW));
  assertFalse(isAuthorized("example.com", subs, NOW));
});

// WHY: `whole-domain` is the premium tier — it must cover the apex and any
// subdomain at any depth, which is the whole point a customer pays more for.
Deno.test("whole-domain authorizes apex and arbitrary-depth subdomains", () => {
  const subs = [sub({ domain: "example.com", scope: "whole-domain" })];
  assert(isAuthorized("example.com", subs, NOW));
  assert(isAuthorized("www.example.com", subs, NOW));
  assert(isAuthorized("a.b.c.example.com", subs, NOW));
  // ...but never a different registrable domain that merely shares a suffix.
  assertFalse(isAuthorized("example.com.attacker.com", subs, NOW));
  assertFalse(isAuthorized("notexample.com", subs, NOW));
});

// WHY: Caddy passes the raw SNI; without normalization a mixed-case, dotted, or
// IDN hostname would silently miss its subscription and be denied a cert.
Deno.test("SNI is normalized (case, trailing dot, IDN) before matching", () => {
  const subs = [sub({ domain: "example.com", scope: "single" })];
  assertEquals(normalizeDomain("EXAMPLE.com."), "example.com");
  assert(isAuthorized("EXAMPLE.com.", subs, NOW));
  assert(isAuthorized("WWW.Example.COM", subs, NOW));

  // IDN apex stored in punycode is matched from its Unicode SNI form.
  const idn = [sub({ domain: "xn--bcher-kva.example", scope: "single" })];
  assertEquals(normalizeDomain("Bücher.example"), "xn--bcher-kva.example");
  assert(isAuthorized("Bücher.example", idn, NOW));
});

// WHY: a whole-domain target that is a public suffix (e.g. *.com) would let one
// payment hijack certs for every domain under a TLD — it must never authorize.
Deno.test("whole-domain targeting a public suffix is rejected", () => {
  assertFalse(isRegistrableDomain("com"));
  assertFalse(isRegistrableDomain("co.uk"));
  const subs = [sub({ domain: "com", scope: "whole-domain" })];
  assertFalse(isAuthorized("anything.com", subs, NOW));
  assertFalse(isAuthorized("com", subs, NOW));
});

// WHY: authorization gates a real cert; an expired or cancelled subscription
// must stop authorizing immediately, otherwise unpaid domains keep HTTPS.
Deno.test("expired or inactive subscriptions are denied", () => {
  assertFalse(
    isAuthorized("example.com", [sub({ domain: "example.com", scope: "single", currentPeriodEnd: PAST })], NOW),
  );
  assertFalse(
    isAuthorized("example.com", [sub({ domain: "example.com", scope: "single", status: "inactive" })], NOW),
  );
  // Boundary: authorization requires now < period end (not <=).
  assertFalse(
    isAuthorized("example.com", [sub({ domain: "example.com", scope: "single", currentPeriodEnd: NOW })], NOW),
  );
});
