// Outbound email — the project's first external email dependency (ADR-0003). A
// thin adapter keeps the magic-link flow from binding to one provider. Resend is
// the default; when no provider is configured a console sender logs the link
// instead of sending it, so the local sandbox works without an email account.
//
// I/O only — verified manually, not unit-tested (the pure piece is the link's
// signed token in signed-token.ts).

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailSender {
  send(msg: EmailMessage): Promise<void>;
}

// Resend transactional email: POST https://api.resend.com/emails with a Bearer
// key. Fails loud on any non-2xx so a delivery failure is visible in the logs
// (the caller swallows it for anti-enumeration on /auth/request, but still logs).
export function createResendSender(
  apiKey: string,
  from: string,
  fetchImpl: typeof fetch = fetch,
): EmailSender {
  return {
    async send(msg) {
      const res = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: msg.to,
          subject: msg.subject,
          html: msg.html,
          ...(msg.text ? { text: msg.text } : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Resend ${res.status}: ${body.slice(0, 200)}`);
      }
    },
  };
}

// Dev/sandbox fallback: log the message (including the magic link in the body) so
// a developer can copy it from the container logs without configuring a provider.
export function createConsoleSender(): EmailSender {
  return {
    send(msg) {
      console.log(
        `[email] (console sender) to=${msg.to} subject="${msg.subject}"`,
      );
      console.log(`[email] body:\n${msg.text ?? msg.html}`);
      return Promise.resolve();
    },
  };
}

// Pick the sender from config: Resend when an API key + from address are set,
// otherwise the console logger.
export function createEmailSender(
  opts: { resendApiKey: string; emailFrom: string },
  fetchImpl: typeof fetch = fetch,
): EmailSender {
  if (opts.resendApiKey && opts.emailFrom) {
    return createResendSender(opts.resendApiKey, opts.emailFrom, fetchImpl);
  }
  return createConsoleSender();
}
