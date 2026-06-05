import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { seedFromSpec, SubscriptionStore } from "./subscription-store.ts";
import { isAuthorized, type Subscription } from "./authorization.ts";

const NOW = 1_700_000_000_000;
const YEAR = 365 * 24 * 60 * 60 * 1000;

function activeSub(
  over: Partial<Subscription> & Pick<Subscription, "polarSubscriptionId" | "domain" | "scope">,
): Subscription {
  return { status: "active", currentPeriodEnd: NOW + YEAR, createdAt: NOW, updatedAt: NOW, ...over };
}

// WHY: webhooks can be re-delivered; the store must key on the provider id so a
// replay refreshes the row instead of creating a duplicate (Phase 3 relies on
// this for idempotency), and must not rewrite the original created_at.
Deno.test("store: upsert is idempotent on polar_subscription_id", () => {
  const s = new SubscriptionStore(":memory:");
  try {
    s.upsert(activeSub({ polarSubscriptionId: "polar_1", domain: "example.com", scope: "single" }));
    s.upsert(activeSub({
      polarSubscriptionId: "polar_1",
      domain: "example.com",
      scope: "single",
      updatedAt: NOW + 1000,
    }));
    assertEquals(s.listActive(NOW).length, 1);
    assertEquals(s.get("polar_1")?.createdAt, NOW);
    assertEquals(s.get("polar_1")?.updatedAt, NOW + 1000);
  } finally {
    s.close();
  }
});

// WHY: listActive is the candidate set handed to the authorizer; if it leaked
// inactive or expired rows, revoked/lapsed domains would keep getting certs.
Deno.test("store: listActive excludes inactive and expired rows", () => {
  const s = new SubscriptionStore(":memory:");
  try {
    s.upsert(activeSub({ polarSubscriptionId: "a", domain: "a.com", scope: "single" }));
    s.upsert(activeSub({ polarSubscriptionId: "b", domain: "b.com", scope: "single", status: "inactive" }));
    s.upsert(activeSub({ polarSubscriptionId: "c", domain: "c.com", scope: "single", currentPeriodEnd: NOW - 1 }));
    assertEquals(s.listActive(NOW).map((r) => r.domain), ["a.com"]);
  } finally {
    s.close();
  }
});

// WHY: the demo path seeds the store directly; seeding must produce rows that
// the real authorizer accepts, proving the store<->authorizer contract holds.
Deno.test("store: seedFromSpec authorizes the seeded domains end-to-end", () => {
  const s = new SubscriptionStore(":memory:");
  try {
    const n = seedFromSpec(s, "Example.com:single, example.org:whole-domain", NOW);
    assertEquals(n, 2);
    const subs = s.listActive(NOW);
    assert(isAuthorized("www.example.com", subs, NOW)); // single apex -> www
    assert(isAuthorized("deep.sub.example.org", subs, NOW)); // whole-domain subtree
    assertEquals(isAuthorized("example.net", subs, NOW), false);
  } finally {
    s.close();
  }
});
