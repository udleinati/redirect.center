/**
 * Proxy sidecar — syncs certificates from PostgreSQL to filesystem
 * and manages Caddy configuration via its admin API.
 */

import { waitForCaddy } from "./services/caddy-api.ts";
import { initialSync, startSyncLoop } from "./services/cert-sync.ts";
import { closePool } from "./services/db.ts";
import { logger } from "./utils/logger.ts";

const SYNC_INTERVAL = parseInt(
  Deno.env.get("SYNC_INTERVAL_SECONDS") ?? "30",
  10,
);

async function main(): Promise<void> {
  logger.info("Starting proxy sidecar...");

  // Wait for Caddy admin API to be available
  await waitForCaddy();

  // Perform initial full sync
  await initialSync();

  // Start periodic sync loop
  const intervalId = startSyncLoop(SYNC_INTERVAL);

  // Handle graceful shutdown
  const shutdown = async () => {
    logger.info("Shutting down...");
    clearInterval(intervalId);
    await closePool();
    Deno.exit(0);
  };

  Deno.addSignalListener("SIGTERM", shutdown);
  Deno.addSignalListener("SIGINT", shutdown);

  logger.info("Sidecar running. Waiting for signals...");

  // Keep the process alive
  await new Promise(() => {});
}

main().catch((error) => {
  logger.error("Fatal error:", error);
  Deno.exit(1);
});
