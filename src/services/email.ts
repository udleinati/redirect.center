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

// Plain SMTP sender for a local capture server (MailHog / Mailpit) — no TLS, no
// auth, which is exactly what those dev mailboxes expose on port 1025. Lets you
// see the magic link in a web UI without a real provider. NOT for production
// (use Resend); prod SMTP with auth/STARTTLS is out of scope for this adapter.
export function createSmtpSender(
  host: string,
  port: number,
  from: string,
): EmailSender {
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  // Read one full SMTP reply (handles multi-line greetings like EHLO's 250-...):
  // accumulate until a line is "NNN <text>" (space after the code = final line).
  async function readReply(conn: Deno.Conn): Promise<string> {
    let acc = "";
    const buf = new Uint8Array(2048);
    for (;;) {
      const n = await conn.read(buf);
      if (n === null) break;
      acc += dec.decode(buf.subarray(0, n));
      if (/(^|\n)\d{3} [^\n]*\r?\n$/.test(acc)) break;
    }
    return acc;
  }

  function addrOnly(s: string): string {
    const m = s.match(/<([^>]+)>/);
    return m ? m[1] : s.trim();
  }

  return {
    async send(msg) {
      const conn = await Deno.connect({ hostname: host, port });
      try {
        const step = async (line: string | null, expect: string) => {
          if (line !== null) await conn.write(enc.encode(line + "\r\n"));
          const reply = await readReply(conn);
          if (!reply.trimStart().startsWith(expect)) {
            throw new Error(
              `SMTP: expected ${expect}, got ${reply.trim().slice(0, 120)}`,
            );
          }
        };
        await step(null, "220"); // server greeting
        await step("EHLO redirect.center", "250");
        await step(`MAIL FROM:<${addrOnly(from)}>`, "250");
        await step(`RCPT TO:<${addrOnly(msg.to)}>`, "250");
        await step("DATA", "354");
        const headers = [
          `From: ${from}`,
          `To: ${msg.to}`,
          `Subject: ${msg.subject}`,
          "MIME-Version: 1.0",
          "Content-Type: text/html; charset=utf-8",
        ].join("\r\n");
        // Dot-stuff lines beginning with "." so they don't end the DATA stream.
        const body = msg.html.replace(/\r?\n/g, "\r\n").replace(
          /\r\n\./g,
          "\r\n..",
        );
        await conn.write(enc.encode(`${headers}\r\n\r\n${body}\r\n.\r\n`));
        await step(null, "250"); // accept DATA
        await conn.write(enc.encode("QUIT\r\n"));
      } finally {
        conn.close();
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

// Pick the sender from config: a local SMTP capture box (MailHog/Mailpit) when
// SMTP_HOST is set, else Resend when an API key + from address are set, else the
// console logger. SMTP wins so the local dashboard sandbox shows the magic link
// in a web UI without any provider.
export function createEmailSender(
  opts: {
    smtpHost?: string;
    smtpPort?: number;
    resendApiKey: string;
    emailFrom: string;
  },
  fetchImpl: typeof fetch = fetch,
): EmailSender {
  if (opts.smtpHost && opts.emailFrom) {
    return createSmtpSender(
      opts.smtpHost,
      opts.smtpPort ?? 1025,
      opts.emailFrom,
    );
  }
  if (opts.resendApiKey && opts.emailFrom) {
    return createResendSender(opts.resendApiKey, opts.emailFrom, fetchImpl);
  }
  return createConsoleSender();
}
