import { assert, assertEquals } from "@std/assert";
import {
  buildProductTiers,
  buildTierLadders,
  mapPlanEvent,
  type PlanAction,
} from "./polar-webhook.ts";

const TIERS = buildProductTiers(
  "prod_single_1:single:1,prod_single_5:single:5,prod_whole_1:whole-domain:1",
);
const opts = { productTiers: TIERS };

// deno-lint-ignore no-explicit-any
function evt(type: string, data: Record<string, unknown>): any {
  return { type, data };
}

function activeSub(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub_1",
    status: "active",
    product_id: "prod_single_5",
    customer_id: "cus_1",
    current_period_end: "2027-01-01T00:00:00Z",
    ...overrides,
  };
}

// WHY: the Tier (product) — not a custom field — defines what was bought. An active
// subscription must produce a Plan for the right (customer, scope) with the Tier's
// cap and period, so authorization knows how many domains the account may enable.
Deno.test("active subscription upserts a Plan with the Tier's scope + cap", () => {
  for (
    const t of [
      "subscription.created",
      "subscription.active",
      "subscription.updated",
      "subscription.uncanceled",
    ]
  ) {
    const a = mapPlanEvent(evt(t, activeSub()), opts);
    assertEquals(a.type, "upsert", t);
    if (a.type !== "upsert") throw new Error("unreachable");
    assertEquals(a.plan.customerId, "cus_1");
    assertEquals(a.plan.scope, "single");
    assertEquals(a.plan.cap, 5);
    assertEquals(a.plan.polarSubscriptionId, "sub_1");
    assert(a.plan.currentPeriodEnd > 0);
  }
});

// WHY: a Tier upgrade arrives as `subscription.updated` pointing at a different
// product — the cap must follow the new product, which is how "buy more domains"
// actually takes effect.
Deno.test("a tier change (different product) updates the cap", () => {
  const a = mapPlanEvent(
    evt("subscription.updated", activeSub({ product_id: "prod_single_1" })),
    opts,
  );
  assertEquals((a as Extract<PlanAction, { type: "upsert" }>).plan.cap, 1);
});

// WHY: a product we don't recognize can't be mapped to a cap — guessing would
// either over- or under-grant. It must be a noop, never a Plan.
Deno.test("unknown product is a noop", () => {
  assertEquals(
    mapPlanEvent(
      evt("subscription.created", activeSub({ product_id: "nope" })),
      opts,
    ).type,
    "noop",
  );
});

// WHY: v2 Plans are keyed by the account (customer). Without a customer id there's
// no account to attach the entitlement to.
Deno.test("missing customer id is a noop", () => {
  assertEquals(
    mapPlanEvent(
      evt("subscription.created", activeSub({ customer_id: undefined })),
      opts,
    ).type,
    "noop",
  );
});

// WHY: only an actually-active subscription should provision; a created-but-
// incomplete or past_due one must not (the provider drives dunning).
Deno.test("non-active status is a noop", () => {
  assertEquals(
    mapPlanEvent(
      evt("subscription.created", activeSub({ status: "past_due" })),
      opts,
    ).type,
    "noop",
  );
});

// WHY: the period end is the safety-net expiry; without a valid one the Plan can't
// be trusted to expire, so we refuse it.
Deno.test("missing/invalid current_period_end is a noop", () => {
  assertEquals(
    mapPlanEvent(
      evt("subscription.created", activeSub({ current_period_end: null })),
      opts,
    ).type,
    "noop",
  );
});

// WHY: cancel keeps the subscription until period end (the provider emits revoked
// then); revoke is the real teardown signal, carrying the subscription id.
Deno.test("cancel is a noop; revoke is a revoke", () => {
  assertEquals(
    mapPlanEvent(evt("subscription.canceled", activeSub()), opts).type,
    "noop",
  );
  const r = mapPlanEvent(evt("subscription.revoked", { id: "sub_1" }), opts);
  assertEquals(r.type, "revoke");
  assertEquals(
    (r as Extract<PlanAction, { type: "revoke" }>).polarSubscriptionId,
    "sub_1",
  );
});

// WHY: webhooks are re-delivered; the mapping is pure and deterministic, so a
// duplicate yields the identical action (idempotency is then trivial at the store).
Deno.test("the same event maps to the same action (idempotent mapping)", () => {
  const e = evt("subscription.created", activeSub());
  assertEquals(mapPlanEvent(e, opts), mapPlanEvent(e, opts));
});

// WHY: buildProductTiers must ignore malformed entries rather than create a
// zero/NaN-cap Tier that would silently authorize nothing or everything.
Deno.test("buildProductTiers skips malformed entries", () => {
  const tiers = buildProductTiers(
    "good:single:3, bad-no-cap:single, zero:single:0, :single:5",
  );
  assertEquals(tiers.size, 1);
  assertEquals(tiers.get("good"), { scope: "single", cap: 3 });
});

// WHY: the v1 single / whole-domain products are reused as each Scope's cap-1 Tier
// (ADR-0001), and larger bundles layer on top — so an existing single subscription
// keeps working as "up to 1" while the new "up to 5" product grants cap 5. Getting
// this wrong would either re-grant nothing or mis-size every account's cap.
Deno.test("buildTierLadders reuses single/whole as cap-1 and layers extra bundles", () => {
  const tiers = buildTierLadders(
    "prod_single_1",
    "prod_whole_1",
    "prod_single_5:single:5",
  );
  assertEquals(tiers.get("prod_single_1"), { scope: "single", cap: 1 });
  assertEquals(tiers.get("prod_whole_1"), { scope: "whole-domain", cap: 1 });
  assertEquals(tiers.get("prod_single_5"), { scope: "single", cap: 5 });
  assertEquals(tiers.size, 3);
});

// WHY: an entry in the extra spec for the same product id must win, so a base cap
// can be corrected without removing the product from the reused-id slots.
Deno.test("buildTierLadders lets an extra-spec entry override a base cap", () => {
  const tiers = buildTierLadders("prod_single_1", "", "prod_single_1:single:2");
  assertEquals(tiers.get("prod_single_1"), { scope: "single", cap: 2 });
  assertEquals(tiers.size, 1);
});
