/**
 * Certificate synchronization service.
 * Polls PostgreSQL, decrypts certificates, writes PEM files to disk,
 * and reloads Caddy when changes are detected.
 */

import { fetchValidCertificates, type CertRow } from "./db.ts";
import { decrypt } from "./crypto.ts";
import { reloadCaddy } from "./caddy-api.ts";
import { sha256 } from "../utils/checksum.ts";
import { logger } from "../utils/logger.ts";

const CERTS_DIR = "/certs";

/** In-memory checksum map: domain → SHA-256 hash */
const checksumMap = new Map<string, string>();

/**
 * Compute a checksum for a certificate row.
 * Based on certificate_pem + private_key_pem_encrypted + updated_at.
 */
async function computeChecksum(row: CertRow): Promise<string> {
  const data = `${row.certificate_pem}|${row.private_key_pem_encrypted}|${row.updated_at}`;
  return await sha256(data);
}

/**
 * Write a certificate's PEM files to the filesystem.
 */
async function writeCertFiles(
  domain: string,
  certPem: string,
  keyPem: string,
): Promise<void> {
  const dir = `${CERTS_DIR}/${domain}`;
  await Deno.mkdir(dir, { recursive: true });
  await Deno.writeTextFile(`${dir}/cert.pem`, certPem);
  await Deno.writeTextFile(`${dir}/key.pem`, keyPem);
  logger.debug(`Wrote cert files for ${domain}`);
}

/**
 * Remove a certificate's PEM files from the filesystem.
 */
async function removeCertFiles(domain: string): Promise<void> {
  const dir = `${CERTS_DIR}/${domain}`;
  try {
    await Deno.remove(dir, { recursive: true });
    logger.debug(`Removed cert files for ${domain}`);
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      logger.warn(`Failed to remove cert files for ${domain}: ${error}`);
    }
  }
}

/**
 * Perform a full sync cycle:
 * 1. Fetch valid certs from DB
 * 2. Compare checksums
 * 3. Write/remove PEM files as needed
 * 4. Reload Caddy if anything changed
 *
 * Returns true if Caddy was reloaded.
 */
export async function syncCertificates(): Promise<boolean> {
  const rows = await fetchValidCertificates();

  if (rows.length === 0 && checksumMap.size === 0) {
    logger.debug("No certificates in DB and none on disk");
    // Still reload Caddy with empty config to ensure it's in a known state
    return false;
  }

  const currentDomains = new Set<string>();
  let hasChanges = false;

  // Process each certificate from the database
  for (const row of rows) {
    currentDomains.add(row.domain);

    const newChecksum = await computeChecksum(row);
    const existingChecksum = checksumMap.get(row.domain);

    if (existingChecksum === newChecksum) {
      continue; // No changes for this domain
    }

    // Decrypt private key and write PEM files
    try {
      const keyPem = await decrypt(
        row.private_key_pem_encrypted,
        row.private_key_iv,
      );
      await writeCertFiles(row.domain, row.certificate_pem, keyPem);
      checksumMap.set(row.domain, newChecksum);
      hasChanges = true;

      if (existingChecksum) {
        logger.info(`Updated certificate for ${row.domain}`);
      } else {
        logger.info(`Added certificate for ${row.domain}`);
      }
    } catch (error) {
      logger.error(
        `Failed to process certificate for ${row.domain}: ${error}`,
      );
    }
  }

  // Remove certificates that are no longer in the database
  for (const [domain] of checksumMap) {
    if (!currentDomains.has(domain)) {
      await removeCertFiles(domain);
      checksumMap.delete(domain);
      hasChanges = true;
      logger.info(`Removed certificate for ${domain}`);
    }
  }

  // Reload Caddy if there were any changes
  if (hasChanges) {
    const activeDomains = [...checksumMap.keys()];
    const success = await reloadCaddy(activeDomains);
    if (!success) {
      logger.error("Failed to reload Caddy after cert sync");
    }
    return success;
  }

  return false;
}

/**
 * Perform initial sync: clear any stale files and do a full sync.
 */
export async function initialSync(): Promise<void> {
  // Clean up the certs directory
  try {
    for await (const entry of Deno.readDir(CERTS_DIR)) {
      if (entry.isDirectory) {
        // Will be re-created if still valid
        await Deno.remove(`${CERTS_DIR}/${entry.name}`, { recursive: true });
      }
    }
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      logger.warn(`Failed to clean certs directory: ${error}`);
    }
  }

  // Ensure certs directory exists
  await Deno.mkdir(CERTS_DIR, { recursive: true });

  // Clear in-memory checksums
  checksumMap.clear();

  // Do a full sync
  logger.info("Performing initial certificate sync...");
  await syncCertificates();

  // Always reload Caddy on startup with the current state
  const activeDomains = [...checksumMap.keys()];
  await reloadCaddy(activeDomains);
  logger.info(
    `Initial sync complete: ${activeDomains.length} certificate(s) loaded`,
  );
}

/**
 * Start the sync loop.
 */
export function startSyncLoop(intervalSeconds: number): number {
  logger.info(`Starting cert sync loop (interval: ${intervalSeconds}s)`);

  const intervalId = setInterval(async () => {
    try {
      await syncCertificates();
    } catch (error) {
      logger.error(`Sync loop error: ${error}`);
    }
  }, intervalSeconds * 1000);

  return intervalId;
}
