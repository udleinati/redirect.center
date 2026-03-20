import { parseDomain } from "parse-domain";
import { logger } from "../helpers/logger.ts";

interface Statistic {
  count: number;
  firstTime?: string;
  lastTime?: string;
}

interface StatisticOverview {
  periodDomains: number;
  everDomains: number;
}

class StatisticService {
  private kv!: Deno.Kv;
  private ready: Promise<void>;

  constructor() {
    this.ready = this.init();
  }

  private async init(): Promise<void> {
    this.kv = await Deno.openKv();
    await this.kv.set(["meta", "started"], new Date().toISOString());
  }

  async ensureReady(): Promise<void> {
    await this.ready;
  }

  async write(host: string): Promise<void> {
    await this.ensureReady();
    logger.debug(`[statistic] write received host ${host}`);

    const parsedHost = parseDomain(host) as {
      domain: string;
      topLevelDomains: string[];
    };

    const domain =
      `${parsedHost.domain}.${parsedHost.topLevelDomains.join(".")}`.toLowerCase();
    await this.entryDomain(domain);
  }

  private async entryDomain(domain: string): Promise<void> {
    const key = ["domain", domain];
    const existing = await this.kv.get<Statistic>(key);

    const entry: Statistic = existing.value ?? {
      count: 0,
      firstTime: new Date().toISOString(),
    };

    entry.count += 1;
    entry.lastTime = new Date().toISOString();

    await this.kv.set(key, entry);
    logger.debug(
      `[statistic] entryDomain key ${domain}, entry: ${JSON.stringify(entry)}`,
    );
  }

  async overview(): Promise<StatisticOverview> {
    await this.ensureReady();

    const dayBefore = new Date();
    dayBefore.setDate(dayBefore.getDate() - 1);
    const dayBeforeISO = dayBefore.toISOString();

    let periodDomains = 0;
    let everDomains = 0;

    const iter = this.kv.list<Statistic>({ prefix: ["domain"] });
    for await (const entry of iter) {
      everDomains++;
      if (entry.value.lastTime && entry.value.lastTime >= dayBeforeISO) {
        periodDomains++;
      }
    }

    return { periodDomains, everDomains };
  }
}

export const statistic = new StatisticService();
