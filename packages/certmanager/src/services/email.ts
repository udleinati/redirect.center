/**
 * Email service for certificate notifications.
 * Reuses the same SMTP config as the web service.
 */

const SMTP_HOST = Deno.env.get("SMTP_HOST");
const SMTP_PORT = parseInt(Deno.env.get("SMTP_PORT") ?? "587", 10);
const SMTP_USER = Deno.env.get("SMTP_USER");
const SMTP_PASS = Deno.env.get("SMTP_PASS");
const SMTP_FROM = Deno.env.get("SMTP_FROM") ?? "noreply@redirect.center";
const BASE_URL = Deno.env.get("BASE_URL") ?? "http://localhost:8000";

export async function sendCertificateEmail(
  to: string,
  subject: string,
  htmlBody: string,
): Promise<void> {
  if (!SMTP_HOST) {
    console.log(`[email] SMTP not configured. Would send to ${to}: ${subject}`);
    return;
  }

  try {
    // Dynamic import to avoid loading denomailer if SMTP not configured
    const { SmtpClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");

    const client = new SmtpClient();

    const connectConfig: Record<string, unknown> = {
      hostname: SMTP_HOST,
      port: SMTP_PORT,
    };

    if (SMTP_USER && SMTP_PASS) {
      connectConfig.username = SMTP_USER;
      connectConfig.password = SMTP_PASS;
    }

    await client.connect(connectConfig);
    await client.send({
      from: SMTP_FROM,
      to,
      subject,
      content: "",
      html: htmlBody,
    });
    await client.close();

    console.log(`[email] Sent: "${subject}" to ${to}`);
  } catch (error) {
    console.error(`[email] Failed to send to ${to}:`, error);
  }
}

export function certIssuedEmail(domain: string): { subject: string; html: string } {
  return {
    subject: `HTTPS certificate active for ${domain}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Certificate Issued Successfully</h2>
        <p>Your HTTPS certificate for <strong>${domain}</strong> has been issued and is now active.</p>
        <p>The certificate will be automatically renewed before expiry.</p>
        <p><a href="${BASE_URL}/dashboard" style="color: #2563eb;">Go to Dashboard</a></p>
      </div>
    `,
  };
}

export function renewalFailedEmail(domain: string, error: string): { subject: string; html: string } {
  return {
    subject: `Certificate renewal problem for ${domain}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ea580c;">Certificate Renewal Failed</h2>
        <p>We were unable to automatically renew the HTTPS certificate for <strong>${domain}</strong>.</p>
        <p><strong>Error:</strong> ${error}</p>
        <p>Please verify that the CNAME record <code>_acme-challenge.${domain}</code> is still configured correctly.</p>
        <p><a href="${BASE_URL}/dashboard" style="color: #2563eb;">Check in Dashboard</a></p>
      </div>
    `,
  };
}

export function expiryWarningEmail(
  domain: string,
  daysLeft: number,
): { subject: string; html: string } {
  const urgency = daysLeft <= 3 ? "CRITICAL" : daysLeft <= 7 ? "URGENT" : "";
  const color = daysLeft <= 3 ? "#dc2626" : daysLeft <= 7 ? "#ea580c" : "#ca8a04";
  const prefix = urgency ? `${urgency}: ` : "";

  return {
    subject: `${prefix}Certificate for ${domain} expires in ${daysLeft} days`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${color};">${prefix}Certificate Expiring Soon</h2>
        <p>The HTTPS certificate for <strong>${domain}</strong> will expire in <strong>${daysLeft} days</strong>.</p>
        <p>Automatic renewal has been attempted but may have failed. Please check your DNS configuration.</p>
        <p><a href="${BASE_URL}/dashboard" style="color: #2563eb;">Check in Dashboard</a></p>
      </div>
    `,
  };
}

export function expiredEmail(domain: string): { subject: string; html: string } {
  return {
    subject: `Certificate for ${domain} has expired`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Certificate Expired</h2>
        <p>The HTTPS certificate for <strong>${domain}</strong> has expired.</p>
        <p>HTTPS redirects for this domain are no longer working. Please check your DNS configuration and request a new certificate.</p>
        <p><a href="${BASE_URL}/dashboard" style="color: #2563eb;">Go to Dashboard</a></p>
      </div>
    `,
  };
}
