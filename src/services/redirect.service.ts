import { Injectable } from '@nestjs/common';
import * as dns from 'node:dns';
import { promisify } from 'node:util';
import * as url from 'url';
import * as base32 from 'base32.js';
import { ConfigService } from '@nestjs/config';
import { Destination, RedirectResponse } from '../types';

@Injectable()
export class RedirectService {
  fqdn = this.configService.get('app.fqdn');

  constructor(private readonly configService: ConfigService) {}

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
    const pDnsResolveCname = promisify(dns.resolveCname);
    const resolved = await pDnsResolveCname(host);
    return resolved[0];
  }

  parseDestination(raw: string, reqUrl: string): Destination {
    const destination = new Destination();

    const parsedUrl = url.parse(reqUrl);
    raw = raw.replace(`.${this.fqdn}`, '');

    if (raw.includes('.opts-https')) {
      raw = raw.replace('.opts-https', '');
      destination.protocol = 'https';
    }

    const queryRegex = new RegExp(/(\.(?:opts-query)\.)(.*?)(?:(?:\.|$))/);
    if (raw.match(queryRegex)) {
      const r = raw.match(queryRegex);
      if (r && r[0]) raw = raw.replace(r[0], '');
      if (r && r[2]) destination.queries.push(Buffer.from(base32.decode(r[2])).toString());
    }

    const statusCodeRegex = new RegExp(/.opts-statuscode-(301|302|307|308)/);
    if (raw.match(statusCodeRegex)) {
      const r = raw.match(statusCodeRegex);
      if (r && r[1]) {
        raw = raw.replace(`.opts-statuscode-${r[1]}`, '');
        destination.status = parseInt(r[1]);
      }
    }

    const slashRegex = new RegExp(/(\.(?:opts-slash)\.)(.*?)(?:(?:\.(?:opts-slash|slash)\.?)|$)/);
    while (raw.match(slashRegex)) {
      const r = raw.match(slashRegex);
      if (r && r[2]) {
        raw = raw.replace(`.opts-slash.${r[2]}`, '');
        destination.pathnames.push(`/${r[2]}`);
      }
    }

    if (raw.includes('.opts-uri')) {
      raw = raw.replace('.opts-uri', '');
      destination.pathnames.push(parsedUrl.pathname);
      destination.queries.push(parsedUrl.query);
    }

    destination.host = raw;

    return destination;
  }
}
