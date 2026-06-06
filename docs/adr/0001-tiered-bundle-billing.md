# Tiered bundle products for multi-domain HTTPS billing

## Context

The paid HTTPS tier must let one customer pay for many domains. Polar forbids two active subscriptions to the same product per customer (`AlreadyActiveSubscriptionError`), and Polar's only quantity mechanism is **seat-based pricing** — a seat must be assigned to a person/email and benefits are gated on the seat being *claimed*, so seats model team members, not a resource count. There is no generic per-subscription quantity multiplier.

## Decision

Sell HTTPS as **tiered bundle products** ("up to 1 / 5 / 25 …" Domains), priced annually, with a **separate product ladder per Scope** (single, whole-domain). A Customer holds at most one Plan per Scope; the Plan's Tier sets the Cap (max active Domains in that Scope). Growing past a Cap is a **product upgrade on the same subscription** (Polar handles proration). The domain *list* is owned by redirect.center; Polar holds only which Tier — the count, never which domains.

## Considered options

- **Seat-based pricing** — rejected: seats are assigned people with benefit-gating, not a resource count; repurposing them for domains fights the tool.
- **Usage/metered billing** — rejected: metered is naturally monthly and clashes with the v1 annual model, yields variable invoices, and adds a usage-reporting integration with its own failure modes.

## Consequences

- The v1 per-subscription **domain custom field is removed**; the first Domain is captured in-app after checkout, not at checkout.
- Tier/price definitions remain a business decision (as in v1).
- Authorization counts active Domains against the Tier Cap; an over-Cap state (after a downgrade) is handled by grace, never by silently deactivating a Domain (see PRD v2).
