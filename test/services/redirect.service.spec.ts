import { createMock } from 'ts-auto-mock';
import { PinoLogger } from 'nestjs-pino';
import { RedirectService } from '../../src/services';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as dns from 'node:dns';

describe('RedirectService', () => {
  let logger: PinoLogger;
  let configService: ConfigService;
  let service: RedirectService;

  beforeEach(async () => {
    logger = createMock<Logger>() as any;
    configService = createMock<ConfigService>();
    service = createMock<RedirectService>();

    service = new RedirectService(logger, configService);
    service.fqdn = 'redirect.center';
  });

  describe('resolveDns', () => {
    it('success', async () => {
      jest.spyOn(dns, 'resolveCname').mockImplementationOnce((params, callback) => {
        callback(null, ['redirect.center']);
      });

      const response = await service.resolveDns('test1.nati.biz');
      expect(response).toBe('redirect.center');
    });

    it('error MORETHANONE', async () => {
      jest.spyOn(dns, 'resolveCname').mockImplementationOnce((params, callback) => {
        callback(null, ['redirect.center', 'redirect.center']);
      });

      let response;

      try {
        await service.resolveDns('test1.nati.biz');
      } catch (err) {
        response = err;
      }

      expect(response.code).toBe('MORETHANONE');
    });

    it('error NOTADOMAIN', async () => {
      jest.spyOn(dns, 'resolveCname').mockImplementationOnce((params, callback) => {
        callback(null, ['??#4']);
      });

      let response;

      try {
        await service.resolveDns('test1.nati.biz');
      } catch (err) {
        response = err;
      }

      expect(response.code).toBe('NOTADOMAIN');
    });
  });

  describe('parseDestination', () => {
    it('opts-slash 1', () => {
      const raw = 'www.youtube.com.opts-slash.watch.redirect.center';
      const response = service.parseDestination(raw, '/any?any=true');
      expect(response).toEqual({
        protocol: 'http',
        pathnames: ['/watch'],
        status: 301,
        host: 'www.youtube.com',
        queries: [],
      });
    });

    it('opts-slash 2', () => {
      const raw = 'www.youtube.com.opts-slash.watch.opts-slash.abc.redirect.center';
      const response = service.parseDestination(raw, '/any?any=true');
      expect(response).toEqual({
        protocol: 'http',
        pathnames: ['/watch', '/abc'],
        status: 301,
        host: 'www.youtube.com',
        queries: [],
      });
    });

    it('opts-slash 3', () => {
      const raw = 'www.youtube.com.opts-slash.redirect.center';
      const response = service.parseDestination(raw, '/any?any=true');
      expect(response).toEqual({
        protocol: 'http',
        pathnames: ['/'],
        status: 301,
        host: 'www.youtube.com',
        queries: [],
      });
    });

    it('opts-slash 4', () => {
      const raw = 'www.youtube.com.opts-slash.watch.opts-slash.redirect.center';
      const response = service.parseDestination(raw, '/any?any=true');
      expect(response).toEqual({
        protocol: 'http',
        pathnames: ['/watch', '/'],
        status: 301,
        host: 'www.youtube.com',
        queries: [],
      });
    });

    it('slash 1', () => {
      const raw = 'www.youtube.com.slash.watch.slash.redirect.center';
      const response = service.parseDestination(raw, '/any?any=true');
      expect(response).toEqual({
        protocol: 'http',
        pathnames: ['/watch', '/'],
        status: 301,
        host: 'www.youtube.com',
        queries: [],
      });
    });

    it('opts-https 1', () => {
      const raw = 'www.youtube.com.opts-https.redirect.center';
      const response = service.parseDestination(raw, '/any?any=true');
      expect(response).toEqual({
        protocol: 'https',
        pathnames: [],
        status: 301,
        host: 'www.youtube.com',
        queries: [],
      });
    });

    it('opts-status-code 1', () => {
      const raw = 'www.youtube.com.opts-statuscode-302.redirect.center';
      const response = service.parseDestination(raw, '/any?any=true');
      expect(response).toEqual({
        protocol: 'http',
        pathnames: [],
        status: 302,
        host: 'www.youtube.com',
        queries: [],
      });
    });

    it('opts-uri 1', () => {
      const raw = 'www.youtube.com.opts-uri.redirect.center';
      const response = service.parseDestination(raw, '/any?any=true');
      expect(response).toEqual({
        protocol: 'http',
        pathnames: ['/any'],
        status: 301,
        host: 'www.youtube.com',
        queries: ['any=true'],
      });
    });

    it('opts-query 1', () => {
      const raw = 'www.youtube.com.opts-query-IFXFS===.redirect.center';
      const response = service.parseDestination(raw, '/any?any=true');
      expect(response).toEqual({
        protocol: 'http',
        pathnames: [],
        status: 301,
        host: 'www.youtube.com',
        queries: ['AnY'],
      });
    });

    it('opts-query 2', () => {
      const raw = 'www.youtube.com.opts-query-IFXFS---.redirect.center';
      const response = service.parseDestination(raw, '/any?any=true');
      expect(response).toEqual({
        protocol: 'http',
        pathnames: [],
        status: 301,
        host: 'www.youtube.com',
        queries: ['AnY'],
      });
    });

    it('opts-port', () => {
      const raw = 'www.youtube.com.opts-port-8080.redirect.center';
      const response = service.parseDestination(raw, '/any?any=true');
      expect(response).toEqual({
        protocol: 'http',
        pathnames: [],
        status: 301,
        host: 'www.youtube.com',
        queries: [],
        port: 8080,
      });
    });

    it('mix 1', () => {
      const raw = '127.0.0.1.opts-slash.opts-query.ifqueysdmm.opts-https.redirect.center';
      const response = service.parseDestination(raw, '/any?any=true');
      expect(response).toEqual({
        protocol: 'https',
        pathnames: ['/'],
        status: 301,
        host: '127.0.0.1',
        queries: ['AaBbCc'],
      });
    });
  });
});
