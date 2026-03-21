/**
 * Certificate service — orchestrates ACME client, DNS challenges, and DB operations.
 */
import * as certificateQueries from "../../../shared/src/db/queries/certificates.ts";
import * as domainQueries from "../../../shared/src/db/queries/domains.ts";
import * as userQueries from "../../../shared/src/db/queries/users.ts";
import * as subscriptionQueries from "../../../shared/src/db/queries/subscriptions.ts";
import { createAcmeClient, restoreAcmeClient, createOrderAndGetChallenge, completeAndFinalize } from "../acme/client.ts";
import { setChallengeTxtRecord, removeChallengeTxtRecord } from "../acme/dns-challenge.ts";
import { verifyDnsCnameChallenge } from "../dns/resolver.ts";
import { encrypt } from "./crypto.ts";
import type { Domain, Certificate } from "../../../shared/src/types.ts";

/**
 * Initialize certificate for a newly added domain.
 * Creates certificate record and generates ACME challenge token.
 */
export async function initializeCertificate(domain: Domain): Promise<void> {
  // Get subscription and user for the email
  const sub = await subscriptionQueries.findById(domain.subscription_id);
  if (!sub) return;
  const user = await userQueries.findById(sub.user_id);
  if (!user) return;

  // Create ACME client
  const { client, accountKeyEncrypted, accountKeyIv } = await createAcmeClient(user.email);

  // Create order and get challenge
  const { order, keyAuthorization } = await createOrderAndGetChallenge(
    client,
    domain.domain,
    domain.is_wildcard,
  );

  // Create certificate record
  const cert = await certificateQueries.create(
    domain.id,
    domain.domain,
    domain.is_wildcard,
  );

  // Store ACME data
  await certificateQueries.updateAcmeData(
    cert.id,
    accountKeyEncrypted,
    accountKeyIv,
    order.url,
  );

  // Store challenge token on domain
  await domainQueries.setDnsChallenge(domain.id, keyAuthorization);

  console.log(`[cert] Initialized certificate for ${domain.domain}, challenge token set`);
}

/**
 * Validate DNS and issue certificate for a domain.
 */
export async function validateAndIssueCertificate(domain: Domain): Promise<void> {
  const cert = await certificateQueries.findByDomainId(domain.id);
  if (!cert) {
    console.error(`[cert] No certificate record found for domain ${domain.domain}`);
    return;
  }

  if (!cert.acme_account_key_encrypted || !cert.acme_account_key_iv) {
    console.error(`[cert] No ACME account key for domain ${domain.domain}`);
    await certificateQueries.updateStatus(cert.id, "failed", "No ACME account key found");
    await domainQueries.updateValidationStatus(domain.id, "failed");
    return;
  }

  try {
    // Step 1: Verify CNAME delegation is configured
    const cnameOk = await verifyDnsCnameChallenge(domain.domain);
    if (!cnameOk) {
      await certificateQueries.updateStatus(
        cert.id,
        "failed",
        `CNAME record _acme-challenge.${domain.domain} not found or not pointing to acme.redirect.center`,
      );
      await domainQueries.updateValidationStatus(domain.id, "failed");
      console.log(`[cert] CNAME validation failed for ${domain.domain}`);
      return;
    }

    // Step 2: Set TXT record in our DNS zone
    if (!domain.dns_challenge_token) {
      await certificateQueries.updateStatus(cert.id, "failed", "No DNS challenge token found");
      await domainQueries.updateValidationStatus(domain.id, "failed");
      return;
    }

    await setChallengeTxtRecord(domain.domain, domain.dns_challenge_token);

    // Step 3: Update status to issuing
    await certificateQueries.updateStatus(cert.id, "issuing");

    // Step 4: Restore ACME client and complete challenge
    const client = await restoreAcmeClient(cert.acme_account_key_encrypted, cert.acme_account_key_iv);

    // Re-create order (ACME orders may have expired)
    const { order, challenge } = await createOrderAndGetChallenge(
      client,
      domain.domain,
      domain.is_wildcard,
    );

    // Complete challenge and get certificate
    const result = await completeAndFinalize(
      client,
      order,
      challenge,
      domain.domain,
      domain.is_wildcard,
    );

    // Encrypt private key
    const { ciphertext: keyEncrypted, iv: keyIv } = await encrypt(result.privateKey);

    // Calculate expiry (Let's Encrypt certs are valid for 90 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    // Store certificate
    await certificateQueries.updateIssuedCertificate(
      cert.id,
      result.certificate,
      keyEncrypted,
      keyIv,
      expiresAt,
    );

    // Update domain status
    await domainQueries.updateValidationStatus(domain.id, "validated");

    // Clean up TXT record
    await removeChallengeTxtRecord(domain.domain);

    console.log(`[cert] Certificate issued for ${domain.domain}, expires ${expiresAt.toISOString()}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await certificateQueries.updateStatus(cert.id, "failed", message);
    await domainQueries.updateValidationStatus(domain.id, "failed");
    console.error(`[cert] Failed to issue certificate for ${domain.domain}:`, message);
  }
}

/**
 * Renew an expiring certificate.
 */
export async function renewCertificate(cert: Certificate): Promise<void> {
  if (!cert.acme_account_key_encrypted || !cert.acme_account_key_iv) {
    await certificateQueries.markRenewalFailed(cert.id, "No ACME account key found");
    return;
  }

  try {
    // Restore ACME client
    const client = await restoreAcmeClient(cert.acme_account_key_encrypted, cert.acme_account_key_iv);

    // Create new order
    const { order, challenge, keyAuthorization } = await createOrderAndGetChallenge(
      client,
      cert.domain,
      cert.is_wildcard,
    );

    // Update challenge token on domain
    const domain = await domainQueries.findById(cert.domain_id);
    if (domain) {
      await domainQueries.setDnsChallenge(domain.id, keyAuthorization);
    }

    // Set TXT record in our DNS zone
    await setChallengeTxtRecord(cert.domain, keyAuthorization);

    // Wait a bit for DNS propagation
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Complete challenge and get new certificate
    const result = await completeAndFinalize(
      client,
      order,
      challenge,
      cert.domain,
      cert.is_wildcard,
    );

    // Encrypt new private key
    const { ciphertext: keyEncrypted, iv: keyIv } = await encrypt(result.privateKey);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    // Update certificate
    await certificateQueries.updateIssuedCertificate(
      cert.id,
      result.certificate,
      keyEncrypted,
      keyIv,
      expiresAt,
    );

    // Clean up TXT record
    await removeChallengeTxtRecord(cert.domain);

    console.log(`[cert] Certificate renewed for ${cert.domain}, new expiry ${expiresAt.toISOString()}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await certificateQueries.markRenewalFailed(cert.id, message);
    console.error(`[cert] Renewal failed for ${cert.domain}:`, message);
  }
}
