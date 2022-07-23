import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import * as url from 'url';
import * as base32 from 'base32.js';
import { ConfigService } from '@nestjs/config';
import { Destination, RedirectResponse } from '../types';
import { parseDomain, ParseResultType, Validation } from 'parse-domain';
import { dnsResolveCname } from '../helpers';

@Injectable()
export class RedirectService {
  fqdn = this.configService.get('app.fqdn');

  constructor(
    @InjectPinoLogger(RedirectService.name) private readonly logger: PinoLogger,
    private readonly configService: ConfigService,
  ) {}

  async resolveDnsAndRedirect(host: string, reqUrl: string): Promise<RedirectResponse> {
    const raw = await this.resolveDns(host);
    const redirect = this.getRedirectResponse(raw, reqUrl);
    return redirect;
  }

  getRedirectResponse(raw: string, reqUrl: string): RedirectResponse {
    const destination = this.parseDestination(raw, reqUrl);
    const redirect = new RedirectResponse(destination);
    return redirect;
  }

  async resolveDns(host: string): Promise<string> {
    const parsedHost = parseDomain(host, { validation: Validation.Lax }) as any;

    let resolved;

    try {
      resolved = await dnsResolveCname(host);

      if (resolved.length > 1) {
        const error = new Error(`More than one record on the host ${host}.`) as any;
        error.code = 'MORETHANONE';
        throw error;
      } else if (
        ![
          ParseResultType.Reserved,
          ParseResultType.Listed,
          ParseResultType.NotListed,
          ParseResultType.Invalid,
        ].includes(parseDomain(resolved[0]).type)
      ) {
        const error = new Error(`The record on the host ${host} is not valid.`) as any;
        error.code = 'NOTADOMAIN';
        throw error;
      }
    } catch (err) {
      if (
        err.code === 'ENODATA' &&
        !parsedHost.subDomains.includes('redirect') && [
          ParseResultType.Reserved,
          ParseResultType.Listed,
          ParseResultType.NotListed,
        ]
      ) {
        return this.resolveDns(`redirect.${host}`);
      }

      throw err;
    }

    return resolved[0];
  }

  parseDestination(raw: string, reqUrl: string): Destination {
    const destination = new Destination();

    const parsedUrl = url.parse(reqUrl);
    raw = raw.replace(`.${this.fqdn}`, '');

    let r;

    let labels = raw.split('.');

    labels = labels.map(label => {
      switch (true) {
        case !!label.match(/^(opts-|_)https$/): {
          destination.protocol = 'https';
          return '';
        }
        case !!(r = label.match(/^(?:opts-|_)(?:path)-(.*)$/)): {
          r[1] = r[1].replace(/-/g, '=');
          destination.pathnames.push(Buffer.from(base32.decode(r[1])).toString());
          return '';
        }
        case !!(r = label.match(/^(?:opts-|_)statuscode-(301|302|307|308)$/)): {
          destination.status = parseInt(r[1]);
          return '';
        }
        case !!(r = label.match(/^(?:opts-|_)port-(\d+)$/)): {
          destination.port = parseInt(r[1]);
          return '';
        }
        case !!label.match(/^(opts-|_)uri$/): {
          if (parsedUrl.query) destination.queries.push(parsedUrl.query);
          if (parsedUrl.pathname) destination.pathnames.push(parsedUrl.pathname);
          return '';
        }
        default:
          return label;
      }
    });

    raw = labels.filter(e => e).join('.');

    /* * * This while must exists because .opt-slash contains a . after the parameter * * */
    /* opts-query */
    {
      const queries = [];
      let loop = 1;

      while ((r = raw.match(/\.(?:opts-|_|)(?:query|base32)[\.\-]([^\.]+)/))) {
        if (loop++ > 5) this.logger.warn(`CHECK RAW (query) ${raw}`);

        raw = raw.replace(r[0], '');
        r[1] = r[1].replace(/-/g, '=');
        queries.push(Buffer.from(base32.decode(r[1])).toString());
      }

      destination.queries = [...queries, ...destination.queries];
    }

    /* opts-slash */
    {
      const pathnames = [];
      let loop = 1;

      while (
        (r = raw.match(/(\.(?:opts-|_|)slash\.)(.*?)(?:(?:(?:.opts-slash|.slash|_slash))|$)/)) ||
        (r = raw.match(/\.(?:opts-|_|)slash/))
      ) {
        if (loop++ > 5) this.logger.warn(`CHECK RAW (slash) ${raw}`);

        if (r && r[2]) {
          raw = raw.replace(`${r[1]}${r[2]}`, '');
          pathnames.push(`/${r[2]}`);
        } else {
          raw = raw.replace(r[0], '');
          pathnames.push('/');
        }
      }

      destination.pathnames = [...pathnames, ...destination.pathnames];
    }

    destination.host = raw;

    return destination;
  }
}
