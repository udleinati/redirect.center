// Polar webhook signature verification (module #3a — a thin wrapper).
//
// Polar follows the Standard Webhooks spec. The signed content is
//   "{webhook-id}.{webhook-timestamp}.{raw-body}"
// and the HMAC-SHA256 of it (base64) is sent as a space-separated list of
// "v1,<sig>" entries in the `webhook-signature` header. Polar derives the HMAC
// key from the raw secret string's UTF-8 bytes (it base64-encodes the secret and
// the Standard Webhooks lib base64-decodes it straight back), so we key the HMAC
// on the secret string verbatim — no `whsec_` stripping, no base64 step.

import { createHmac, timingSafeEqual } from "node:crypto";

const enc = new TextEncoder();

export interface WebhookHeaders {
  id?: string; // webhook-id
  timestamp?: string; // webhook-timestamp (unix SECONDS)
  signature?: string; // webhook-signature: "v1,<b64> v1,<b64> ..."
}

// Verify a Polar webhook delivery. `rawBody` MUST be the exact bytes received
// (the signature binds the body, so parse-then-reserialize would break it).
// `now` is epoch ms (injected so the timestamp/replay check is deterministic).
// Returns false — never throws — for any missing header, bad timestamp, replay
// outside tolerance, or signature mismatch.
export function verifyPolarSignature(
  rawBody: string,
  headers: WebhookHeaders,
  secret: string,
  now: number,
  toleranceMs: number = 5 * 60 * 1000,
): boolean {
  const { id, timestamp, signature } = headers;
  if (!secret || !id || !timestamp || !signature) return false;

  // Reject replays: the timestamp must be recent in either direction.
  const tsSeconds = Number(timestamp);
  if (!Number.isFinite(tsSeconds)) return false;
  if (Math.abs(now - tsSeconds * 1000) > toleranceMs) return false;

  const expected = createHmac("sha256", secret)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest("base64");
  const expectedBytes = enc.encode(expected);

  // The header carries one or more space-delimited "v<n>,<sig>" tokens; a match
  // on any v1 entry authenticates the delivery (constant-time comparison).
  for (const token of signature.split(" ")) {
    const comma = token.indexOf(",");
    if (comma < 0) continue;
    if (token.slice(0, comma) !== "v1") continue;
    const sigBytes = enc.encode(token.slice(comma + 1));
    if (sigBytes.length === expectedBytes.length && timingSafeEqual(sigBytes, expectedBytes)) {
      return true;
    }
  }
  return false;
}
