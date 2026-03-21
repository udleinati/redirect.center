import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { getConfig } from "../../../shared/src/config.ts";

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const config = getConfig();

  if (!config.smtp.host) {
    console.warn("[email] SMTP not configured (no SMTP_HOST), logging email instead:");
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body: ${html}`);
    return;
  }

  const hasAuth = !!(config.smtp.user && config.smtp.pass);

  const client = new SMTPClient({
    connection: {
      hostname: config.smtp.host,
      port: config.smtp.port,
      tls: config.smtp.port === 465,
      ...(hasAuth
        ? {
            auth: {
              username: config.smtp.user!,
              password: config.smtp.pass!,
            },
          }
        : {}),
    },
    // Allow sending without TLS in dev (Mailpit doesn't need TLS on port 1025)
    debug: { allowUnsecure: !hasAuth },
  });

  try {
    await client.send({
      from: config.smtp.from ?? `noreply@${config.fqdn ?? "redirect.center"}`,
      to,
      subject,
      content: "auto",
      html,
    });
    console.log(`[email] Sent to ${to}: ${subject}`);
  } finally {
    try {
      await client.close();
    } catch {
      // Connection may not have been established
    }
  }
}
