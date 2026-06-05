import { assert, assertEquals, assertFalse } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { planReconcile, reconcile } from "./reconcile.ts";
import { buildProductScopes, type ActivationFields } from "./polar-webhook.ts";
import type { PolarSubscriptionItem } from "./polar-api.ts";
import { SubscriptionStore } from "./subscription-store.ts";
import { isAuthorized, type Subscription } from "./authorization.ts";

const NOW = 1_700_000_000_000;
const YEAR = 365 * 24 * 60 * 60 * 1000;
const SINGLE_PID = "prod_single";
const WHOLE_PID = "prod_whole";
const OPTS = { productScopes: buildProductScopes(SINGLE_PID, WHOLE_PID), domainFieldSlug: "domain" };

// A raw active subscription as Polar's list API returns it.
function remote(id: string, domain: string, productId = SINGLE_PID, periodEnd = NOW + YEAR): PolarSubscriptionItem {
  return { id, status: "active", product_id: productId, current_period_end: periodEnd, custom_field_data: { domain } };
}

function activeRow(
  over: Partial<Subscription> & Pick<Subscription, "polarSubscriptionId" | "domain" | "scope">,
): Subscription {
  return { status: "active", currentPeriodEnd: NOW + YEAR, createdAt: NOW, updatedAt: NOW, ...over };
}

// WHY: the whole point of reconciliation is disposability — a wiped/replaced box
// must recover full authorization from the provider alone (certs already in S3).
// If a rebuild didn't restore active subs, HTTPS would silently break on recovery.
Deno.test("reconcile: rebuilds authorization in an empty store from the provider", () => {
  const store = new SubscriptionStore(":memory:");
  try {
    const result = reconcile(store, OPTS, [
      remote("sub_a", "example.com", SINGLE_PID),
      remote("sub_b", "acme.io", WHOLE_PID),
    ], NOW);
    assertEquals(result.activated, 2);
    const subs = store.listActive(NOW);
    assert(isAuthorized("www.example.com", subs, NOW)); // single apex -> www restored
    assert(isAuthorized("deep.sub.acme.io", subs, NOW)); // whole-domain subtree restored
  } finally {
    store.close();
  }
});

// WHY: a subscription that ended at the provider must stop authorizing locally,
// even if the revoke webhook was missed — reconciliation is the safety net that
// makes the provider the source of truth.
Deno.test("reconcile: deactivates local rows no longer active at the provider", () => {
  const store = new SubscriptionStore(":memory:");
  try {
    store.upsert(activeRow({ polarSubscriptionId: "sub_gone", domain: "lapsed.com", scope: "single" }));
    const result = reconcile(store, OPTS, [remote("sub_keep", "kept.com")], NOW);
    assertEquals(result.deactivated, 1);
    const subs = store.listActive(NOW);
    assertFalse(isAuthorized("lapsed.com", subs, NOW)); // gone from provider -> denied
    assert(isAuthorized("kept.com", subs, NOW));
  } finally {
    store.close();
  }
});

// WHY: reconciliation runs on a schedule; a second run with the same provider
// state must change nothing, or every run would churn the store (and updated_at)
// and we could never tell a real drift from noise.
Deno.test("reconcile: is idempotent — a second run makes no further changes", () => {
  const store = new SubscriptionStore(":memory:");
  try {
    const items = [remote("sub_a", "example.com"), remote("sub_b", "acme.io", WHOLE_PID)];
    reconcile(store, OPTS, items, NOW);
    const second = reconcile(store, OPTS, items, NOW + 1000);
    assertEquals(second.activated, 0);
    assertEquals(second.deactivated, 0);
  } finally {
    store.close();
  }
});

// WHY: manually-seeded demo rows have no provider counterpart; reconciliation must
// not mistake them for "stale at Polar" and tear them down, or `deno task reconcile`
// would silently break the local demo every time it runs.
Deno.test("reconcile: leaves manually-seeded rows untouched", () => {
  const store = new SubscriptionStore(":memory:");
  try {
    store.upsert(activeRow({ polarSubscriptionId: "seed:demo.com:single", domain: "demo.com", scope: "single" }));
    store.upsert(activeRow({ polarSubscriptionId: "sub_real", domain: "real.com", scope: "single" }));
    const result = reconcile(store, OPTS, [], NOW); // provider returned nothing active
    assertEquals(result.deactivated, 1); // only the real provider row
    const subs = store.listActive(NOW);
    assert(isAuthorized("demo.com", subs, NOW)); // seed survives
    assertFalse(isAuthorized("real.com", subs, NOW)); // real row deactivated
  } finally {
    store.close();
  }
});

// WHY: the provider can return an active subscription we can't map (unknown
// product, missing domain field). Deactivating it would tear down a paying
// customer's HTTPS over a mapping gap — so an id present in the active set is
// preserved even when it isn't in the mappable activations.
Deno.test("planReconcile: keeps an active-but-unmappable provider id", () => {
  const local: Subscription[] = [activeRow({ polarSubscriptionId: "sub_x", domain: "x.com", scope: "single" })];
  const activations: ActivationFields[] = []; // sub_x didn't map (e.g. unknown product)
  const plan = planReconcile(activations, new Set(["sub_x"]), local, NOW);
  assertEquals(plan.deactivate, []);
  assertEquals(plan.upserts, []);
});
