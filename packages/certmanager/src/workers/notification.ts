/**
 * Notification worker — sends email and panel notifications for certificate issues.
 * Runs every NOTIFICATION_WORKER_INTERVAL_SECONDS (default 3600s = 1 hour).
 */
import * as certificateQueries from "../../../shared/src/db/queries/certificates.ts";
import * as domainQueries from "../../../shared/src/db/queries/domains.ts";
import * as subscriptionQueries from "../../../shared/src/db/queries/subscriptions.ts";
import * as userQueries from "../../../shared/src/db/queries/users.ts";
import * as notificationQueries from "../../../shared/src/db/queries/notifications.ts";
import {
  sendCertificateEmail,
  renewalFailedEmail,
  expiryWarningEmail,
  expiredEmail,
} from "../services/email.ts";

const INTERVAL = parseInt(
  Deno.env.get("NOTIFICATION_WORKER_INTERVAL_SECONDS") ?? "3600",
  10,
) * 1000;

export function startNotificationWorker(): void {
  console.log(`[notification-worker] Starting (interval: ${INTERVAL / 1000}s)`);

  async function run() {
    try {
      await processRenewalFailedNotifications();
      await processExpiryNotifications();
      await processExpiredNotifications();
    } catch (error) {
      console.error("[notification-worker] Error:", error);
    }
  }

  // Run after 20s delay, then on interval
  setTimeout(run, 20000);
  setInterval(run, INTERVAL);
}

async function getUserForCert(cert: { domain_id: string }): Promise<{ email: string; id: string } | null> {
  const domain = await domainQueries.findById(cert.domain_id);
  if (!domain) return null;
  const sub = await subscriptionQueries.findById(domain.subscription_id);
  if (!sub) return null;
  const user = await userQueries.findById(sub.user_id);
  return user;
}

async function processRenewalFailedNotifications(): Promise<void> {
  const failedCerts = await certificateQueries.findByStatus("renewal_failed");

  for (const cert of failedCerts) {
    const user = await getUserForCert(cert);
    if (!user) continue;

    const alreadySent = await notificationQueries.wasRecentlySent(
      user.id, cert.domain_id, "renewal_failed", "email", 24,
    );
    if (alreadySent) continue;

    const { subject, html } = renewalFailedEmail(cert.domain, cert.error_message ?? "Unknown error");
    await sendCertificateEmail(user.email, subject, html);
    await notificationQueries.create(user.id, "renewal_failed", "email", cert.domain_id);
    await notificationQueries.create(user.id, "renewal_failed", "panel", cert.domain_id);
  }
}

async function processExpiryNotifications(): Promise<void> {
  const thresholds = [
    { days: 14, type: "expiry_14d" },
    { days: 7, type: "expiry_7d" },
    { days: 3, type: "expiry_3d" },
  ];

  for (const { days, type } of thresholds) {
    const certs = await certificateQueries.findExpiringCertificates(days);

    for (const cert of certs) {
      if (!cert.expires_at) continue;

      const daysLeft = Math.ceil(
        (new Date(cert.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );

      // Only notify if within the right range for this threshold
      if (days === 14 && daysLeft > 14) continue;
      if (days === 7 && (daysLeft > 7 || daysLeft <= 3)) continue;
      if (days === 3 && daysLeft > 3) continue;

      const user = await getUserForCert(cert);
      if (!user) continue;

      const alreadySent = await notificationQueries.wasRecentlySent(
        user.id, cert.domain_id, type, "email", 24,
      );
      if (alreadySent) continue;

      const { subject, html } = expiryWarningEmail(cert.domain, daysLeft);
      await sendCertificateEmail(user.email, subject, html);
      await notificationQueries.create(user.id, type, "email", cert.domain_id);
      await notificationQueries.create(user.id, type, "panel", cert.domain_id);
    }
  }
}

async function processExpiredNotifications(): Promise<void> {
  const expiredCerts = await certificateQueries.findByStatus("expired");

  for (const cert of expiredCerts) {
    const user = await getUserForCert(cert);
    if (!user) continue;

    const alreadySent = await notificationQueries.wasRecentlySent(
      user.id, cert.domain_id, "expired", "email", 24,
    );
    if (alreadySent) continue;

    const { subject, html } = expiredEmail(cert.domain);
    await sendCertificateEmail(user.email, subject, html);
    await notificationQueries.create(user.id, "expired", "email", cert.domain_id);
    await notificationQueries.create(user.id, "expired", "panel", cert.domain_id);
  }
}
