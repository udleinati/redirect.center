// Integration tests for the durable store. They need a real Postgres, so they are
// GATED on TEST_DATABASE_URL and skipped (ignored) when it is unset — the normal
// `deno task test` run stays green without a database. To run them:
//
//   docker run -d --rm --name rc-test-pg -e POSTGRES_USER=test \
//     -e POSTGRES_PASSWORD=test -e POSTGRES_DB=test -p 55432:5432 postgres:16-alpine
//   TEST_DATABASE_URL=postgres://test:test@localhost:55432/test \
//     deno test --allow-env --allow-read --allow-net src/services/paid-store_test.ts
//   docker rm -f rc-test-pg

import { assert, assertEquals } from "@std/assert";
import { createDb, type Sql } from "./db.ts";
import {
  getActivePlanCap,
  getPlan,
  listCustomerDomainsInScope,
  markPlanInactive,
  migrate,
  removeDomain,
  seedPlans,
  upsertDomain,
  upsertPlan,
} from "./paid-store.ts";
import type { Domain, Plan } from "./authorization.ts";

const DB_URL = Deno.env.get("TEST_DATABASE_URL");

// Probe with a throwaway connection so a missing/unreachable DB just skips the
// suite (and leaves no dangling pool) instead of failing it.
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
if (DB_URL && !dbReady) {
  console.warn(
    "[paid-store_test] TEST_DATABASE_URL set but unreachable — skipping",
  );
}

const DAY = 24 * 60 * 60 * 1000;

