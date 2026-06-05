import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { mapEvent, type MapEventOptions } from "./polar-webhook.ts";
import type { Scope } from "./authorization.ts";

const SINGLE = "prod_single";
const WHOLE = "prod_whole";
const PERIOD_END_ISO = "2025-01-01T00:00:00Z";
const PERIOD_END_MS = Date.parse(PERIOD_END_ISO);

const OPTS: MapEventOptions = {
  productScopes: new Map<string, Scope>([[SINGLE, "single"], [WHOLE, "whole-domain"]]),
  domainFieldSlug: "domain",
};

// deno-lint-ignore no-explicit-any
function event(type: string, data: Record<string, unknown> = {}): any {
  return { type, data };
}

function activeSubData(over: Record<string, unknown> = {}) {
  return {
    id: "sub_1",
    status: "active",
    product_id: SINGLE,
    current_period_end: PERIOD_END_ISO,
    custom_field_data: { domain: "Example.com" },
    ...over,
  };
}

// WHY: a completed checkout is the whole point of the integration — its event
// must provision the exact domain, the tier the customer bought, and the paid
// period, with the SNI-form normalized so authorization later matches.
Deno.test("event: active subscription activates with correct scope, domain, period", () => {
  const a = mapEvent(event("subscription.active", activeSubData({ product_id: WHOLE })), OPTS);
  assertEquals(a, {
    type: "activate",
    subscription: {
      polarSubscriptionId: "sub_1",
      domain: "example.com", // normalized from "Example.com"
      scope: "whole-domain",
      currentPeriodEnd: PERIOD_END_MS,
    },
  });
});

// WHY: renewals arrive as subscription.updated with a fresh period; treating an
// active update as activate is what keeps a paying domain from lapsing at rollover.
Deno.test("event: active update re-activates (renewal refreshes the period)", () => {
  const next = "2026-01-01T00:00:00Z";
  const a = mapEvent(event("subscription.updated", activeSubData({ current_period_end: next })), OPTS);
  assertEquals(a.type, "activate");
  if (a.type === "activate") assertEquals(a.subscription.currentPeriodEnd, Date.parse(next));
});

// WHY: cancel means "don't renew", not "cut off now" — the customer paid through
// period end, so cancel must NOT change local state (the later revoke tears down).
Deno.test("event: cancel is a noop (access kept until period end)", () => {
  assertEquals(mapEvent(event("subscription.canceled", activeSubData()), OPTS).type, "noop");
});

// WHY: dunning is the provider's job; a past_due update must not yank HTTPS mid
// grace-window, or a transient failed charge would break a paying customer.
Deno.test("event: past_due / non-active update is a noop", () => {
  assertEquals(mapEvent(event("subscription.updated", activeSubData({ status: "past_due" })), OPTS).type, "noop");
});

// WHY: revoke is the only event that actually ends access; it must surface the
// subscription id so Phase 4 can mark it inactive and delete its certs.
Deno.test("event: revoke yields a revoke action carrying the subscription id", () => {
  assertEquals(mapEvent(event("subscription.revoked", activeSubData()), OPTS), {
    type: "revoke",
    polarSubscriptionId: "sub_1",
  });
});

// WHY: the mapping is the idempotency anchor — re-delivering the identical event
// must produce the identical action keyed on the same id, so applying it twice at
// the store is a no-op rather than a duplicate or double-effect.
Deno.test("event: identical deliveries map deterministically (idempotent)", () => {
  const e = event("subscription.active", activeSubData());
  assertEquals(mapEvent(e, OPTS), mapEvent(e, OPTS));
});

// WHY: an event for a product we don't sell can't be mapped to a tier; guessing
// a scope would grant the wrong coverage, so it must fail safe to noop.
Deno.test("event: unknown product is a noop (never guess the scope)", () => {
  assertEquals(mapEvent(event("subscription.active", activeSubData({ product_id: "prod_other" })), OPTS).type, "noop");
});

// WHY: without a domain there is nothing to authorize; activating a blank domain
// would write a useless/garbage row, so a missing custom field must noop.
Deno.test("event: missing domain custom field is a noop", () => {
  assertEquals(
    mapEvent(event("subscription.active", activeSubData({ custom_field_data: {} })), OPTS).type,
    "noop",
  );
});

// WHY: an event type outside our state machine (orders, benefits, checkouts)
// must never touch subscription state — only the four mapped types act.
Deno.test("event: unrelated event type is a noop", () => {
  assertEquals(mapEvent(event("order.created", { id: "ord_1" }), OPTS).type, "noop");
  assertEquals(mapEvent(event("", {}), OPTS).type, "noop");
});
