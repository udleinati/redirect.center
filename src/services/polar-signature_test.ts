import { assert, assertFalse } from "@std/assert";
import { createHmac } from "node:crypto";
import { verifyPolarSignature } from "./polar-signature.ts";

const SECRET = "polar_whsec_test_secret";
const NOW = 1_700_000_000_000; // fixed epoch ms
const TS = String(Math.floor(NOW / 1000)); // standard webhooks timestamp is SECONDS
const ID = "evt_123";
const BODY = `{"type":"subscription.active","data":{"id":"sub_1"}}`;

// Produce the signature header exactly as Polar/Standard Webhooks would, so the
// test exercises the real algorithm rather than a reimplementation of it.
function sign(body: string, secret: string, id: string, ts: string): string {
  const sig = createHmac("sha256", secret).update(`${id}.${ts}.${body}`).digest(
    "base64",
  );
  return `v1,${sig}`;
}

// WHY: a genuine Polar delivery — correct secret, fresh timestamp, untouched
// body — must be accepted, or we would reject every real subscription event and
// never provision a paid domain.
Deno.test("signature: accepts a genuine, fresh delivery", () => {
  const headers = {
    id: ID,
    timestamp: TS,
    signature: sign(BODY, SECRET, ID, TS),
  };
  assert(verifyPolarSignature(BODY, headers, SECRET, NOW));
});

// WHY: the signature is the only thing standing between us and a forged payload
// that would create a fake subscription and mint a free cert — a wrong secret or
// garbage signature must never authenticate.
Deno.test("signature: rejects a forged signature and a wrong secret", () => {
  assertFalse(
    verifyPolarSignature(
      BODY,
      { id: ID, timestamp: TS, signature: "v1,not-a-real-signature" },
      SECRET,
      NOW,
    ),
  );
  // A signature minted with a different secret must not verify under ours.
  const forged = {
    id: ID,
    timestamp: TS,
    signature: sign(BODY, "attacker-secret", ID, TS),
  };
  assertFalse(verifyPolarSignature(BODY, forged, SECRET, NOW));
});

// WHY: the signature binds the exact bytes; if a tampered body still verified,
// an attacker could swap in a different domain after Polar signed the event.
Deno.test("signature: rejects a tampered body", () => {
  const headers = {
    id: ID,
    timestamp: TS,
    signature: sign(BODY, SECRET, ID, TS),
  };
  const tampered = BODY.replace("sub_1", "sub_evil");
  assertFalse(verifyPolarSignature(tampered, headers, SECRET, NOW));
});

// WHY: an unsigned request (no headers, e.g. someone hitting the public URL
// directly) must be denied — absence of a signature is not a pass.
Deno.test("signature: rejects missing headers and an empty secret", () => {
  assertFalse(verifyPolarSignature(BODY, {}, SECRET, NOW));
  assertFalse(
    verifyPolarSignature(BODY, { id: ID, timestamp: TS }, SECRET, NOW),
  );
  // No configured secret must fail closed, not authenticate everything.
  const headers = { id: ID, timestamp: TS, signature: sign(BODY, "", ID, TS) };
  assertFalse(verifyPolarSignature(BODY, headers, "", NOW));
});

// WHY: a captured-and-replayed delivery (valid signature, old timestamp) must be
// rejected once it falls outside the tolerance window, so old events can't be
// re-fired to flip state later.
Deno.test("signature: rejects a stale timestamp outside tolerance", () => {
  const headers = {
    id: ID,
    timestamp: TS,
    signature: sign(BODY, SECRET, ID, TS),
  };
  const muchLater = NOW + 10 * 60 * 1000; // 10 min > 5 min default tolerance
  assertFalse(verifyPolarSignature(BODY, headers, SECRET, muchLater));
  // ...but still accepted while inside the window.
  assert(verifyPolarSignature(BODY, headers, SECRET, NOW + 60 * 1000));
});
