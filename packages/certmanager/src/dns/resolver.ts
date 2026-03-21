/**
 * DNS resolver utilities for certificate validation.
 * Uses Deno's native Deno.resolveDns().
 */

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
    const records = await Deno.resolveDns(challengeHost, "TXT");
    const flatRecords = records.flat();
    return flatRecords.some((record) => record === expectedToken);
  } catch {
    return false;
  }
}

/**
 * Verify that _acme-challenge.{domain} has a CNAME pointing to
 * _acme-challenge.{domain}.acme.redirect.center
 * This is used for CNAME delegation approach.
 */
export async function verifyDnsCnameChallenge(domain: string): Promise<boolean> {
  const challengeHost = `_acme-challenge.${domain}`;
  const expectedCname = `_acme-challenge.${domain}.acme.redirect.center`;
  try {
    const records = await Deno.resolveDns(challengeHost, "CNAME");
    return records.some((record) => {
      // CNAME records may have trailing dot
      const normalized = record.replace(/\.$/, "");
      return normalized === expectedCname;
    });
  } catch {
    return false;
  }
}

/**
 * Verify that a domain's CNAME points to redirect.center
 * (used during certificate renewal to ensure domain still points here).
 */
export async function verifyCnamePointsToRedirectCenter(domain: string): Promise<boolean> {
  try {
    const records = await Deno.resolveDns(domain, "CNAME");
    return records.some((record) => {
      const normalized = record.replace(/\.$/, "").toLowerCase();
      return normalized.endsWith("redirect.center");
    });
  } catch {
    return false;
  }
}
