// Reconciliation (module #4). Polar is the source of truth; the SQLite store is
// a disposable cache. This job pulls the provider's active subscriptions and
// makes the local store match: add the missing, refresh the changed, and
// deactivate rows that are no longer active at the provider. Running it after
// wiping SQLite restores full authorization state (the certs already live in S3).
//
// The decision is split into a PURE plan (planReconcile) — exhaustively testable,
// it encodes "what should change" — and a thin orchestrator that performs the
// I/O. Mapping each remote subscription to scope/domain/period reuses the same
// pure mapEvent the webhook uses, so the rules live in exactly one place.

import type { ActivationFields, MapEventOptions } from "./polar-webhook.ts";
import { mapEvent } from "./polar-webhook.ts";
import type { Subscription } from "./authorization.ts";
import type { PolarSubscriptionItem } from "./polar-api.ts";
import type { SubscriptionStore } from "./subscription-store.ts";

// Manually-seeded demo rows (see seedFromSpec) have no provider counterpart, so
// reconciliation leaves them alone instead of treating them as "stale at Polar".
const SEED_PREFIX = "seed:";

export interface ReconcilePlan {
  // Active rows to write — new subscriptions or ones whose domain/scope/period
  // changed at the provider. Unchanged rows are omitted so a re-run is a no-op.
  upserts: Subscription[];
  // Provider ids of local-active rows to mark inactive (gone from Polar's set).
  deactivate: string[];
}

export interface ReconcileResult {
  remoteTotal: number; // raw active subscriptions returned by Polar
  activated: number; // rows written (new or changed)
  deactivated: number; // local rows marked inactive
  skipped: number; // remote items that didn't map to a scope/domain
}

// Pure: given the provider's active subscriptions (already mapped to activation
// fields), the full set of provider-active ids, and the current local-active
// rows, decide what to upsert and what to deactivate.
//
// `remoteActiveIds` is EVERY id Polar returned as active — including ones we
// couldn't map (unknown product, missing domain). We deactivate only rows absent
// from that full set, so a still-active-but-unmappable subscription is never
// torn down by reconciliation.
export function planReconcile(
  activations: readonly ActivationFields[],
  remoteActiveIds: ReadonlySet<string>,
  localActive: readonly Subscription[],
  now: number,
): ReconcilePlan {
  const localById = new Map(localActive.map((s) => [s.polarSubscriptionId, s]));

  const upserts: Subscription[] = [];
  for (const a of activations) {
    const existing = localById.get(a.polarSubscriptionId);
    const unchanged = existing &&
      existing.domain === a.domain &&
      existing.scope === a.scope &&
      existing.currentPeriodEnd === a.currentPeriodEnd;
    if (unchanged) continue;
    upserts.push({
      polarSubscriptionId: a.polarSubscriptionId,
      domain: a.domain,
      scope: a.scope,
      status: "active",
      currentPeriodEnd: a.currentPeriodEnd,
      // The store preserves the original created_at on conflict; for a new row
      // this stamps it.
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
  }

  const deactivate = localActive
    .filter((s) =>
      !s.polarSubscriptionId.startsWith(SEED_PREFIX) &&
      !remoteActiveIds.has(s.polarSubscriptionId)
    )
    .map((s) => s.polarSubscriptionId);

  return { upserts, deactivate };
}

// Orchestrate the reconcile: map remote items, compute the plan against the
// current store, then apply it. The caller fetches `remoteItems` first and only
// reaches here on success, so a provider outage never deactivates local rows.
export function reconcile(
  store: SubscriptionStore,
  mapOpts: MapEventOptions,
  remoteItems: readonly PolarSubscriptionItem[],
  now: number,
): ReconcileResult {
  const remoteActiveIds = new Set<string>();
  const activations: ActivationFields[] = [];

  for (const item of remoteItems) {
    if (typeof item.id === "string" && item.id) remoteActiveIds.add(item.id);
    // Polar already filtered to active=true, so treat the API as authoritative on
    // "active" and let mapEvent extract scope/domain/period exactly as on a webhook.
    const action = mapEvent({ type: "subscription.active", data: { ...item, status: "active" } }, mapOpts);
    if (action.type === "activate") activations.push(action.subscription);
  }

  const plan = planReconcile(activations, remoteActiveIds, store.listActive(now), now);

  for (const sub of plan.upserts) store.upsert(sub);
  for (const id of plan.deactivate) store.markInactive(id, now);

  return {
    remoteTotal: remoteItems.length,
    activated: plan.upserts.length,
    deactivated: plan.deactivate.length,
    skipped: remoteItems.length - activations.length,
  };
}
