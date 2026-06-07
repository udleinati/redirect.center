// Integration tests for the Postgres-backed guardian denylist. GATED on
// TEST_DATABASE_URL (skipped without it), like paid-store_test.ts. To run:
//
//   docker run -d --rm --name rc-test-pg -e POSTGRES_USER=test \
//     -e POSTGRES_PASSWORD=test -e POSTGRES_DB=test -p 55432:5432 postgres:16-alpine
//   TEST_DATABASE_URL=postgres://test:test@localhost:55432/test \
//     deno test --allow-env --allow-read --allow-net src/services/guardian_test.ts
//   docker rm -f rc-test-pg

import { assert, assertFalse } from "@std/assert";
import { createDb } from "./db.ts";
import { GuardianService } from "./guardian.ts";

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

Deno.test({
  name: "guardian (Postgres-backed denylist)",
  ignore: !dbReady,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    const sql = createDb(DB_URL!);
    const g = new GuardianService();
    try {
      await g.init(sql); // migrate + initial load + 60s timer
      g.stop(); // we drive reload() manually in the test
      await sql`DELETE FROM deny_fqdn`;
      await g.reload();

      // WHY: an empty denylist must block nothing — the default is to allow.
      await t.step("empty denylist allows everything", () => {
        assertFalse(g.isDenied("anything.com"));
      });

      // WHY: the in-memory mirror only changes on reload; a fresh row is invisible
      // until the next refresh (this is the 60s-staleness contract, made explicit).
      await t.step("a new row takes effect only after reload", async () => {
        await sql`INSERT INTO deny_fqdn (fqdn) VALUES ('blocked.com')`;
        assertFalse(g.isDenied("blocked.com")); // not reloaded yet
        await g.reload();
        assert(g.isDenied("blocked.com"));
      });

      // WHY: denying a registrable domain must also block its subdomains, or abuse
      // just hops to a subdomain.
      await t.step("a base domain blocks its subdomains", async () => {
        await sql`INSERT INTO deny_fqdn (fqdn) VALUES ('evil.com')`;
        await g.reload();
        assert(g.isDenied("evil.com"));
        assert(g.isDenied("sub.evil.com"));
        assertFalse(g.isDenied("good.com"));
      });

      // WHY: removing a row and reloading lifts the block (denylist is editable
      // live, within the refresh window).
      await t.step("removing a row lifts the block after reload", async () => {
        await sql`DELETE FROM deny_fqdn WHERE fqdn = 'blocked.com'`;
        await g.reload();
        assertFalse(g.isDenied("blocked.com"));
        assert(g.isDenied("sub.evil.com")); // unrelated entry still blocked
      });
    } finally {
      await sql`DELETE FROM deny_fqdn`;
      await sql.end({ timeout: 5 });
    }
  },
});
