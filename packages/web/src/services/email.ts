import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { getConfig } from "../../../shared/src/config.ts";

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const config = getConfig();

  if (!config.smtp.host || !config.smtp.user || !config.smtp.pass) {
    console.warn("[email] SMTP not configured, logging email instead:");
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body: ${html}`);
    return;
  }

  const client = new SMTPClient({
    connection: {
      hostname: config.smtp.host,
      port: config.smtp.port,
      tls: config.smtp.port === 465,
      auth: {
        username: config.smtp.user,
        password: config.smtp.pass,
      },
    },
  });

  try {
    await client.send({
      from: config.smtp.from ?? `noreply@${config.fqdn ?? "redirect.center"}`,
      to,
      subject,
      content: "auto",
      html,
    });
  } finally {
    await client.close();
  }
}
