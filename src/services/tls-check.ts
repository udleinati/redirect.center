// Decision for Caddy's on-demand TLS `ask` endpoint, extracted from the route
// handler so the full gate is unit-testable (the codebase tests pure modules,
// not wired routes). Returns the HTTP status Caddy interprets: 200 authorizes a
// certificate, anything else denies it for this handshake.
//
// Order matters and is the contract this module pins down: authorization is
// checked BEFORE the rate limiter, so a flood of *unpaid* SNIs is rejected
// cheaply (403) and never consumes issuance budget — otherwise an attacker could
// starve the limiter and block legitimate paid domains from ever issuing.

import type { IssuanceRateLimiter } from "./issuance-rate-limit.ts";

export type TlsCheckStatus = 400 | 403 | 429 | 200;

// `isAuthorized(host, now)` is injected (v2: the in-process AuthzCache; v1: a
// closure over the subscription list) so this gate stays decoupled from the data
// model and the authorization read never touches I/O on the handshake hot path.
export function decideTlsCheck(
  domain: string,
  isAuthorized: (host: string, now: number) => boolean,
  limiter: IssuanceRateLimiter,
  now: number,
): TlsCheckStatus {
  const host = domain.trim();
  if (!host) return 400;
  if (!isAuthorized(host, now)) return 403;
  // Paid — gate the actual issuance on the rolling rate limit.
  if (!limiter.tryAcquire(host, now)) return 429;
  return 200;
}
