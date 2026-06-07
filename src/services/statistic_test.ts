// Integration tests for the Redis-backed usage statistics. GATED on
// TEST_REDIS_URL (skipped without it). To run:
//
//   docker run -d --rm --name rc-test-redis -p 6399:6379 redis:7-alpine
//   TEST_REDIS_URL=redis://localhost:6399 \
//     deno test --allow-env --allow-read --allow-net src/services/statistic_test.ts
//   docker rm -f rc-test-redis

import { assertEquals } from "@std/assert";
import { connect } from "@db/redis";
import { StatisticService } from "./statistic.ts";

const REDIS_URL = Deno.env.get("TEST_REDIS_URL");
const DOMAINS_KEY = "stat:domains";

function redisOpts(url: string) {
  const u = new URL(url);
  return { hostname: u.hostname, port: Number(u.port) || 6379 };
}
async function probe(url: string): Promise<boolean> {
  try {
    const r = await connect(redisOpts(url));
    await r.ping();
    r.close();
    return true;
  } catch {
    return false;
  }
}
const redisReady = REDIS_URL ? await probe(REDIS_URL) : false;

const DAY_MS = 24 * 60 * 60 * 1000;

Deno.test({
  name: "statistic (Redis-backed usage counts)",
  ignore: !redisReady,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    const svc = new StatisticService();
    await svc.init(REDIS_URL!);
    const r = await connect(redisOpts(REDIS_URL!)); // for seeding/cleanup
    try {
      await r.del(DOMAINS_KEY);

      // WHY: with nothing recorded, the homepage shows zeros (not errors).
      await t.step("empty store reports zeros", async () => {
        assertEquals(await svc.overview(), {
          periodDomains: 0,
          everDomains: 0,
        });
      });

      // WHY: counts are by REGISTRABLE domain — many hosts of one domain collapse
      // to a single entry (that's what the homepage number means).
      await t.step(
        "counts collapse hosts to their registrable domain",
        async () => {
          await svc.write("a.example.com");
          await svc.write("b.example.com"); // same registrable domain
          await svc.write("other.org");
          const o = await svc.overview();
          assertEquals(o.everDomains, 2); // example.com + other.org
          assertEquals(o.periodDomains, 2); // both seen just now
        },
      );

      // WHY: periodDomains is a rolling 24h window — an old hit still counts toward
      // the all-time total but not the "last 24h" figure.
      await t.step("periodDomains is a 24h window", async () => {
        await r.zadd(DOMAINS_KEY, Date.now() - 2 * DAY_MS, "ancient.test");
        const o = await svc.overview();
        assertEquals(o.everDomains, 3); // + ancient.test
        assertEquals(o.periodDomains, 2); // ancient.test excluded from 24h
      });
    } finally {
      await r.del(DOMAINS_KEY);
      r.close();
      svc.close();
    }
  },
});
