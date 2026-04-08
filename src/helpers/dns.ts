const DNS_SERVERS = (Deno.env.get("DNS_SERVERS") || "1.1.1.1,8.8.8.8")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const CACHE_TTL_MS = 15_000;
const CACHE_MAX_SIZE = 2_000;

interface CacheEntry {
  records?: string[];
  errorMessage?: string;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

export async function dnsResolveCname(host: string): Promise<string[]> {
  const cached = cache.get(host);
  if (cached && cached.expiresAt > Date.now()) {
    if (cached.errorMessage) throw new Error(cached.errorMessage);
    return cached.records!;
  }

  for (const server of DNS_SERVERS) {
    try {
      return cacheResult(host, await Deno.resolveDns(host, "CNAME", { nameServer: { ipAddr: server, port: 53 } }));
    } catch (error) {
      // If this server failed, try the next one
      if (server === DNS_SERVERS[DNS_SERVERS.length - 1]) {
        cacheError(host, error as Error);
        throw error; // Last server — propagate the error
      }
    }
  }
  // Fallback (should never reach here)
  return cacheResult(host, await Deno.resolveDns(host, "CNAME"));
}

export function dnsCacheSize(): number {
  return cache.size;
}

function cacheResult(host: string, records: string[]): string[] {
  evictIfNeeded();
  cache.set(host, { records, expiresAt: Date.now() + CACHE_TTL_MS });
  return records;
}

function cacheError(host: string, error: Error): void {
  evictIfNeeded();
  cache.set(host, { errorMessage: error.message, expiresAt: Date.now() + CACHE_TTL_MS });
}

function evictIfNeeded(): void {
  if (cache.size < CACHE_MAX_SIZE) return;

  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key);
  }

  // If still too big, remove the oldest entries
  if (cache.size >= CACHE_MAX_SIZE) {
    const toDelete = cache.size - CACHE_MAX_SIZE + 1000;
    let count = 0;
    for (const key of cache.keys()) {
      if (count++ >= toDelete) break;
      cache.delete(key);
    }
  }
}
