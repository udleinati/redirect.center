/**
 * Validation worker — processes pending domain validation requests.
 * Runs every VALIDATION_WORKER_INTERVAL_SECONDS (default 30s).
 */
import * as domainQueries from "../../../shared/src/db/queries/domains.ts";
import { validateAndIssueCertificate } from "../services/certificate.ts";

const INTERVAL = parseInt(
  Deno.env.get("VALIDATION_WORKER_INTERVAL_SECONDS") ?? "30",
  10,
) * 1000;

export function startValidationWorker(): void {
  console.log(`[validation-worker] Starting (interval: ${INTERVAL / 1000}s)`);

  async function run() {
    try {
      const pendingDomains = await domainQueries.findPendingValidation();

      if (pendingDomains.length > 0) {
        console.log(`[validation-worker] Processing ${pendingDomains.length} pending validation(s)`);
      }

      for (const domain of pendingDomains) {
        try {
          await validateAndIssueCertificate(domain);
        } catch (error) {
          console.error(`[validation-worker] Error validating ${domain.domain}:`, error);
        }
      }
    } catch (error) {
      console.error("[validation-worker] Error:", error);
    }
  }

  // Run immediately, then on interval
  run();
  setInterval(run, INTERVAL);
}
