import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { type Claims, signToken, verifyToken } from "./signed-token.ts";

const SECRET = "test-signing-secret";
const NOW = 1_700_000_000_000;

function magic(overrides: Partial<Claims> = {}): Claims {
  return {
    purpose: "magic",
    customerId: "cus_123",
    email: "owner@example.com",
    exp: NOW + 15 * 60 * 1000,
    jti: "nonce-1",
    ...overrides,
  };
}

// WHY: the happy path is the whole product — a freshly minted link must round-trip
// back to the exact identity it was signed for, or the session would bind the wrong
// Customer to the dashboard.
Deno.test("a valid token verifies and returns its claims", () => {
  const token = signToken(magic(), SECRET);
  const res = verifyToken(token, SECRET, NOW);
  assert(res.ok);
  assertEquals(res.claims.customerId, "cus_123");
  assertEquals(res.claims.email, "owner@example.com");
  assertEquals(res.claims.purpose, "magic");
});

// WHY: a 15-minute link that still worked an hour later would defeat the point of a
// short-lived credential — an intercepted old email could be replayed forever.
Deno.test("an expired token is rejected", () => {
  const token = signToken(magic({ exp: NOW }), SECRET);
  const res = verifyToken(token, SECRET, NOW); // now === exp, not strictly before
  assert(!res.ok);
  assertEquals(res.reason, "expired");
  // Still valid one millisecond before expiry.
  assert(verifyToken(token, SECRET, NOW - 1).ok);
});

// WHY: the signature is the only thing stopping a Customer from editing the
// customerId in their own cookie and impersonating another account — tampering must
// fail closed, not silently pass through the altered claims.
Deno.test("a tampered payload is rejected (cannot forge another customerId)", () => {
  const token = signToken(magic({ customerId: "cus_123" }), SECRET);
  const [payload, sig] = token.split(".");
  // Re-sign nothing: swap in a forged payload but keep the original signature.
  const forgedPayload = btoa(JSON.stringify(magic({ customerId: "cus_999" })))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const forged = `${forgedPayload}.${sig}`;
  const res = verifyToken(forged, SECRET, NOW);
  assert(!res.ok);
  assertEquals(res.reason, "bad-signature");
  // Sanity: the untouched token still verifies, so the rejection is the tamper.
  assert(verifyToken(`${payload}.${sig}`, SECRET, NOW).ok);
});

// WHY: a token minted by anyone without the server's secret must not be trusted —
// this is what makes the session unforgeable.
Deno.test("a token signed with a different secret is rejected", () => {
  const token = signToken(magic(), "attacker-secret");
  const res = verifyToken(token, SECRET, NOW);
  assert(!res.ok);
  assertEquals(res.reason, "bad-signature");
});

// WHY: a magic link is single-use — clicking it twice (or an attacker replaying a
// captured link) must fail the second time, even though the signature and expiry are
// still valid. The app marks the jti spent after first use; here we inject that.
Deno.test("a replayed (already-consumed) magic token is rejected", () => {
  const token = signToken(magic({ jti: "spent-nonce" }), SECRET);
  // First use: nothing consumed yet → ok.
  assert(verifyToken(token, SECRET, NOW, { isConsumed: () => false }).ok);
  // Second use: the jti is now spent → replayed.
  const res = verifyToken(token, SECRET, NOW, {
    isConsumed: (jti) => jti === "spent-nonce",
  });
  assert(!res.ok);
  assertEquals(res.reason, "replayed");
});

// WHY: malformed input (truncated cookie, random string) must be a clean rejection,
// never an exception that 500s the auth route.
Deno.test("malformed tokens are rejected cleanly", () => {
  for (const bad of ["", ".", "abc", "no-dot", "a.", ".b"]) {
    const res = verifyToken(bad, SECRET, NOW);
    assert(!res.ok, `expected rejection for ${JSON.stringify(bad)}`);
  }
});
