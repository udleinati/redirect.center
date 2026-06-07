// Integration test for the in-process authorization cache: it must load the
// active Plans + Domains from Postgres on refresh() and answer authorize() from
// that snapshot. GATED on TEST_DATABASE_URL (skipped without it). To run:
//
//   docker run -d --rm --name rc-test-pg -e POSTGRES_USER=test \
//     -e POSTGRES_PASSWORD=test -e POSTGRES_DB=test -p 55432:5432 postgres:16-alpine
//   TEST_DATABASE_URL=postgres://test:test@localhost:55432/test \
//     deno test --allow-env --allow-read --allow-net src/services/authz-cache_test.ts
//   docker rm -f rc-test-pg

import { assert, assertFalse } from "@std/assert";
import { createDb } from "./db.ts";
import { AuthzCache } from "./authz-cache.ts";
import { migrate, upsertDomain, upsertPlan } from "./paid-store.ts";

const DB_URL = Deno.env.get("TEST_DATABASE_URL");

async function probe(url: string): Promise<boolean> {
  const s = createDb(url);
  try {
    await s`SELECT 1`;
    return true;
  } catch {
    return false;
  } finally {
    await s.end({ timeout: 5 }).catch(() => {});
  }
}
const dbReady = DB_URL ? await probe(DB_URL) : false;

const DAY = 24 * 60 * 60 * 1000;

Deno.test({
  name: "authz-cache (DB snapshot for the hot path)",
  ignore: !dbReady,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    const sql = createDb(DB_URL!);
    const now = Date.now();
    const C = "azc"; // all test rows namespaced under this customer
    const wipe = async () => {
      await sql`DELETE FROM domains WHERE customer_id = ${C}`;
      await sql`DELETE FROM plans   WHERE customer_id = ${C}`;
    };

    try {
      await migrate(sql);
      await wipe();

      // Seed an active single-host Plan + Domain.
      await upsertPlan(sql, {
        polarSubscriptionId: "azc:single",
        customerId: C,
        scope: "single",
        cap: 1,
        status: "active",
        currentPeriodEnd: now + DAY,
      }, now);
      await upsertDomain(sql, {
        customerId: C,
        domain: "app.azc-test.com",
        scope: "single",
        status: "active",
        createdAt: now,
      }, now);

      const cache = new AuthzCache(sql);

      // WHY: after refresh, the cache must authorize exactly what the DB entitles —
      // the seeded host yes, an unrelated host no.
      await t.step("authorize reflects the DB after refresh", async () => {
        await cache.refresh();
        assert(cache.authorize("app.azc-test.com", now));
        assertFalse(cache.authorize("nope.azc-test.com", now));
      });

      // WHY: counts expose the loaded snapshot size (used in the boot log).
      await t.step("counts report the loaded snapshot", () => {
        assert(cache.counts.plans >= 1);
        assert(cache.counts.domains >= 1);
      });

      // WHY: the cache is a snapshot — a DB change is invisible until the next
      // refresh (this staleness is the whole point: no per-handshake DB hit). A
      // whole-domain Plan also proves subdomain coverage flows through the cache.
      await t.step(
        "a new Plan is invisible until the next refresh",
        async () => {
          await upsertPlan(sql, {
            polarSubscriptionId: "azc:whole",
            customerId: C,
            scope: "whole-domain",
            cap: 1,
            status: "active",
            currentPeriodEnd: now + DAY,
          }, now);
          await upsertDomain(sql, {
            customerId: C,
            domain: "azc-whole.com",
            scope: "whole-domain",
            status: "active",
            createdAt: now,
          }, now);

          assertFalse(cache.authorize("sub.azc-whole.com", now)); // stale snapshot
          await cache.refresh();
          assert(cache.authorize("sub.azc-whole.com", now)); // whole-domain covers it
        },
      );
    } finally {
      await wipe();
      await sql.end({ timeout: 5 });
    }
  },
});
