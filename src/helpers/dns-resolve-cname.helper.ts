import { resolveCname } from 'node:dns';
import { promisify } from 'node:util';

export async function dnsResolveCname(host: string): Promise<string[]> {
  const pDnsResolveCname = promisify(resolveCname);
  return pDnsResolveCname(host);
}
