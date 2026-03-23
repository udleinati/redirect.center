import { getConfig } from "../../../shared/src/config.ts";
import * as usersQuery from "../../../shared/src/db/queries/users.ts";
import * as magicLinksQuery from "../../../shared/src/db/queries/magic_links.ts";
import * as sessionsQuery from "../../../shared/src/db/queries/sessions.ts";
import { sendEmail } from "./email.ts";
import type { User } from "../../../shared/src/types.ts";

export async function sendMagicLink(email: string): Promise<void> {
  const config = getConfig();

  // Upsert user
  await usersQuery.create(email);

  // Generate token
  const token = crypto.randomUUID();

  // Save magic link with 24h expiry
  const expiresAt = new Date(
    Date.now() + config.magicLinkDurationHours * 60 * 60 * 1000,
  );
  await magicLinksQuery.create(email, token, expiresAt);

  // Build verification URL
  const verifyUrl = `${config.baseUrl}/auth/verify?token=${token}`;
  console.log(`[auth] Magic link for ${email}: ${verifyUrl}`);

  // Send email
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #2563eb;">${config.fqdn ?? "redirect.center"}</h2>
      <p>Click the link below to sign in to your account:</p>
      <p style="margin: 24px 0;">
        <a href="${verifyUrl}"
           style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
          Sign In
        </a>
      </p>
      <p style="color: #6b7280; font-size: 14px;">
        This link expires in ${config.magicLinkDurationHours} hours.<br>
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `;

  await sendEmail(email, `Sign in to ${config.fqdn ?? "redirect.center"}`, html);
}

export async function validateMagicLink(
  token: string,
): Promise<string | null> {
  const config = getConfig();

  // Find valid magic link
  const magicLink = await magicLinksQuery.findByToken(token);
  if (!magicLink) return null;

  // Mark as used
  await magicLinksQuery.markUsed(magicLink.id);

  // Find user
  const user = await usersQuery.findByEmail(magicLink.email);
  if (!user) return null;

  // Create session
  const sessionToken = crypto.randomUUID();
  const expiresAt = new Date(
    Date.now() + config.sessionDurationHours * 60 * 60 * 1000,
  );
  await sessionsQuery.create(user.id, sessionToken, expiresAt);

  return sessionToken;
}

export async function validateSession(token: string): Promise<User | null> {
  const session = await sessionsQuery.findByToken(token);
  if (!session) return null;

  const user = await usersQuery.findById(session.user_id);
  return user;
}

export async function logout(token: string): Promise<void> {
  const session = await sessionsQuery.findByToken(token);
  if (session) {
    await sessionsQuery.deleteByUserId(session.user_id);
  }
}
