import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { JsonDB } from 'node-json-db';
import { Config } from 'node-json-db/dist/lib/JsonDBConfig';
import { parseDomain, Validation } from 'parse-domain';

interface Statistic {
  count: number;
  firstTime?: string;
  lastTime?: string;
  domain?: string;
}

@Injectable()
export class StatisticService {
  public db = new JsonDB(new Config('db/statistic', false, false, '/'));

  constructor(@InjectPinoLogger(StatisticService.name) private readonly logger: PinoLogger) {
    this.db.push('/started', new Date().toISOString(), true);
    const interval = 60 * 1000;

    setInterval(() => {
      this.db.save();
      this.logger.debug(`db.save - interval ${interval}`);
    }, interval).unref();
  }

  write(host: string): void {
    this.logger.debug(`write received host ${host}`);
    const parsedHost = parseDomain(host, { validation: Validation.Lax }) as any;
    // this.entryHost(host, parsedHost); The file is getting to big. Considere changing to sqlite.
    this.entryDomain(parsedHost);
  }

  entryHost(host: string, parsedHost: any) {
    let entry: Statistic = { count: 0 };
    const key = `/host/${host}`.toLowerCase();

    try {
      entry = this.db.getData(key) as Statistic;
    } catch (e) {
      entry.firstTime = new Date().toISOString();
      entry.domain = `${parsedHost.domain}.${parsedHost.topLevelDomains.join('.')}`.toLowerCase();
    }

    entry.count += 1;
    entry.lastTime = new Date().toISOString();
    this.db.push(key, entry, true);
    this.logger.debug(`entryHost key ${key}, entry: ${JSON.stringify(entry)}`);

    return entry;
  }

  entryDomain(parsedHost: any): Statistic {
    let entry: Statistic = { count: 0 };
    const domain = `${parsedHost.domain}.${parsedHost.topLevelDomains.join('.')}`.toLowerCase();
    const key = `/domain/${domain}`;

    try {
      entry = this.db.getData(key) as Statistic;
    } catch (e) {
      entry.firstTime = new Date().toISOString();
    }

    entry.count += 1;
    entry.lastTime = new Date().toISOString();
    this.db.push(key, entry, true);
    this.logger.debug(`entryDomain key ${key}, entry: ${JSON.stringify(entry)}`);

    return entry;
  }

  overview() {
    const dayBefore = new Date();
    dayBefore.setDate(dayBefore.getDate() - 1);
    let domains = {};

    try {
      domains = this.db.getData('/domain');
    } catch (e) {}

    return {
      periodDomains: Object.keys(domains).filter(e => domains[e].lastTime >= dayBefore.toISOString()).length,
      everDomains: Object.keys(domains).length,
    };
  }
}
