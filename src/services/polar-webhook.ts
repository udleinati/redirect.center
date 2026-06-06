// Polar webhook event → Plan action (module #3b — pure, no I/O).
//
// v2 tiered-bundle model (ADR-0001): a subscription carries no domain. An event
// upserts a Plan for the (customer, scope) the product sells, with the Tier's
// `cap`. The Domain list is owned in-app, so this never touches it.
//
//   subscription created/active/updated (status active) → upsert Plan (cap from Tier)
//   subscription canceled                               → noop (kept until period end)
//   payment failed / past due (status not active)       → noop (provider runs dunning)
//   subscription revoked (period end / refund / charge) → revoke (tear Plan + certs down)
//   anything else                                       → noop
//
// A Tier upgrade arrives as `subscription.updated` pointing at a different product,
// so the new cap simply flows through the upsert. Idempotency is keyed on the
// provider subscription id: the mapping is pure and deterministic, so a re-delivered
// event yields the same action and applying it twice is a no-op at the store.

import type { Scope } from "./authorization.ts";

export interface PlanFields {
  polarSubscriptionId: string;
  customerId: string;
  scope: Scope;
  cap: number; // domains allowed in this scope, from the Tier/product
  currentPeriodEnd: number; // epoch ms
}

export type PlanAction =
  | { type: "upsert"; plan: PlanFields }
  | { type: "revoke"; polarSubscriptionId: string }
  | { type: "noop"; reason: string };

export interface TierInfo {
  scope: Scope;
  cap: number;
}

// Minimal shape of the parsed webhook body. Unknown fields are ignored.
interface PolarEvent {
  type?: unknown;
  data?: {
    id?: unknown;
    status?: unknown;
    product_id?: unknown;
    customer_id?: unknown;
    current_period_end?: unknown;
  } | null;
}

// Build product_id -> {scope, cap} from "prodId:scope:cap,prodId:scope:cap".
// A product not in this map can't be mapped to a Tier, so its events are a noop
// (the cap is never guessed). Shared by the webhook handler and reconcile.
export function buildProductTiers(spec: string): Map<string, TierInfo> {
  const tiers = new Map<string, TierInfo>();
  for (const entry of spec.split(",").map((s) => s.trim()).filter(Boolean)) {
    const [id, rawScope, rawCap] = entry.split(":").map((s) => s.trim());
    if (!id || !rawScope) continue;
    const scope: Scope = rawScope === "whole-domain" ? "whole-domain" : "single";
    const cap = Number(rawCap);
    if (!Number.isFinite(cap) || cap <= 0) continue;
    tiers.set(id, { scope, cap });
  }
  return tiers;
}

// Build the full product_id -> Tier map for the v2 ladders, REUSING the v1 single
// and whole-domain products as the cap-1 Tier of each Scope (ADR-0001) and layering
// any larger bundles from `extraSpec` ("prodId:scope:cap,…"). A later entry for the
// same id wins, so extraSpec can override a base cap if ever needed. Shared by the
// webhook handler and the reconcile job so both resolve a product the same way.
export function buildTierLadders(
  singleId: string,
  wholeDomainId: string,
  extraSpec: string,
): Map<string, TierInfo> {
  const tiers = new Map<string, TierInfo>();
  if (singleId) tiers.set(singleId, { scope: "single", cap: 1 });
  if (wholeDomainId) tiers.set(wholeDomainId, { scope: "whole-domain", cap: 1 });
  for (const [id, info] of buildProductTiers(extraSpec)) tiers.set(id, info);
  return tiers;
}

export function mapPlanEvent(
  event: PolarEvent,
  opts: { productTiers: ReadonlyMap<string, TierInfo> },
): PlanAction {
  const type = typeof event.type === "string" ? event.type : "";
  const data = event.data ?? undefined;

  switch (type) {
    case "subscription.created":
    case "subscription.active":
    case "subscription.updated":
    case "subscription.uncanceled":
      // Only an actually-active subscription provisions; a Tier change arrives as
      // an `updated` with a different product → the new cap flows through here.
      return data && data.status === "active" ? planUpsert(data, opts) : planNoop(`status=${data?.status}`);

    case "subscription.canceled":
      // The provider keeps it active until period end, then emits revoked.
      return planNoop("canceled — kept active until period end");

    case "subscription.revoked":
      return planRevoke(data);

    default:
      return planNoop(`unhandled event: ${type || "(missing type)"}`);
  }
}

function planUpsert(
  data: NonNullable<PolarEvent["data"]>,
  opts: { productTiers: ReadonlyMap<string, TierInfo> },
): PlanAction {
  const id = typeof data.id === "string" ? data.id : "";
  if (!id) return planNoop("missing subscription id");

  const customerId = typeof data.customer_id === "string" ? data.customer_id : "";
  if (!customerId) return planNoop("missing customer id");

  const tier = typeof data.product_id === "string" ? opts.productTiers.get(data.product_id) : undefined;
  if (!tier) return planNoop(`unknown product: ${String(data.product_id)}`);

  const currentPeriodEnd = parseEpochMs(data.current_period_end);
  if (currentPeriodEnd === null) return planNoop("missing/invalid current_period_end");

  return {
    type: "upsert",
    plan: { polarSubscriptionId: id, customerId, scope: tier.scope, cap: tier.cap, currentPeriodEnd },
  };
}

function planRevoke(data: PolarEvent["data"]): PlanAction {
  const id = data && typeof data.id === "string" ? data.id : "";
  if (!id) return planNoop("revoke missing subscription id");
  return { type: "revoke", polarSubscriptionId: id };
}

function planNoop(reason: string): PlanAction {
  return { type: "noop", reason };
}

// Polar sends timestamps as ISO 8601 strings; accept epoch numbers defensively.
function parseEpochMs(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const ms = Date.parse(value);
    if (Number.isFinite(ms)) return ms;
  }
  return null;
}
