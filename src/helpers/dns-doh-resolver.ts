/**
 * DNS over HTTPS (DoH) resolver — drop-in replacement for Deno.resolveDns().
 *
 * Returns the same format as Deno.resolveDns(host, "CNAME"):
 *   - Success: string[] with trailing dot (e.g., ["target.example.com."])
 *   - Error: throws Error with message matching Deno's pattern
 *
 * Uses Cloudflare and Google as DoH providers (same order as DNS_SERVERS).
 * Uses fetch() instead of native UDP — avoids Deno native memory leak (#28307).
 */

const DOH_SERVERS = (Deno.env.get("DOH_SERVERS") ||
  "https://cloudflare-dns.com/dns-query,https://dns.google/resolve")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

interface DoHAnswer {
  type: number;
  data: string;
}

interface DoHResponse {
  Status: number;
  Answer?: DoHAnswer[];
}

/**
 * Resolve CNAME records via DNS over HTTPS.
 * Signature and return format match Deno.resolveDns(host, "CNAME").
 */
export async function resolveCnameDoH(host: string): Promise<string[]> {
  for (let i = 0; i < DOH_SERVERS.length; i++) {
    const server = DOH_SERVERS[i];
    try {
      const url = `${server}?name=${encodeURIComponent(host)}&type=CNAME`;
      const res = await fetch(url, {
        headers: { Accept: "application/dns-json" },
        signal: AbortSignal.timeout(3000),
      });

      if (!res.ok) {
        throw new Error(`DoH HTTP error: ${res.status}`);
      }

      const data: DoHResponse = await res.json();

      // Status 0 = NOERROR; anything else or no Answer = no records
      if (data.Status !== 0 || !data.Answer) {
        // Match Deno's error message format for "no records found"
        throw new Error(
          `proto error: no records found for Query { name: Name("${host}."), query_type: CNAME, query_class: IN }`,
        );
      }

      // CNAME type = 5
      const cnames = data.Answer
        .filter((a) => a.type === 5)
        .map((a) => a.data.endsWith(".") ? a.data : `${a.data}.`);

      if (cnames.length === 0) {
        throw new Error(
          `proto error: no records found for Query { name: Name("${host}."), query_type: CNAME, query_class: IN }`,
        );
      }

      return cnames;
    } catch (err) {
      // If it's a "no records found" error, throw immediately (don't try next server)
      if ((err as Error).message?.includes("no records found")) {
        throw err;
      }
      // Network/timeout error: try next server
      if (i === DOH_SERVERS.length - 1) {
        throw err;
      }
    }
  }

  // Fallback should never reach here, but just in case
  throw new Error(
    `proto error: no records found for Query { name: Name("${host}."), query_type: CNAME, query_class: IN }`,
  );
}
