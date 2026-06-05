// In-process SQLite store for paid subscriptions.
//
// This is a DISPOSABLE CACHE — Polar is the source of truth (Phase 6 rebuilds
// it via reconciliation). It exists so /tls-check can answer synchronously
// without a provider round-trip during a TLS handshake.

import { DatabaseSync } from "node:sqlite";
import { normalizeDomain, type Scope, type Subscription } from "./authorization.ts";

interface Row {
  polar_subscription_id: string;
  domain: string;
  scope: string;
  status: string;
  current_period_end: number;
  created_at: number;
  updated_at: number;
}

export class SubscriptionStore {
  #db: DatabaseSync;

  // `path` may be ":memory:" (tests) or a file (needs --allow-read/--allow-write).
  constructor(path: string) {
    this.#db = new DatabaseSync(path);
    this.#db.exec(
      `CREATE TABLE IF NOT EXISTS subscriptions (
         polar_subscription_id TEXT    PRIMARY KEY,
         domain                TEXT    NOT NULL,
         scope                 TEXT    NOT NULL CHECK (scope IN ('single','whole-domain')),
         status                TEXT    NOT NULL CHECK (status IN ('active','inactive')),
         current_period_end    INTEGER NOT NULL,
         created_at            INTEGER NOT NULL,
         updated_at            INTEGER NOT NULL
       );
       CREATE INDEX IF NOT EXISTS idx_subscriptions_domain ON subscriptions (domain);`,
    );
  }

  // Idempotent on polar_subscription_id; re-applying the same event is a no-op
  // beyond refreshing mutable fields. created_at is preserved across updates.
  upsert(sub: Subscription): void {
    this.#db
      .prepare(
        `INSERT INTO subscriptions
           (polar_subscription_id, domain, scope, status, current_period_end, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(polar_subscription_id) DO UPDATE SET
           domain             = excluded.domain,
           scope              = excluded.scope,
           status             = excluded.status,
           current_period_end = excluded.current_period_end,
           updated_at         = excluded.updated_at`,
      )
      .run(
        sub.polarSubscriptionId,
        sub.domain,
        sub.scope,
        sub.status,
        sub.currentPeriodEnd,
        sub.createdAt,
        sub.updatedAt,
      );
  }

  // Active, unexpired subscriptions — the candidate set for an authorization
  // check. The pure matcher re-validates status/period defensively.
  listActive(now: number): Subscription[] {
    const rows = this.#db
      .prepare(`SELECT * FROM subscriptions WHERE status = 'active' AND current_period_end > ?`)
      .all(now) as unknown as Row[];
    return rows.map(toSubscription);
  }

  // Mark a subscription inactive on revoke (Phase 4). Idempotent: re-revoking an
  // already-inactive row is a harmless no-op. Returns true if a row was matched.
  markInactive(polarSubscriptionId: string, updatedAt: number): boolean {
    const res = this.#db
      .prepare(`UPDATE subscriptions SET status = 'inactive', updated_at = ? WHERE polar_subscription_id = ?`)
      .run(updatedAt, polarSubscriptionId);
    return res.changes > 0;
  }

  get(polarSubscriptionId: string): Subscription | undefined {
    const row = this.#db
      .prepare(`SELECT * FROM subscriptions WHERE polar_subscription_id = ?`)
      .get(polarSubscriptionId) as unknown as Row | undefined;
    return row ? toSubscription(row) : undefined;
  }

  close(): void {
    this.#db.close();
  }
}

function toSubscription(row: Row): Subscription {
  return {
    polarSubscriptionId: row.polar_subscription_id,
    domain: row.domain,
    scope: row.scope as Scope,
    status: row.status as "active" | "inactive",
    currentPeriodEnd: Number(row.current_period_end),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

// Demo seeding: parse "domain:scope,domain:scope" (scope defaults to single)
// and upsert each as an active subscription valid for one year. Returns the
// number seeded. Used only for manual demos before Polar webhooks exist.
export function seedFromSpec(store: SubscriptionStore, spec: string, now: number): number {
  let count = 0;
  for (const entry of spec.split(",")) {
    const [rawDomain, rawScope] = entry.split(":").map((s) => s.trim());
    if (!rawDomain) continue;
    const scope: Scope = rawScope === "whole-domain" ? "whole-domain" : "single";
    const domain = normalizeDomain(rawDomain);
    if (!domain) continue;
    store.upsert({
      polarSubscriptionId: `seed:${domain}:${scope}`,
      domain,
      scope,
      status: "active",
      currentPeriodEnd: now + 365 * 24 * 60 * 60 * 1000,
      createdAt: now,
      updatedAt: now,
    });
    count++;
  }
  return count;
}
