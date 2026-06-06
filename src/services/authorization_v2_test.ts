import {
  assert,
  assertEquals,
  assertFalse,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  authorizeHost,
  type Domain,
  entitledDomains,
  type Plan,
  type Scope,
} from "./authorization.ts";

const NOW = 1_700_000_000_000; // fixed "now" so period checks are deterministic
const FUTURE = NOW + 86_400_000;
const PAST = NOW - 86_400_000;

function plan(
  partial: Partial<Plan> & Pick<Plan, "customerId" | "scope" | "cap">,
): Plan {
  return {
    polarSubscriptionId: `plan-${partial.customerId}-${partial.scope}`,
    status: "active",
    currentPeriodEnd: FUTURE,
    ...partial,
  };
}

function dom(
  partial: Partial<Domain> & Pick<Domain, "customerId" | "domain" | "scope">,
): Domain {
  return {
    status: "active",
    createdAt: NOW,
    ...partial,
  };
}

// WHY: a Tier with cap N must let the Customer's N Domains all serve HTTPS —
// that is the whole point of buying a bundle — and a single Domain still covers
// its apex + www (the v1 geometry is preserved, only the source changed).
Deno.test("plan cap covers all domains within it (apex + www each)", () => {
  const plans = [plan({ customerId: "c1", scope: "single", cap: 2 })];
  const domains = [
    dom({ customerId: "c1", domain: "a.com", scope: "single" }),
    dom({ customerId: "c1", domain: "b.com", scope: "single" }),
  ];
  assert(authorizeHost("a.com", plans, domains, NOW));
  assert(authorizeHost("www.a.com", plans, domains, NOW));
  assert(authorizeHost("b.com", plans, domains, NOW));
  assert(authorizeHost("www.b.com", plans, domains, NOW));
});

// WHY: a downgrade happens in Polar's portal and can transiently leave MORE
// active Domains than the new cap. The excess must not keep serving for free,
// and the choice of victim must be deterministic — newest-first (oldest Domains,
// added first, are the ones the Customer most likely still wants).
Deno.test("over-cap denies the newest excess Domains (defensive bound)", () => {
  const plans = [plan({ customerId: "c1", scope: "single", cap: 2 })];
  const domains = [
    dom({ customerId: "c1", domain: "old.com", scope: "single", createdAt: NOW - 3000 }),
    dom({ customerId: "c1", domain: "mid.com", scope: "single", createdAt: NOW - 2000 }),
    dom({ customerId: "c1", domain: "new.com", scope: "single", createdAt: NOW - 1000 }),
  ];
  assert(authorizeHost("old.com", plans, domains, NOW), "oldest within cap");
  assert(authorizeHost("mid.com", plans, domains, NOW), "second-oldest within cap");
  assertFalse(authorizeHost("new.com", plans, domains, NOW), "newest exceeds cap");
  assertEquals(entitledDomains(plans, domains, NOW).length, 2);
});

// WHY: whole-domain coverage (registrable domain + any-depth subdomain) and the
// union across Scopes are the v2 authorization contract — a Host is served if ANY
// of the Customer's entitled Domains, in either Scope, covers it.
Deno.test("whole-domain covers subdomains; union spans scopes", () => {
  const plans = [
    plan({ customerId: "c1", scope: "single", cap: 1 }),
    plan({ customerId: "c1", scope: "whole-domain", cap: 1 }),
  ];
  const domains = [
    dom({ customerId: "c1", domain: "exact.com", scope: "single" }),
    dom({ customerId: "c1", domain: "acme.com", scope: "whole-domain" }),
  ];
  assert(authorizeHost("exact.com", plans, domains, NOW));
  assert(authorizeHost("deep.sub.acme.com", plans, domains, NOW), "any-depth subdomain");
  assert(authorizeHost("acme.com", plans, domains, NOW), "apex of whole-domain");
  assertFalse(authorizeHost("sub.exact.com", plans, domains, NOW), "single does not cover subdomains");
});

// WHY: a lapsed/revoked Plan must stop serving every Domain in its Scope — that
// is how access actually ends when a subscription is revoked.
Deno.test("inactive or expired plan denies its domains", () => {
  const domains = [dom({ customerId: "c1", domain: "a.com", scope: "single" })];
  assertFalse(
    authorizeHost("a.com", [plan({ customerId: "c1", scope: "single", cap: 5, status: "inactive" })], domains, NOW),
    "inactive plan",
  );
  assertFalse(
    authorizeHost("a.com", [plan({ customerId: "c1", scope: "single", cap: 5, currentPeriodEnd: PAST })], domains, NOW),
    "expired plan (safety net against a missed revoke)",
  );
});

// WHY: a removed/inactive Domain must neither be served NOR consume a cap slot —
// otherwise removing a Domain to make room would not actually free capacity.
Deno.test("inactive domain is denied and frees a cap slot", () => {
  const plans = [plan({ customerId: "c1", scope: "single", cap: 1 })];
  const domains = [
    dom({ customerId: "c1", domain: "gone.com", scope: "single", status: "inactive", createdAt: NOW - 2000 }),
    dom({ customerId: "c1", domain: "live.com", scope: "single", createdAt: NOW - 1000 }),
  ];
  assertFalse(authorizeHost("gone.com", plans, domains, NOW));
  assert(authorizeHost("live.com", plans, domains, NOW), "the only active domain fits the cap of 1");
});

// WHY: each Scope is backed by its own Plan — a Domain in a Scope the Customer has
// no active Plan for must be denied, even if they pay for the other Scope.
Deno.test("a domain with no active plan in its scope is denied", () => {
  const plans = [plan({ customerId: "c1", scope: "whole-domain", cap: 5 })];
  const domains = [dom({ customerId: "c1", domain: "a.com", scope: "single" })];
  assertFalse(authorizeHost("a.com", plans, domains, NOW));
});

// WHY: a whole-domain Domain must never be a public suffix — that would blanket an
// entire TLD. The PSL guard from v1 still applies through `coversHost`.
Deno.test("whole-domain over a public suffix is rejected", () => {
  const plans = [plan({ customerId: "c1", scope: "whole-domain", cap: 1 })];
  const domains = [dom({ customerId: "c1", domain: "com", scope: "whole-domain" })];
  assertFalse(authorizeHost("anything.com", plans, domains, NOW));
});

// WHY: entitlement is per-Customer — one Customer's Plan must never authorize
// another Customer's Domain, and an SNI matching no Domain is denied.
Deno.test("entitlement does not leak across customers", () => {
  const plans = [
    plan({ customerId: "a", scope: "single", cap: 5 }),
    plan({ customerId: "b", scope: "whole-domain", cap: 5 }),
  ];
  const domains = [
    dom({ customerId: "a", domain: "a-owned.com", scope: "single" }),
    dom({ customerId: "b", domain: "b-owned.com", scope: "whole-domain" }),
  ];
  assert(authorizeHost("a-owned.com", plans, domains, NOW));
  assert(authorizeHost("sub.b-owned.com", plans, domains, NOW));
  assertFalse(authorizeHost("unknown.com", plans, domains, NOW));
});
