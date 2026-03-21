import * as acme from "acme-client";
import { encrypt, decrypt } from "../services/crypto.ts";

const ACME_DIRECTORY_URL = Deno.env.get("ACME_DIRECTORY_URL") ??
  "https://acme-v02.api.letsencrypt.org/directory";

/**
 * Create a new ACME client with a fresh account key.
 * Returns the client and the encrypted account key for storage.
 */
export async function createAcmeClient(email: string): Promise<{
  client: acme.Client;
  accountKeyEncrypted: string;
  accountKeyIv: string;
}> {
  const accountKey = await acme.crypto.createPrivateKey();

  const client = new acme.Client({
    directoryUrl: ACME_DIRECTORY_URL,
    accountKey,
  });

  // Register account
  await client.createAccount({
    termsOfServiceAgreed: true,
    contact: [`mailto:${email}`],
  });

  // Encrypt account key for storage
  const { ciphertext, iv } = await encrypt(accountKey.toString());

  return {
    client,
    accountKeyEncrypted: ciphertext,
    accountKeyIv: iv,
  };
}

/**
 * Restore an ACME client from an encrypted account key.
 */
export async function restoreAcmeClient(
  accountKeyEncrypted: string,
  accountKeyIv: string,
): Promise<acme.Client> {
  const accountKeyPem = await decrypt(accountKeyEncrypted, accountKeyIv);

  const client = new acme.Client({
    directoryUrl: ACME_DIRECTORY_URL,
    accountKey: accountKeyPem,
  });

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
  await client.completeChallenge(challenge);

  // Wait for validation
  await client.waitForValidStatus(challenge);

  // Generate CSR and finalize
  const commonName = isWildcard ? `*.${domain}` : domain;
  const [key, csr] = await acme.crypto.createCsr({
    commonName,
  });

  const cert = await client.finalizeOrder(order, csr);

  return {
    certificate: cert,
    privateKey: key.toString(),
  };
}
