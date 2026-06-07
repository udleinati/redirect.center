// Usage statistics in Redis. Each redirect records the registrable domain in a
// sorted set scored by last-seen time (epoch ms), so the homepage can show:
//   • everDomains   — distinct domains ever seen        (ZCARD)
//   • periodDomains — distinct domains seen in last 24h  (ZCOUNT now-24h .. +inf)
// Writes are fire-and-forget off the redirect hot path; if Redis is down the
// service degrades to zeros and never throws into a redirect.

import { connect, type Redis } from "@db/redis";
import { parseDomain, ParseResultType } from "parse-domain";
import { config } from "../config.ts";
import { logger } from "../helpers/logger.ts";

const DOMAINS_KEY = "stat:domains";
const DAY_MS = 24 * 60 * 60 * 1000;

export interface StatisticOverview {
  periodDomains: number;
  everDomains: number;
}

// The registrable domain of a host (a.b.example.com -> example.com), or null for
// an unlistable host. Counting by registrable domain matches the old behavior.
function registrableDomain(host: string): string | null {
  const r = parseDomain(host);
  if (r.type === ParseResultType.Listed && r.domain) {
    return `${r.domain}.${r.topLevelDomains.join(".")}`.toLowerCase();
  }
  return null;
}

export class StatisticService {
  #redis?: Redis;

  // Connect once at boot. Resilient: a failed connection leaves stats disabled
  // (zeros) rather than breaking startup or redirects. `redisUrl` is injectable
  // for tests; production passes none and uses the configured URL.
  async init(redisUrl: string = config.redisUrl): Promise<void> {
    try {
      const u = new URL(redisUrl);
      const port = Number(u.port) || 6379;
      this.#redis = await connect({
        hostname: u.hostname,
        port,
        ...(u.password ? { password: u.password } : {}),
      });
      logger.info(`[statistic] connected to redis at ${u.hostname}:${port}`);
    } catch (e) {
      logger.error(
        `[statistic] redis connect failed (stats disabled): ${
          e instanceof Error ? e.message : e
        }`,
      );
    }
  }

  // Record one hit for a host's registrable domain. Returns a promise so tests can
  // await it, but the redirect path never awaits (fire-and-forget); the internal
  // catch means it never rejects, so a Redis blip can't fail a redirect.
  write(host: string): Promise<void> {
    if (!this.#redis) return Promise.resolve();
    const domain = registrableDomain(host);
    if (!domain) return Promise.resolve();
    return this.#redis.zadd(DOMAINS_KEY, Date.now(), domain)
      .then(() => {})
      .catch((e) => {
        logger.error(
          `[statistic] zadd failed: ${e instanceof Error ? e.message : e}`,
        );
      });
  }

  // Close the connection (tests / graceful shutdown).
  close(): void {
    this.#redis?.close();
  }

  async overview(): Promise<StatisticOverview> {
    if (!this.#redis) return { periodDomains: 0, everDomains: 0 };
    try {
      const [ever, period] = await Promise.all([
        this.#redis.zcard(DOMAINS_KEY),
        // Scores are epoch-ms timestamps, always well under MAX_SAFE_INTEGER, so
        // that upper bound is effectively +inf for "seen in the last 24h".
        this.#redis.zcount(
          DOMAINS_KEY,
          Date.now() - DAY_MS,
          Number.MAX_SAFE_INTEGER,
        ),
      ]);
      return { periodDomains: Number(period), everDomains: Number(ever) };
    } catch (e) {
      logger.error(
        `[statistic] overview failed: ${e instanceof Error ? e.message : e}`,
      );
      return { periodDomains: 0, everDomains: 0 };
    }
  }
}

export const statistic = new StatisticService();
