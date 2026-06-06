// v2 durable store (ADR-0002): Plans (mirror Polar subscriptions, rebuildable via
// reconcile) and Domains (app-owned, the durable source of truth). Postgres is the
// source of truth; the in-process AuthzCache reads from here for the hot path.
//
// Epoch-ms timestamps are stored as bigint; reads go through Number() (epoch ms is
// well within Number.MAX_SAFE_INTEGER), so the pure authorizer sees plain numbers.

import { type Domain, normalizeDomain, type Plan, type Scope } from "./authorization.ts";
import type { Sql } from "./db.ts";

export async function migrate(sql: Sql): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS plans (
      polar_subscription_id text    PRIMARY KEY,
      customer_id           text    NOT NULL,
      scope                 text    NOT NULL CHECK (scope IN ('single','whole-domain')),
      cap                   integer NOT NULL,
      status                text    NOT NULL CHECK (status IN ('active','inactive')),
      current_period_end    bigint  NOT NULL,
      created_at            bigint  NOT NULL,
      updated_at            bigint  NOT NULL
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS domains (
      customer_id text   NOT NULL,
      domain      text   NOT NULL,
      scope       text   NOT NULL CHECK (scope IN ('single','whole-domain')),
      status      text   NOT NULL CHECK (status IN ('active','inactive')),
      created_at  bigint NOT NULL,
      updated_at  bigint NOT NULL,
      PRIMARY KEY (customer_id, domain)
    )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_plans_customer_scope ON plans (customer_id, scope)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_domains_status ON domains (status)`;
}

// Active rows feed the cache; the pure authorizer re-checks the period defensively.
export async function listActivePlans(sql: Sql): Promise<Plan[]> {
  const rows = await sql`
    SELECT polar_subscription_id, customer_id, scope, cap, current_period_end
    FROM plans WHERE status = 'active'`;
  return rows.map((r) => ({
    polarSubscriptionId: r.polar_subscription_id,
    customerId: r.customer_id,
    scope: r.scope as Scope,
    cap: Number(r.cap),
    status: "active" as const,
    currentPeriodEnd: Number(r.current_period_end),
  }));
}

export async function listActiveDomains(sql: Sql): Promise<Domain[]> {
  const rows = await sql`
    SELECT customer_id, domain, scope, created_at
    FROM domains WHERE status = 'active'`;
  return rows.map((r) => ({
    customerId: r.customer_id,
    domain: r.domain,
    scope: r.scope as Scope,
    status: "active" as const,
    createdAt: Number(r.created_at),
  }));
}

// Idempotent on the provider subscription id (mirrors the v1 store contract).
export async function upsertPlan(sql: Sql, p: Plan, now: number): Promise<void> {
  await sql`
    INSERT INTO plans
      (polar_subscription_id, customer_id, scope, cap, status, current_period_end, created_at, updated_at)
    VALUES
      (${p.polarSubscriptionId}, ${p.customerId}, ${p.scope}, ${p.cap}, ${p.status}, ${p.currentPeriodEnd}, ${now}, ${now})
    ON CONFLICT (polar_subscription_id) DO UPDATE SET
      customer_id        = EXCLUDED.customer_id,
      scope              = EXCLUDED.scope,
      cap                = EXCLUDED.cap,
      status             = EXCLUDED.status,
      current_period_end = EXCLUDED.current_period_end,
      updated_at         = EXCLUDED.updated_at`;
}

// Idempotent on (customer_id, domain); created_at is preserved across updates so
// the cap's oldest-first ordering stays stable.
export async function upsertDomain(sql: Sql, d: Domain, now: number): Promise<void> {
  await sql`
    INSERT INTO domains (customer_id, domain, scope, status, created_at, updated_at)
    VALUES (${d.customerId}, ${d.domain}, ${d.scope}, ${d.status}, ${d.createdAt}, ${now})
    ON CONFLICT (customer_id, domain) DO UPDATE SET
      scope      = EXCLUDED.scope,
      status     = EXCLUDED.status,
      updated_at = EXCLUDED.updated_at`;
}

// A Plan's owner + scope, read before a revoke so teardown knows which Customer's
// Domains (in which Scope) own the certs to delete. Undefined when no row exists.
export async function getPlan(
  sql: Sql,
  polarSubscriptionId: string,
): Promise<{ customerId: string; scope: Scope; status: "active" | "inactive" } | undefined> {
  const rows = await sql`
    SELECT customer_id, scope, status FROM plans WHERE polar_subscription_id = ${polarSubscriptionId}`;
  const r = rows[0];
  return r ? { customerId: r.customer_id, scope: r.scope as Scope, status: r.status as "active" | "inactive" } : undefined;
}

// Mark a Plan inactive on revoke. Idempotent: re-revoking an already-inactive row
// is a harmless no-op. Returns true if a row was matched. The Customer's Domain
// rows are intentionally LEFT active — the now-inactive Plan denies authorization
// (entitledDomains needs an active Plan), and a re-subscribe reactivates the
// Domains within the new cap with no extra work.
export async function markPlanInactive(sql: Sql, polarSubscriptionId: string, now: number): Promise<boolean> {
  const rows = await sql`
    UPDATE plans SET status = 'inactive', updated_at = ${now}
    WHERE polar_subscription_id = ${polarSubscriptionId}
    RETURNING polar_subscription_id`;
  return rows.length > 0;
}

// A Customer's active Domains in one Scope — the set whose certs a revoke of that
// Scope's Plan must tear down (#5). Returns the normalized domain strings.
export async function listCustomerDomainsInScope(
  sql: Sql,
  customerId: string,
  scope: Scope,
): Promise<string[]> {
  const rows = await sql`
    SELECT domain FROM domains
    WHERE customer_id = ${customerId} AND scope = ${scope} AND status = 'active'`;
  return rows.map((r) => r.domain as string);
}

// Demo seeding (v2). Spec: plan blocks separated by ";", each
//   "customerId|scope|cap|domain,domain,…"
// e.g. "c1|single|2|a.test,b.test,c.test;c1|whole-domain|1|acme.test".
// Domains in a block get strictly increasing createdAt so the cap's oldest-first
// ordering is deterministic (with cap 2, the 3rd listed domain is denied). Used
// only for local demos before real Plans arrive via the Phase 9 webhook.
export async function seedPlans(
  sql: Sql,
  spec: string,
  now: number,
): Promise<{ plans: number; domains: number }> {
  let plans = 0;
  let domains = 0;
  for (const block of spec.split(";").map((s) => s.trim()).filter(Boolean)) {
    const [customerId, rawScope, rawCap, domainsCsv] = block.split("|").map((s) => s.trim());
    if (!customerId || !rawScope) continue;
    const scope: Scope = rawScope === "whole-domain" ? "whole-domain" : "single";
    const cap = Number(rawCap) || 0;
    await upsertPlan(sql, {
      polarSubscriptionId: `seed:${customerId}:${scope}`,
      customerId,
      scope,
      cap,
      status: "active",
      currentPeriodEnd: now + 365 * 24 * 60 * 60 * 1000,
    }, now);
    plans++;
    const list = (domainsCsv ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    for (let i = 0; i < list.length; i++) {
      const domain = normalizeDomain(list[i]);
      if (!domain) continue;
      await upsertDomain(sql, { customerId, domain, scope, status: "active", createdAt: now + i }, now);
      domains++;
    }
  }
  return { plans, domains };
}
