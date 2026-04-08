import { resolveCnameDoH } from "./dns-doh-resolver.ts";

// To revert to Deno.resolveDns(), comment the import above and
// uncomment the DNS_SERVERS + doResolve block below marked with [NATIVE].

// [NATIVE] const DNS_SERVERS = (Deno.env.get("DNS_SERVERS") || "1.1.1.1,8.8.8.8")
// [NATIVE]   .split(",")
// [NATIVE]   .map((s) => s.trim())
// [NATIVE]   .filter(Boolean);

const CACHE_TTL_MS = 15_000;
const CACHE_MAX_SIZE = 2_000;

interface CacheEntry {
  records?: string[];
  errorMessage?: string;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string[]>>();

export async function dnsResolveCname(host: string): Promise<string[]> {
  // 1. Check cache
  const cached = cache.get(host);
  if (cached && cached.expiresAt > Date.now()) {
    if (cached.errorMessage) throw new Error(cached.errorMessage);
    return cached.records!;
  }

  // 2. Deduplicate in-flight requests (singleflight)
  const existing = inflight.get(host);
  if (existing) return existing;

  // 3. Resolve and cache
  const promise = doResolve(host);
  inflight.set(host, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(host);
  }
}

// [DOH] Active resolver — uses fetch-based DNS over HTTPS
async function doResolve(host: string): Promise<string[]> {
  try {
    return cacheResult(host, await resolveCnameDoH(host));
  } catch (error) {
    cacheError(host, error as Error);
    throw error;
  }
}

// [NATIVE] To revert, comment the doResolve above and uncomment this block:
// async function doResolve(host: string): Promise<string[]> {
//   for (const server of DNS_SERVERS) {
//     try {
//       return cacheResult(host, await Deno.resolveDns(host, "CNAME", { nameServer: { ipAddr: server, port: 53 } }));
//     } catch (error) {
//       if (server === DNS_SERVERS[DNS_SERVERS.length - 1]) {
//         cacheError(host, error as Error);
//         throw error;
//       }
//     }
//   }
//   return cacheResult(host, await Deno.resolveDns(host, "CNAME"));
// }

export function dnsCacheSize(): number {
  return cache.size;
}

export function dnsInflightSize(): number {
  return inflight.size;
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

  if (cache.size >= CACHE_MAX_SIZE) {
    const toDelete = cache.size - CACHE_MAX_SIZE + 1000;
    let count = 0;
    for (const key of cache.keys()) {
      if (count++ >= toDelete) break;
      cache.delete(key);
    }
  }
}

// Proactive cache cleanup — removes expired entries every 15s
// Without this, expired entries sit in the Map until max size triggers eviction
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key);
  }
}, 15_000);
