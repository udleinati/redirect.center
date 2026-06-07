// Reconciliation (module #4), v2. Polar is the source of truth for Plans; the
// Postgres `plans` table is rebuildable from it. This job pulls the provider's
// active subscriptions and makes the local Plans match: add the missing, refresh
// the changed (e.g. a Tier upgrade's new cap), and deactivate Plans no longer
// active at the provider. It NEVER touches the `domains` table — Domains are
// app-owned and durable, not rebuildable from Polar (ADR-0002). Running it after
// wiping `plans` restores full authorization (certs already live in S3).
//
// The decision is split into a PURE plan (planReconcile) — exhaustively testable,
// it encodes "what should change" — and a thin async orchestrator that performs
// the I/O. Mapping each remote subscription to scope/cap/period reuses the same
// pure mapPlanEvent the webhook uses, so the rules live in exactly one place.

import type { PlanFields, TierInfo } from "./polar-webhook.ts";
import { mapPlanEvent } from "./polar-webhook.ts";
import type { Plan } from "./authorization.ts";
import type { PolarSubscriptionItem } from "./polar-api.ts";
import type { Sql } from "./db.ts";
import { listActivePlans, markPlanInactive, upsertPlan } from "./paid-store.ts";

// Manually-seeded demo Plans (see seedPlans) have no provider counterpart, so
// reconciliation leaves them alone instead of treating them as "stale at Polar".
const SEED_PREFIX = "seed:";

export interface ReconcilePlan {
  // Active Plans to write — new subscriptions or ones whose customer/scope/cap/
  // period changed at the provider. Unchanged Plans are omitted so a re-run is a no-op.
  upserts: Plan[];
  // Provider ids of local-active Plans to mark inactive (gone from Polar's set).
  deactivate: string[];
}

export interface ReconcileResult {
  remoteTotal: number; // raw active subscriptions returned by Polar
  activated: number; // Plans written (new or changed)
  deactivated: number; // local Plans marked inactive
  skipped: number; // remote items that didn't map to a Tier (unknown product, …)
}

// Pure: given the provider's active subscriptions (already mapped to Plan fields),
// the full set of provider-active ids, and the current local-active Plans, decide
// what to upsert and what to deactivate.
//
// `remoteActiveIds` is EVERY id Polar returned as active — including ones we
// couldn't map (unknown product). We deactivate only Plans absent from that full
// set, so a still-active-but-unmappable subscription is never torn down here.
export function planReconcile(
  activations: readonly PlanFields[],
  remoteActiveIds: ReadonlySet<string>,
  localActive: readonly Plan[],
): ReconcilePlan {
  const localById = new Map(localActive.map((p) => [p.polarSubscriptionId, p]));

  const upserts: Plan[] = [];
  for (const a of activations) {
    const existing = localById.get(a.polarSubscriptionId);
    const unchanged = existing &&
      existing.customerId === a.customerId &&
      existing.scope === a.scope &&
      existing.cap === a.cap &&
      existing.currentPeriodEnd === a.currentPeriodEnd;
    if (unchanged) continue;
    upserts.push({
      polarSubscriptionId: a.polarSubscriptionId,
      customerId: a.customerId,
      scope: a.scope,
      cap: a.cap,
      status: "active",
      currentPeriodEnd: a.currentPeriodEnd,
    });
  }

  const deactivate = localActive
    .filter((p) =>
      !p.polarSubscriptionId.startsWith(SEED_PREFIX) &&
      !remoteActiveIds.has(p.polarSubscriptionId)
    )
    .map((p) => p.polarSubscriptionId);

  return { upserts, deactivate };
}

// Orchestrate the reconcile: map remote items to Plans, compute the plan against
// the current `plans` table, then apply it. The caller fetches `remoteItems` first
// and only reaches here on success, so a provider outage never deactivates Plans.
export async function reconcilePlans(
  sql: Sql,
  productTiers: ReadonlyMap<string, TierInfo>,
  remoteItems: readonly PolarSubscriptionItem[],
  now: number,
): Promise<ReconcileResult> {
  const remoteActiveIds = new Set<string>();
  const activations: PlanFields[] = [];

  for (const item of remoteItems) {
    if (typeof item.id === "string" && item.id) remoteActiveIds.add(item.id);
    // Polar already filtered to active=true, so treat the API as authoritative on
    // "active" and let mapPlanEvent extract customer/scope/cap/period as on a webhook.
    const action = mapPlanEvent({
      type: "subscription.active",
      data: { ...item, status: "active" },
    }, { productTiers });
    if (action.type === "upsert") activations.push(action.plan);
  }

  const localActive = await listActivePlans(sql);
  const plan = planReconcile(activations, remoteActiveIds, localActive);

  for (const p of plan.upserts) await upsertPlan(sql, p, now);
  for (const id of plan.deactivate) await markPlanInactive(sql, id, now);

  return {
    remoteTotal: remoteItems.length,
    activated: plan.upserts.length,
    deactivated: plan.deactivate.length,
    skipped: remoteItems.length - activations.length,
  };
}
