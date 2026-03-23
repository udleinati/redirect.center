import nodemailer from "nodemailer";
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

  const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    ...(hasAuth
      ? {
          auth: {
            user: config.smtp.user!,
            pass: config.smtp.pass!,
          },
        }
      : {}),
  });

  await transporter.sendMail({
    from: config.smtp.from ?? `noreply@${config.fqdn ?? "redirect.center"}`,
    to,
    subject,
    html,
  });

  console.log(`[email] Sent to ${to}: ${subject}`);
}
