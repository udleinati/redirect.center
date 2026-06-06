// In-process snapshot of active Plans + Domains so `/tls-check` answers on the TLS
// handshake hot path WITHOUT a per-request database round-trip (ADR-0002): a DB
// blip must not stall or fail handshakes for already-known domains. Refreshed at
// boot and after any write that changes authorization (seed, webhook, dashboard,
// reconcile). The decision itself is the pure `authorizeHost`.

import { authorizeHost, type Domain, type Plan } from "./authorization.ts";
import type { Sql } from "./db.ts";
import { listActiveDomains, listActivePlans } from "./paid-store.ts";

export class AuthzCache {
  #plans: readonly Plan[] = [];
  #domains: readonly Domain[] = [];
  readonly #sql: Sql;

  constructor(sql: Sql) {
    this.#sql = sql;
  }

  async refresh(): Promise<void> {
    const [plans, domains] = await Promise.all([
      listActivePlans(this.#sql),
      listActiveDomains(this.#sql),
    ]);
    this.#plans = plans;
    this.#domains = domains;
  }

  // Hot path: pure, synchronous, no I/O.
  authorize(host: string, now: number): boolean {
    return authorizeHost(host, this.#plans, this.#domains, now);
  }

  get counts(): { plans: number; domains: number } {
    return { plans: this.#plans.length, domains: this.#domains.length };
  }
}