Deno.test({
  name: "paid-store (Postgres integration)",
  ignore: !dbReady,
  // External connection pool; we end() it in finally, but keep the sanitizers
  // lenient so a benign lingering socket can't flake the integration run.
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    const sql: Sql = createDb(DB_URL!);
    const now = Date.now();
    const plan = (o: Partial<Plan>): Plan => ({
      polarSubscriptionId: "pst:sub",
      customerId: "pst:c",
      scope: "single",
      cap: 1,
      status: "active",
      currentPeriodEnd: now + DAY,
      ...o,
    });
    const dom = (o: Partial<Domain>): Domain => ({
      customerId: "pst:c",
      domain: "x.test",
      scope: "single",
      status: "active",
      createdAt: now,
      ...o,
    });
    // Every test row is namespaced under the "pst:" customer prefix so we can wipe
    // a clean slate before and after without touching anything else.
    const wipe = async () => {
      await sql`DELETE FROM domains WHERE customer_id LIKE 'pst:%'`;
      await sql`DELETE FROM plans   WHERE customer_id LIKE 'pst:%'`;
    };

    try {
      await migrate(sql); // idempotent
      await wipe();

      // WHY: with no Plan, the customer is entitled to nothing — the cap must read
      // 0 (the dashboard "used / cap" and the add-capacity check depend on it).
      await t.step("getActivePlanCap is 0 with no plan", async () => {
        assertEquals(await getActivePlanCap(sql, "pst:c", "single", now), 0);
      });

      // WHY: the cap drives entitlement, and an upgrade re-upserts the SAME
      // subscription id — it must replace the cap, never create a duplicate Plan.
      await t.step(
        "upsertPlan sets the cap and upgrades in place",
        async () => {
          await upsertPlan(sql, plan({ cap: 2 }), now);
          assertEquals(await getActivePlanCap(sql, "pst:c", "single", now), 2);
          await upsertPlan(sql, plan({ cap: 5 }), now); // same sub id, higher tier
          assertEquals(await getActivePlanCap(sql, "pst:c", "single", now), 5);
        },
      );

      // WHY: an expired Plan must not entitle — the cap query excludes
      // current_period_end <= now, so a lapsed subscription reads 0.
      await t.step("getActivePlanCap ignores an expired plan", async () => {
        await wipe();
        await upsertPlan(
          sql,
          plan({ cap: 3, currentPeriodEnd: now - 1 }),
          now,
        );
        assertEquals(await getActivePlanCap(sql, "pst:c", "single", now), 0);
      });

      // WHY: scopes are independent ladders — a single-scope Plan must not leak its
      // cap into the whole-domain scope.
      await t.step("getActivePlanCap is scoped", async () => {
        await wipe();
        await upsertPlan(sql, plan({ cap: 4, scope: "single" }), now);
        assertEquals(await getActivePlanCap(sql, "pst:c", "single", now), 4);
        assertEquals(
          await getActivePlanCap(sql, "pst:c", "whole-domain", now),
          0,
        );
      });

      // WHY: the cap's oldest-first slice depends on a stable order — domains must
      // come back ordered by created_at, and an update must NOT reset created_at.
      await t.step(
        "listCustomerDomainsInScope is oldest-first and update-stable",
        async () => {
          await wipe();
          await upsertDomain(
            sql,
            dom({ domain: "b.test", createdAt: now + 200 }),
            now,
          );
          await upsertDomain(
            sql,
            dom({ domain: "a.test", createdAt: now + 100 }),
            now,
          );
          assertEquals(
            await listCustomerDomainsInScope(sql, "pst:c", "single"),
            ["a.test", "b.test"],
          );
          // Re-upsert a.test with a LATER createdAt — order must not change.
          await upsertDomain(
            sql,
            dom({ domain: "a.test", createdAt: now + 999 }),
            now + 5,
          );
          assertEquals(
            await listCustomerDomainsInScope(sql, "pst:c", "single"),
            ["a.test", "b.test"],
          );
        },
      );

      // WHY: removing a Domain must deactivate it (drop from the list) and return
      // its scope so the caller tears down the right certs; a second remove is a
      // harmless no-op (idempotent).
      await t.step(
        "removeDomain deactivates, returns scope, is idempotent",
        async () => {
          await wipe();
          await upsertDomain(
            sql,
            dom({ domain: "gone.test", scope: "single" }),
            now,
          );
          const removed = await removeDomain(
            sql,
            "pst:c",
            "gone.test",
            now + 1,
          );
          assertEquals(removed, { scope: "single" });
          assertEquals(
            await listCustomerDomainsInScope(sql, "pst:c", "single"),
            [],
          );
          assertEquals(
            await removeDomain(sql, "pst:c", "gone.test", now + 2),
            undefined,
          );
        },
      );

      // WHY: a revoke marks the Plan inactive (entitlement stops → cap 0) and reads
      // back via getPlan for teardown. The contract: markPlanInactive returns true
      // while a row with that id exists (so re-revoking is a harmless no-op that
      // still reports "matched"), and false ONLY for an unknown subscription.
      await t.step(
        "markPlanInactive stops entitlement and getPlan reflects it",
        async () => {
          await wipe();
          await upsertPlan(sql, plan({ cap: 2 }), now);
          assertEquals((await getPlan(sql, "pst:sub"))?.status, "active");
          assertEquals(await markPlanInactive(sql, "pst:sub", now + 1), true);
          assertEquals(await getActivePlanCap(sql, "pst:c", "single", now), 0);
          assertEquals((await getPlan(sql, "pst:sub"))?.status, "inactive");
          // Re-revoke: the row still exists, so it still matches (and stays inactive).
          assertEquals(await markPlanInactive(sql, "pst:sub", now + 2), true);
          assertEquals((await getPlan(sql, "pst:sub"))?.status, "inactive");
          // Unknown subscription matches nothing.
          assertEquals(await markPlanInactive(sql, "pst:nope", now + 3), false);
        },
      );

      // WHY: getPlan is undefined for an unknown subscription (callers branch on it).
      await t.step(
        "getPlan returns undefined for an unknown subscription",
        async () => {
          assertEquals(await getPlan(sql, "pst:does-not-exist"), undefined);
        },
      );

      // WHY: demo seeding must produce a usable Plan + Domains with deterministic
      // oldest-first ordering (so a cap of 2 denies the 3rd listed domain).
      await t.step(
        "seedPlans parses a block into a plan and ordered domains",
        async () => {
          await wipe();
          const res = await seedPlans(
            sql,
            "pst:seed|single|2|a.test,b.test,c.test",
            now,
          );
          assertEquals(res, { plans: 1, domains: 3 });
          assertEquals(
            await getActivePlanCap(sql, "pst:seed", "single", now),
            2,
          );
          assertEquals(
            await listCustomerDomainsInScope(sql, "pst:seed", "single"),
            ["a.test", "b.test", "c.test"],
          );
        },
      );
    } finally {
      await wipe();
      await sql.end({ timeout: 5 });
    }
  },
});

// Make the import set explicit even when the suite is skipped (keeps the symbol
// referenced so a rename can't silently rot this file).
assert(typeof migrate === "function");
