import {
  assert,
  assertFalse,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { IssuanceRateLimiter } from "./issuance-rate-limit.ts";

const NOW = 1_700_000_000_000;
const WINDOW = 60_000;
const DEDUP = 10_000;

// WHY: the limiter exists to stop a handshake flood from triggering mass ACME
// issuance and blowing the Let's Encrypt account's order limit. Distinct new
// domains must each cost one slot, and once the window is full the next new
// domain must be refused — otherwise the cap does nothing.
Deno.test("denies new domains once the window limit is reached", () => {
  const limiter = new IssuanceRateLimiter(3, WINDOW, DEDUP);
  assert(limiter.tryAcquire("a.com", NOW));
  assert(limiter.tryAcquire("b.com", NOW));
  assert(limiter.tryAcquire("c.com", NOW));
  assertFalse(limiter.tryAcquire("d.com", NOW));
});

// WHY: Caddy calls the ask endpoint several times for a single issuance (and
// again on renewal). If each call consumed a slot, one legitimate domain could
// exhaust the window and lock out everyone else — so repeats inside the dedup
// window must be free.
Deno.test("repeated checks for the same domain within dedup don't consume budget", () => {
  const limiter = new IssuanceRateLimiter(2, WINDOW, DEDUP);
  assert(limiter.tryAcquire("a.com", NOW));
  // Same domain hammered: still allowed, and must not eat the remaining slots.
  assert(limiter.tryAcquire("a.com", NOW + 1));
  assert(limiter.tryAcquire("a.com", NOW + 2));
  // Two genuinely new domains still fit under the limit of 2.
  assert(limiter.tryAcquire("b.com", NOW + 3));
  assertFalse(limiter.tryAcquire("c.com", NOW + 4));
});

// WHY: as events age out of the rolling window, capacity must come back, or the
// service would permanently stop issuing after the first busy minute.
Deno.test("capacity recovers after events age out of the window", () => {
  const limiter = new IssuanceRateLimiter(2, WINDOW, DEDUP);
  assert(limiter.tryAcquire("a.com", NOW));
  assert(limiter.tryAcquire("b.com", NOW));
  assertFalse(limiter.tryAcquire("c.com", NOW + 1));
  // After the window passes, the early events no longer count.
  assert(limiter.tryAcquire("c.com", NOW + WINDOW + 1));
});

// WHY: a cert that lapsed and is being re-issued long after its first issuance is
// a real new ACME order and must be governed by the limit again, not waved
// through forever because the domain was once seen.
Deno.test("a domain re-checked after the dedup window counts as new again", () => {
  const limiter = new IssuanceRateLimiter(1, WINDOW, DEDUP);
  assert(limiter.tryAcquire("a.com", NOW));
  // Still the only slot; a different new domain is refused.
  assertFalse(limiter.tryAcquire("b.com", NOW + DEDUP + 1));
  // The same domain, past dedup, is a fresh issuance — it competes for the slot
  // (which freed up only because the first event also aged past the window).
  assert(limiter.tryAcquire("a.com", NOW + WINDOW + 1));
});
