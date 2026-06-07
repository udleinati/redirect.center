import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import {
  createConsoleSender,
  createEmailSender,
  createResendSender,
} from "./email.ts";

// A fetch double that records calls and answers from a handler. Named `impl` (not
// `fetch`) so `typeof fetch` keeps resolving to the global.
function recordingFetch(
  handler: (url: string, init?: RequestInit) => Response,
): { fetch: typeof fetch; calls: Array<{ url: string; init?: RequestInit }> } {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const impl = ((input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return Promise.resolve(handler(String(input), init));
  }) as typeof fetch;
  return { fetch: impl, calls };
}
const ok = () => new Response("{}", { status: 200 });
const header = (init: RequestInit | undefined, name: string) =>
  (init?.headers as Record<string, string> | undefined)?.[name];

// WHY: the Resend path is the only real network call for sign-in emails — it must
// POST the full message with bearer auth to the right endpoint, or links never send.
Deno.test("createResendSender posts the message to Resend with bearer auth", async () => {
  const { fetch, calls } = recordingFetch(ok);
  const sender = createResendSender(
    "key_123",
    "noreply@redirect.center",
    fetch,
  );
  await sender.send({
    to: "u@x.com",
    subject: "Sign in",
    html: "<b>link</b>",
    text: "link",
  });

  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://api.resend.com/emails");
  assertEquals(calls[0].init?.method, "POST");
  assertEquals(header(calls[0].init, "Authorization"), "Bearer key_123");
  const body = JSON.parse(String(calls[0].init?.body));
  assertEquals(body.from, "noreply@redirect.center");
  assertEquals(body.to, "u@x.com");
  assertEquals(body.subject, "Sign in");
  assertStringIncludes(body.html, "link");
  assertEquals(body.text, "link");
});

// WHY: "fail loud" — a non-2xx from Resend must throw so /auth/request logs the
// failure (it swallows for anti-enumeration, but the error must surface to logs).
Deno.test("createResendSender throws on a non-2xx response", async () => {
  const { fetch } = recordingFetch(() => new Response("bad", { status: 422 }));
  const sender = createResendSender("k", "f@x.com", fetch);
  await assertRejects(
    () => sender.send({ to: "a@b.com", subject: "s", html: "h" }),
    Error,
    "422",
  );
});

// WHY: with a Resend key + from (and no SMTP), createEmailSender must route through
// Resend — the production email path for the hosted deployment.
Deno.test("createEmailSender uses Resend when configured (no SMTP)", async () => {
  const { fetch, calls } = recordingFetch(ok);
  const sender = createEmailSender(
    { resendApiKey: "k", emailFrom: "f@x.com" },
    fetch,
  );
  await sender.send({ to: "a@b.com", subject: "s", html: "h" });
  assertEquals(calls.map((c) => c.url), ["https://api.resend.com/emails"]);
});

// WHY: with nothing configured, it must fall back to the console sender — the local
// sandbox works with no provider, and crucially makes NO network call.
Deno.test("createEmailSender falls back to the console sender when unconfigured", async () => {
  const { fetch, calls } = recordingFetch(ok);
  const sender = createEmailSender({ resendApiKey: "", emailFrom: "" }, fetch);
  await sender.send({ to: "a@b.com", subject: "s", html: "h" });
  assertEquals(calls.length, 0);
});

// WHY: the console sender must resolve cleanly (never throw) so a missing provider
// can't break the sign-in flow in a sandbox.
Deno.test("createConsoleSender resolves without sending anywhere", async () => {
  await createConsoleSender().send({ to: "a@b.com", subject: "s", html: "h" });
});
