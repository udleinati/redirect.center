// Denylist of blocked FQDNs, held in Postgres and mirrored into memory so the
// redirect hot path stays an O(1) Set lookup (no per-request DB round-trip). The
// in-memory copy is refreshed every 60s, so edits to the `deny_fqdn` table take
// effect within a minute without a restart. Resilient: a DB error leaves the
// current set in place (redirects keep flowing) rather than throwing.

import { parse } from "psl";
import type { Sql } from "./db.ts";
import { logger } from "../helpers/logger.ts";

const RELOAD_MS = 60 * 1000;

export class GuardianService {
  #sql?: Sql;
  #denySet = new Set<string>();
  #timer?: ReturnType<typeof setInterval>;

  // Wire the DB, create the table, load the denylist, and start the 60s refresh.
  // Called once at boot; safe to skip (e.g. in tests) by calling reload() directly.
  async init(sql: Sql): Promise<void> {
    this.#sql = sql;
    try {
      await this.migrate();
      await this.reload();
    } catch (e) {
      logger.error(
        `[guardian] init failed (denylist empty, will retry in 60s): ${e}`,
      );
    }
    const timer = setInterval(() => {
      this.reload().catch((e) =>
        logger.error(`[guardian] periodic reload failed: ${e}`)
      );
    }, RELOAD_MS);
    this.#timer = timer;
    Deno.unrefTimer(timer);
  }

  async migrate(): Promise<void> {
    if (!this.#sql) return;
    await this
      .#sql`CREATE TABLE IF NOT EXISTS deny_fqdn (fqdn text PRIMARY KEY)`;
  }

  // O(1) check against the in-memory set: the exact FQDN, plus its registrable base
  // domain (so denying example.com also blocks sub.example.com).
  isDenied(fqdn: string): boolean {
    if (this.#denySet.has(fqdn)) return true;
    const parts = fqdn.split(".");
    if (parts.length > 2) {
      const baseDomain = parts.slice(-2).join(".");
      if (this.#denySet.has(baseDomain)) return true;
    }
    return false;
  }

  // Rebuild the in-memory set from the table. Each entry is pre-expanded into its
  // psl base domain too, so isDenied stays a pure Set lookup.
  async reload(): Promise<void> {
    if (!this.#sql) return;
    try {
      const rows = await this.#sql`SELECT fqdn FROM deny_fqdn`;
      const next = new Set<string>();
      for (const row of rows) {
        const fqdn = String(row.fqdn);
        next.add(fqdn);
        const parsed = parse(fqdn);
        if ("domain" in parsed && parsed.domain) next.add(parsed.domain);
      }
      this.#denySet = next;
      logger.debug(`[guardian] loaded ${this.#denySet.size} deny entries`);
    } catch (err) {
      logger.error(`[guardian] reload failed (keeping current set): ${err}`);
    }
  }

  // Stop the refresh timer (tests / shutdown).
  stop(): void {
    if (this.#timer !== undefined) clearInterval(this.#timer);
  }
}

export const guardian = new GuardianService();
