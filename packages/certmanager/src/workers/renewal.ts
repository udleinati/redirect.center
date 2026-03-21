/**
 * Renewal worker — checks for certificates expiring within 14 days and renews them.
 * Runs every RENEWAL_WORKER_INTERVAL_SECONDS (default 3600s = 1 hour).
 */
import * as certificateQueries from "../../../shared/src/db/queries/certificates.ts";
import { verifyCnamePointsToRedirectCenter } from "../dns/resolver.ts";
import { renewCertificate } from "../services/certificate.ts";

const INTERVAL = parseInt(
  Deno.env.get("RENEWAL_WORKER_INTERVAL_SECONDS") ?? "3600",
  10,
) * 1000;

export function startRenewalWorker(): void {
  console.log(`[renewal-worker] Starting (interval: ${INTERVAL / 1000}s)`);

  async function run() {
    try {
      // Find certificates expiring within 14 days
      const expiringCerts = await certificateQueries.findExpiringCertificates(14);

      if (expiringCerts.length > 0) {
        console.log(`[renewal-worker] Found ${expiringCerts.length} certificate(s) to renew`);
      }

      for (const cert of expiringCerts) {
        try {
          // Verify domain still points to redirect.center
          const cnameValid = await verifyCnamePointsToRedirectCenter(cert.domain);
          if (!cnameValid) {
            await certificateQueries.markRenewalFailed(
              cert.id,
              "CNAME no longer points to redirect.center",
            );
            console.log(`[renewal-worker] Skipping ${cert.domain}: CNAME invalid`);
            continue;
          }

          await renewCertificate(cert);
        } catch (error) {
          console.error(`[renewal-worker] Error renewing ${cert.domain}:`, error);
        }
      }

      // Mark truly expired certificates
      const expiredCerts = await certificateQueries.findExpiringCertificates(0);
      for (const cert of expiredCerts) {
        if (cert.expires_at && new Date(cert.expires_at) < new Date()) {
          await certificateQueries.markExpired(cert.id);
          console.log(`[renewal-worker] Certificate for ${cert.domain} has expired`);
        }
      }
    } catch (error) {
      console.error("[renewal-worker] Error:", error);
    }
  }

  // Run after a brief delay (let validation worker go first), then on interval
  setTimeout(run, 10000);
  setInterval(run, INTERVAL);
}
