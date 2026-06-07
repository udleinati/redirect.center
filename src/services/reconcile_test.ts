import { assertEquals } from "@std/assert";
import { planReconcile } from "./reconcile.ts";
import type { PlanFields } from "./polar-webhook.ts";
import type { Plan } from "./authorization.ts";

// planReconcile is the PURE core of reconciliation — what to upsert / deactivate.
// The orchestrator (reconcilePlans) is thin I/O over Postgres, verified manually;
// crucially it imports NO domain mutators, so reconciliation structurally cannot
// touch the app-owned Domain table (ADR-0002).

const NOW = 1_700_000_000_000;
const YEAR = 365 * 24 * 60 * 60 * 1000;
const FUTURE = NOW + YEAR;

function activation(
  over: Partial<PlanFields> & Pick<PlanFields, "polarSubscriptionId">,
): PlanFields {
  return {
    customerId: "c1",
    scope: "single",
    cap: 1,
    currentPeriodEnd: FUTURE,
    ...over,
  };
}

function localPlan(
  over: Partial<Plan> & Pick<Plan, "polarSubscriptionId">,
): Plan {
  return {
    customerId: "c1",
    scope: "single",
    cap: 1,
    status: "active",
    currentPeriodEnd: FUTURE,
    ...over,
  };
}

// WHY: the whole point of reconciliation is disposability — after the `plans`
// table is wiped, every active subscription at the provider must come back, or
// HTTPS silently breaks on recovery.
Deno.test("planReconcile: rebuilds every Plan in an empty local set", () => {
  const plan = planReconcile(
    [
      activation({ polarSubscriptionId: "sub_a" }),
      activation({ polarSubscriptionId: "sub_b", cap: 5 }),
    ],
    new Set(["sub_a", "sub_b"]),
    [],
  );
  assertEquals(plan.upserts.map((p) => p.polarSubscriptionId), [
    "sub_a",
    "sub_b",
  ]);
  assertEquals(plan.upserts[1].cap, 5);
  assertEquals(plan.deactivate, []);
});

// WHY: a subscription that ended at the provider must stop authorizing locally,
// even if the revoke webhook was missed — reconciliation is the safety net that
// makes Polar the source of truth for Plans.
Deno.test("planReconcile: deactivates a local Plan no longer active at the provider", () => {
  const plan = planReconcile([], new Set(), [
    localPlan({ polarSubscriptionId: "sub_gone" }),
  ]);
  assertEquals(plan.deactivate, ["sub_gone"]);
  assertEquals(plan.upserts, []);
});

// WHY: reconciliation runs on a schedule; a second run with identical provider
// state must change nothing, or every run would churn the store and we could
// never tell real drift from noise.
Deno.test("planReconcile: is idempotent — unchanged provider state yields no writes", () => {
  const local = [
    localPlan({ polarSubscriptionId: "sub_a" }),
    localPlan({ polarSubscriptionId: "sub_b", cap: 5 }),
  ];
  const acts = [
    activation({ polarSubscriptionId: "sub_a" }),
    activation({ polarSubscriptionId: "sub_b", cap: 5 }),
  ];
  const plan = planReconcile(acts, new Set(["sub_a", "sub_b"]), local);
  assertEquals(plan.upserts, []);
  assertEquals(plan.deactivate, []);
});

// WHY: a Tier upgrade may land via reconcile (e.g. a missed `subscription.updated`);
// a changed cap on the same subscription must be re-written so the account gets the
// capacity it now pays for.
Deno.test("planReconcile: re-upserts a Plan whose cap changed (Tier upgrade)", () => {
  const local = [localPlan({ polarSubscriptionId: "sub_x", cap: 1 })];
  const acts = [activation({ polarSubscriptionId: "sub_x", cap: 5 })];
  const plan = planReconcile(acts, new Set(["sub_x"]), local);
  assertEquals(plan.upserts.length, 1);
  assertEquals(plan.upserts[0].cap, 5);
  assertEquals(plan.deactivate, []);
});

// WHY: manually-seeded demo Plans have no provider counterpart; reconciliation must
// not mistake them for "stale at Polar" and tear them down, or `deno task reconcile`
// would silently break the local demo every time it runs.
Deno.test("planReconcile: leaves manually-seeded Plans untouched", () => {
  const local = [
    localPlan({ polarSubscriptionId: "seed:c1:single" }),
    localPlan({ polarSubscriptionId: "sub_real" }),
  ];
  const plan = planReconcile([], new Set(), local); // provider returned nothing active
  assertEquals(plan.deactivate, ["sub_real"]); // only the real provider row
});

// WHY: Polar can return an active subscription we can't map (unknown product).
// Deactivating it would tear down a paying Customer's HTTPS over a mapping gap, so
// an id present in the active set is preserved even when it isn't in the activations.
Deno.test("planReconcile: keeps an active-but-unmappable provider id", () => {
  const local = [localPlan({ polarSubscriptionId: "sub_x" })];
  const plan = planReconcile([], new Set(["sub_x"]), local); // sub_x didn't map
  assertEquals(plan.deactivate, []);
  assertEquals(plan.upserts, []);
});
