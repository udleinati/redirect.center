const DNS_SERVERS = (Deno.env.get("DNS_SERVERS") || "1.1.1.1,8.8.8.8")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export async function dnsResolveCname(host: string): Promise<string[]> {
  for (const server of DNS_SERVERS) {
    try {
      return await Deno.resolveDns(host, "CNAME", { nameServer: { ipAddr: server, port: 53 } });
    } catch (error) {
      // If this server failed, try the next one
      if (server === DNS_SERVERS[DNS_SERVERS.length - 1]) {
        throw error; // Last server — propagate the error
      }
    }
  }
  // Fallback (should never reach here)
  return await Deno.resolveDns(host, "CNAME");
}
