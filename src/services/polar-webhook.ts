// Polar webhook event → lifecycle action (module #3b — pure, no I/O).
//
// The decided state machine (see PRD): keep a subscription until its period end
// on cancel, tear down only on revoke.
//
//   subscription active/created/updated (status active) → activate
//   subscription canceled                               → noop (kept until period end)
//   payment failed / past due (status not active)       → noop (provider runs dunning)
//   subscription revoked (period end / refund / charge) → revoke (Phase 4 tears down)
//   anything else                                       → noop
//
// Idempotency is keyed on the provider subscription id: this mapping is pure and
// deterministic, so a re-delivered event yields the same action, and applying it
// twice is a no-op at the store layer (upsert / mark-inactive on the same id).

import { normalizeDomain, type Scope } from "./authorization.ts";

export interface ActivationFields {
  polarSubscriptionId: string;
  domain: string; // normalized
  scope: Scope;
  currentPeriodEnd: number; // epoch ms
}

export type WebhookAction =
  | { type: "activate"; subscription: ActivationFields }
  | { type: "revoke"; polarSubscriptionId: string }
  | { type: "noop"; reason: string };

export interface MapEventOptions {
  // Maps a Polar product id to the tier it sells. A product we don't recognize
  // can't be mapped to a scope, so its events become a noop (never guessed).
  productScopes: ReadonlyMap<string, Scope>;
  // Slug of the required "domain" custom field, as configured on the products.
  domainFieldSlug: string;
}

// Minimal shape of the parsed webhook body. Unknown fields are ignored.
interface PolarEvent {
  type?: unknown;
  data?: {
    id?: unknown;
    status?: unknown;
    product_id?: unknown;
    current_period_end?: unknown;
    custom_field_data?: Record<string, unknown> | null;
    metadata?: Record<string, unknown> | null;
  } | null;
}

export function mapEvent(event: PolarEvent, opts: MapEventOptions): WebhookAction {
  const type = typeof event.type === "string" ? event.type : "";
  const data = event.data ?? undefined;

  switch (type) {
    case "subscription.created":
    case "subscription.active":
    case "subscription.updated":
    case "subscription.uncanceled":
      // Only an actually-active subscription should provision a cert; a created-
      // but-incomplete or past_due row must not (the provider drives dunning).
      return data && data.status === "active" ? activation(data, opts) : noop(`status=${data?.status}`);

    case "subscription.canceled":
      // The provider keeps it active until period end, then emits revoked.
      return noop("canceled — kept active until period end");

    case "subscription.revoked":
      return revoke(data);

    default:
      return noop(`unhandled event: ${type || "(missing type)"}`);
  }
}

function activation(data: NonNullable<PolarEvent["data"]>, opts: MapEventOptions): WebhookAction {
  const id = typeof data.id === "string" ? data.id : "";
  if (!id) return noop("missing subscription id");

  const scope = typeof data.product_id === "string" ? opts.productScopes.get(data.product_id) : undefined;
  if (!scope) return noop(`unknown product: ${String(data.product_id)}`);

  const domain = normalizeDomain(extractDomain(data, opts.domainFieldSlug));
  if (!domain) return noop("missing/invalid domain custom field");

  const currentPeriodEnd = parseEpochMs(data.current_period_end);
  if (currentPeriodEnd === null) return noop("missing/invalid current_period_end");

  return { type: "activate", subscription: { polarSubscriptionId: id, domain, scope, currentPeriodEnd } };
}

function revoke(data: PolarEvent["data"]): WebhookAction {
  const id = data && typeof data.id === "string" ? data.id : "";
  if (!id) return noop("revoke missing subscription id");
  return { type: "revoke", polarSubscriptionId: id };
}

// The domain is collected via a checkout custom field; fall back to metadata so a
// checkout link that passes the domain as metadata still provisions correctly.
function extractDomain(data: NonNullable<PolarEvent["data"]>, slug: string): string {
  const fromField = data.custom_field_data?.[slug];
  if (typeof fromField === "string" && fromField.trim()) return fromField;
  const fromMeta = data.metadata?.[slug];
  return typeof fromMeta === "string" ? fromMeta : "";
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

function noop(reason: string): WebhookAction {
  return { type: "noop", reason };
}
