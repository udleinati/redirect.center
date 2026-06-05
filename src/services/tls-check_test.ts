import {
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { decideTlsCheck } from "./tls-check.ts";
import { IssuanceRateLimiter } from "./issuance-rate-limit.ts";
import type { Subscription } from "./authorization.ts";

const NOW = 1_700_000_000_000;
const FUTURE = NOW + 86_400_000;

function paid(domain: string): Subscription {
  return {
    polarSubscriptionId: `sub-${domain}`,
    domain,
    scope: "single",
    status: "active",
    currentPeriodEnd: FUTURE,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

// A generous limiter that won't interfere unless a test wants it to.
function looseLimiter() {
  return new IssuanceRateLimiter(1000, 60_000, 10_000);
}

// WHY: Caddy needs a domain to decide anything; a malformed/empty ask must be a
// clean 400, not an accidental authorization.
Deno.test("blank domain is a 400", () => {
  assertEquals(decideTlsCheck("", [], looseLimiter(), NOW), 400);
  assertEquals(decideTlsCheck("   ", [], looseLimiter(), NOW), 400);
});

// WHY: the whole point of the ask endpoint — only paid domains may get a cert.
Deno.test("paid domain authorizes (200), unpaid is denied (403)", () => {
  const subs = [paid("example.com")];
  assertEquals(decideTlsCheck("example.com", subs, looseLimiter(), NOW), 200);
  assertEquals(decideTlsCheck("nope.com", subs, looseLimiter(), NOW), 403);
});

// WHY: this is the security contract behind extracting this module — an unpaid
// flood is rejected at the authorization gate BEFORE the limiter, so it can never
// consume issuance budget. If the order were reversed, an attacker hammering
// random unpaid SNIs would exhaust the window and block real paid domains from
// ever issuing a certificate.
Deno.test("unpaid requests never consume rate-limit budget", () => {
  const subs = [paid("paid.com")];
  // Budget of exactly 1 issuance.
  const limiter = new IssuanceRateLimiter(1, 60_000, 10_000);
  // Hammer unpaid SNIs — all 403, none should touch the limiter.
  for (let i = 0; i < 50; i++) {
    assertEquals(decideTlsCheck(`attacker-${i}.com`, subs, limiter, NOW + i), 403);
  }
  // The single issuance slot is still available for the legitimate paid domain.
  assertEquals(decideTlsCheck("paid.com", subs, limiter, NOW + 100), 200);
});

// WHY: paid domains beyond the issuance velocity cap are throttled (429), not
// permanently denied — this is the on-demand rate limit the proxy can no longer
// do itself (Caddy removed it in 2.9).
Deno.test("paid domains past the limit are throttled with 429", () => {
  const subs = [paid("a.com"), paid("b.com"), paid("c.com")];
  const limiter = new IssuanceRateLimiter(2, 60_000, 10_000);
  assertEquals(decideTlsCheck("a.com", subs, limiter, NOW), 200);
  assertEquals(decideTlsCheck("b.com", subs, limiter, NOW), 200);
  // Third distinct paid domain exceeds the window of 2 → throttled, not denied.
  assertEquals(decideTlsCheck("c.com", subs, limiter, NOW), 429);
});
