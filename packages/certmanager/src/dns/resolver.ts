/**
 * DNS resolver utilities for certificate validation.
 * Uses Deno's native Deno.resolveDns() with public DNS servers
 * to avoid Docker's internal DNS cache.
 */

const DNS_SERVERS: Deno.NameServer[] = [
  { ipAddr: "8.8.8.8", port: 53 },
  { ipAddr: "1.1.1.1", port: 53 },
];

const FQDN = Deno.env.get("FQDN") ?? "redirect.center";

/**
 * Verify that a TXT record exists for _acme-challenge.{domain}
 * with the expected token value.
 */
export async function verifyDnsTxtChallenge(
  domain: string,
  expectedToken: string,
): Promise<boolean> {
  const challengeHost = `_acme-challenge.${domain}`;
  try {
    const records = await Deno.resolveDns(challengeHost, "TXT", { nameServer: DNS_SERVERS[0] });
    const flatRecords = records.flat();
    return flatRecords.some((record) => record === expectedToken);
  } catch {
    return false;
  }
}

/**
 * Verify that _acme-challenge.{domain} has a CNAME pointing to
 * _acme-challenge.{domain}.acme.${FQDN}
 * This is used for CNAME delegation approach.
 */
export async function verifyDnsCnameChallenge(domain: string): Promise<boolean> {
  const challengeHost = `_acme-challenge.${domain}`;
  const expectedCname = `_acme-challenge.${domain}.acme.${FQDN}`;

  // Try each DNS server
  for (const nameServer of DNS_SERVERS) {
    try {
      const records = await Deno.resolveDns(challengeHost, "CNAME", { nameServer });
      console.log(`[dns] CNAME lookup for ${challengeHost} via ${nameServer.ipAddr}: ${JSON.stringify(records)}`);
      console.log(`[dns] Expected CNAME: ${expectedCname}`);
      const match = records.some((record) => {
        // CNAME records may have trailing dot
        const normalized = record.replace(/\.$/, "");
        return normalized === expectedCname;
      });
      if (match) return true;
      if (!match) {
        console.log(`[dns] CNAME mismatch for ${challengeHost} — found records but none match expected value`);
      }
    } catch (error) {
      console.log(`[dns] CNAME lookup failed for ${challengeHost} via ${nameServer.ipAddr}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return false;
}

/**
 * Verify that a domain's CNAME points to redirect.center
 * (used during certificate renewal to ensure domain still points here).
 */
export async function verifyCnamePointsToRedirectCenter(domain: string): Promise<boolean> {
  try {
    const records = await Deno.resolveDns(domain, "CNAME", { nameServer: DNS_SERVERS[0] });
    return records.some((record) => {
      const normalized = record.replace(/\.$/, "").toLowerCase();
      return normalized.endsWith(FQDN);
    });
  } catch {
    return false;
  }
}
