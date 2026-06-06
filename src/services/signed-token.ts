// Signed tokens for the dashboard's passwordless auth (ADR-0003), HMAC-SHA256.
// Pure & deterministic — the caller supplies `exp`, `jti`, and `now`, so signing
// and every rejection path (expiry, tamper, replay) are exhaustively testable.
//
// Two uses share this module:
//   • magic link — short TTL, carries a `jti`; single-use is enforced via the
//     injected `isConsumed` predicate (the app tracks spent jtis out of band).
//   • session cookie — long TTL, rolling (re-signed on each request), no jti.
//
// Wire format:  base64url(JSON(claims)) "." base64url(HMAC-SHA256(part1))
// `claims.purpose` separates magic from session so a magic link can never be
// replayed as a session cookie (or vice-versa); the caller checks it.

import { createHmac, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";

export type Purpose = "magic" | "session";

export interface Claims {
  purpose: Purpose;
  customerId: string;
  email: string;
  exp: number; // epoch ms; verification requires now < exp
  jti?: string; // present on single-use magic links
}

export type VerifyResult =
  | { ok: true; claims: Claims }
  | {
    ok: false;
    reason: "malformed" | "bad-signature" | "expired" | "replayed";
  };

function sign(part: string, secret: string): string {
  return createHmac("sha256", secret).update(part).digest("base64url");
}

// Serialize + sign complete claims. The caller computes `exp` (issuedAt + ttl)
// and any `jti`, keeping this function a pure function of its inputs.
export function signToken(claims: Claims, secret: string): string {
  const payload = Buffer.from(JSON.stringify(claims), "utf8").toString(
    "base64url",
  );
  return `${payload}.${sign(payload, secret)}`;
}

// Verify signature (constant-time) then expiry then single-use. `isConsumed` is
// injected so the replay rule is testable without any shared state; the app wires
// it to its spent-jti set. A token without a `jti` is never treated as replayable.
export function verifyToken(
  token: string,
  secret: string,
  now: number,
  opts: { isConsumed?: (jti: string) => boolean } = {},
): VerifyResult {
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) {
    return { ok: false, reason: "malformed" };
  }
  const payload = token.slice(0, dot);
  const providedSig = token.slice(dot + 1);

  // Constant-time compare against the recomputed signature. Any change to the
  // payload changes the expected signature, so tampering surfaces here.
  const expectedSig = sign(payload, secret);
  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad-signature" };
  }

  let claims: Claims;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (
    !claims || typeof claims.customerId !== "string" ||
    typeof claims.exp !== "number" ||
    (claims.purpose !== "magic" && claims.purpose !== "session")
  ) {
    return { ok: false, reason: "malformed" };
  }

  if (now >= claims.exp) return { ok: false, reason: "expired" };
  if (claims.jti && opts.isConsumed?.(claims.jti)) {
    return { ok: false, reason: "replayed" };
  }
  return { ok: true, claims };
}
