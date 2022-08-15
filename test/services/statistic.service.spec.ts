import { createMock } from 'ts-auto-mock';
import { PinoLogger } from 'nestjs-pino';
import { parseDomain } from 'parse-domain';
import { StatisticService } from '../../src/services';
import { Logger } from '@nestjs/common';

describe('StatisticService', () => {
  let logger: PinoLogger;
  let service: StatisticService;

  beforeEach(async () => {
    logger = createMock<Logger>() as any;
    service = createMock<StatisticService>();

    service = new StatisticService(logger);

    jest.spyOn((service as any).db, 'save').mockReturnValue(true);
  });

  describe('write', () => {
    it('host with port', () => {
      const spyEntryHost = jest.spyOn(service as any, 'entryHost').mockReturnValue(true);
      const spyEntryDomain = jest.spyOn(service as any, 'entryDomain').mockReturnValue(true);

      const host = 'www.github.com';
      const parsedHost = parseDomain(host) as any;
      service.write(host);

      // expect(spyEntryHost).toBeCalledWith(host, parsedHost);
      expect(spyEntryDomain).toBeCalledWith(parsedHost);
    });
  });

  describe('entryDomain', () => {
    it('new domain', () => {
      const spyDbGetData = jest.spyOn((service as any).db, 'getData').mockImplementation(() => {
        throw new Error();
      });
      const spyDbPush = jest.spyOn((service as any).db, 'push');

      const host = 'www.github.com';
      const parsedHost = parseDomain(host) as any;
      const key = `/domain/${parsedHost.domain}.${parsedHost.topLevelDomains.join()}`;

      const entry = service.entryDomain(parsedHost);
      expect(entry.count).toBe(1);
      expect(Object.keys(entry)).toEqual(['count', 'firstTime', 'lastTime']);
      expect(spyDbPush).toBeCalledWith(key, entry, true);
      expect(spyDbGetData).toBeCalledTimes(1);
      expect(spyDbPush).toBeCalledTimes(1);
    });

    it('update domain', () => {
      const spyDbGetData = jest.spyOn((service as any).db, 'getData').mockReturnValue({
        count: 1,
        firstTime: new Date().toISOString(),
      });
      const spyDbPush = jest.spyOn((service as any).db, 'push');

      const host = 'www.github.com';
      const parsedHost = parseDomain(host) as any;
      const key = `/domain/${parsedHost.domain}.${parsedHost.topLevelDomains.join()}`;

      const entry = service.entryDomain(parsedHost);
      expect(spyDbPush).toBeCalledWith(key, entry, true);
      expect(Object.keys(entry)).toEqual(['count', 'firstTime', 'lastTime']);
      expect(entry.count).toBe(2);
      expect(spyDbGetData).toBeCalledTimes(1);
      expect(spyDbPush).toBeCalledTimes(1);
    });
  });

  describe('entryHost', () => {
    it('new host', async () => {
      const spyDbGetData = jest.spyOn((service as any).db, 'getData').mockImplementation(() => {
        throw new Error();
      });
      const spyDbPush = jest.spyOn((service as any).db, 'push');

      const host = 'www.github.com';
      const parsedHost = parseDomain(host) as any;
      const key = `/host/${host}`;
      const domain = `${parsedHost.domain}.${parsedHost.topLevelDomains.join()}`;

      const entry = service.entryHost(host, parsedHost);
      expect(entry.count).toBe(1);
      expect(entry.domain).toBe(domain);
      expect(Object.keys(entry)).toEqual(['count', 'firstTime', 'domain', 'lastTime']);
      expect(spyDbPush).toBeCalledWith(key, entry, true);
      expect(spyDbGetData).toBeCalledTimes(1);
      expect(spyDbPush).toBeCalledTimes(1);
    });

    it('update host', () => {
      const spyDbGetData = jest.spyOn((service as any).db, 'getData').mockReturnValue({
        count: 1,
        firstTime: new Date().toISOString(),
        domain: 'github.com',
      });
      const spyDbPush = jest.spyOn((service as any).db, 'push');

      const host = 'www.github.com';
      const parsedHost = parseDomain(host) as any;
      const key = `/host/${host}`;
      const domain = `${parsedHost.domain}.${parsedHost.topLevelDomains.join()}`;

      const entry = service.entryHost(host, parsedHost);
      expect(spyDbPush).toBeCalledWith(key, entry, true);
      expect(Object.keys(entry)).toEqual(['count', 'firstTime', 'domain', 'lastTime']);
      expect(entry.count).toBe(2);
      expect(entry.domain).toBe(domain);
      expect(spyDbGetData).toBeCalledTimes(1);
      expect(spyDbPush).toBeCalledTimes(1);
    });
  });

  describe('summary', () => {
    it('get', () => {
      const spyDbGetData = jest.spyOn((service as any).db, 'getData').mockReturnValue([
        {
          count: 1,
          lastTime: '2022-01-01T00:00:00Z',
        },
        {
          count: 1,
          lastTime: new Date().toISOString(),
        },
      ]);

      const summary = service.overview();
      expect(spyDbGetData).toBeCalledTimes(1);
      expect(summary).toEqual({ periodDomains: 1, everDomains: 2 });
    });
  });
});
