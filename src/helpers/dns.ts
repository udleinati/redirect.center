export async function dnsResolveCname(host: string): Promise<string[]> {
  return await Deno.resolveDns(host, "CNAME");
}
