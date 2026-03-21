import * as acme from "acme-client";
import { encrypt, decrypt } from "../services/crypto.ts";

const ACME_DIRECTORY_URL = Deno.env.get("ACME_DIRECTORY_URL") ??
  "https://acme-v02.api.letsencrypt.org/directory";

/**
 * Create a new ACME client with a fresh account key.
 * Returns the client, the encrypted account key, and the account URL for storage.
 */
export async function createAcmeClient(email: string): Promise<{
  client: acme.Client;
  accountKeyEncrypted: string;
  accountKeyIv: string;
  accountUrl: string;
}> {
  const accountKey = await acme.crypto.createPrivateKey();

  const client = new acme.Client({
    directoryUrl: ACME_DIRECTORY_URL,
    accountKey,
  });

  // Register account
  const account = await client.createAccount({
    termsOfServiceAgreed: true,
    contact: [`mailto:${email}`],
  });

  // Get the account URL from the client
  const accountUrl = client.getAccountUrl();
  console.log(`[acme] Account registered, URL: ${accountUrl}`);

  // Encrypt account key for storage
  const { ciphertext, iv } = await encrypt(accountKey.toString());

  return {
    client,
    accountKeyEncrypted: ciphertext,
    accountKeyIv: iv,
    accountUrl,
  };
}

/**
 * Restore an ACME client from an encrypted account key and stored account URL.
 */
export async function restoreAcmeClient(
  accountKeyEncrypted: string,
  accountKeyIv: string,
  accountUrl?: string | null,
): Promise<acme.Client> {
  const accountKeyPem = await decrypt(accountKeyEncrypted, accountKeyIv);

  const client = new acme.Client({
    directoryUrl: ACME_DIRECTORY_URL,
    accountKey: accountKeyPem,
    accountUrl: accountUrl ?? undefined,
  });

  // If no accountUrl was stored, try to recover it via createAccount
  if (!accountUrl) {
    console.log(`[acme] No account URL stored, attempting to recover via createAccount`);
    await client.createAccount({
      termsOfServiceAgreed: true,
      onlyReturnExisting: true,
    });
  }

  return client;
}

/**
 * Create an ACME order for a domain and return the DNS-01 challenge details.
 */
export async function createOrderAndGetChallenge(
  client: acme.Client,
  domain: string,
  isWildcard: boolean,
): Promise<{
  order: acme.Order;
  challenge: acme.Challenge;
  keyAuthorization: string;
}> {
  const identifier = isWildcard ? `*.${domain}` : domain;

  const order = await client.createOrder({
    identifiers: [{ type: "dns", value: identifier }],
  });

  const authorizations = await client.getAuthorizations(order);
  const dnsAuth = authorizations[0];
  const challenge = dnsAuth.challenges.find(
    (c: acme.Challenge) => c.type === "dns-01",
  );

  if (!challenge) {
    throw new Error("No DNS-01 challenge found in ACME order");
  }

  const keyAuthorization = await client.getChallengeKeyAuthorization(challenge);

  return { order, challenge, keyAuthorization };
}

/**
 * Complete the ACME challenge and finalize the order to get a certificate.
 */
export async function completeAndFinalize(
  client: acme.Client,
  order: acme.Order,
  challenge: acme.Challenge,
  domain: string,
  isWildcard: boolean,
): Promise<{
  certificate: string;
  privateKey: string;
}> {
  // Submit the challenge
  console.log(`[acme] Submitting challenge for ${domain}`);
  await client.completeChallenge(challenge);
  console.log(`[acme] Challenge submitted, waiting for valid status for ${domain}`);

  // Wait for validation
  await client.waitForValidStatus(challenge);
  console.log(`[acme] Challenge validated for ${domain}`);

  // Generate CSR and finalize
  const commonName = isWildcard ? `*.${domain}` : domain;
  console.log(`[acme] Generating CSR for ${commonName}`);
  const [key, csr] = await acme.crypto.createCsr({
    commonName,
  });

  console.log(`[acme] Finalizing order for ${domain}`);
  const cert = await client.finalizeOrder(order, csr);
  console.log(`[acme] Order finalized for ${domain}`);

  return {
    certificate: cert,
    privateKey: key.toString(),
  };
}
