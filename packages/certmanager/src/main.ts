/**
 * Certificate Manager — entry point.
 *
 * Runs three workers:
 * 1. Validation worker — processes domain validation requests (every 30s)
 * 2. Renewal worker — renews expiring certificates (every 1h)
 * 3. Notification worker — sends email/panel notifications (every 1h)
 */
import { runMigrations } from "../../shared/src/db/migrate.ts";
import { startValidationWorker } from "./workers/validation.ts";
import { startRenewalWorker } from "./workers/renewal.ts";
import { startNotificationWorker } from "./workers/notification.ts";

console.log("[certmanager] Starting certificate manager...");

// Run database migrations
console.log("[certmanager] Running database migrations...");
await runMigrations();

// Start workers
startValidationWorker();
startRenewalWorker();
startNotificationWorker();

console.log("[certmanager] All workers started. Listening for events...");

// Keep the process alive
await new Promise(() => {});
