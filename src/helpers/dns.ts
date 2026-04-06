const DNS_SERVERS = (Deno.env.get("DNS_SERVERS") || "1.1.1.1,8.8.8.8")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const CACHE_TTL_MS = 15_000;
const cache = new Map<string, { records: string[]; expiresAt: number }>();

export async function dnsResolveCname(host: string): Promise<string[]> {
  const cached = cache.get(host);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.records;
  }
  for (const server of DNS_SERVERS) {
    try {
      return cacheResult(host, await Deno.resolveDns(host, "CNAME", { nameServer: { ipAddr: server, port: 53 } }));
    } catch (error) {
      // If this server failed, try the next one
      if (server === DNS_SERVERS[DNS_SERVERS.length - 1]) {
        throw error; // Last server — propagate the error
      }
    }
  }
  // Fallback (should never reach here)
  return cacheResult(host, await Deno.resolveDns(host, "CNAME"));
}

function cacheResult(host: string, records: string[]): string[] {
  cache.set(host, { records, expiresAt: Date.now() + CACHE_TTL_MS });
  return records;
}
