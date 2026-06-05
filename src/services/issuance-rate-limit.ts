// On-demand TLS issuance rate limiter (Phase 7).
//
// Caddy removed the built-in on_demand_tls rate limit (`interval`/`burst`) in
// v2.9 (caddyserver/caddy#6611); the supported place to bound issuance velocity
// is now the `ask` endpoint. This caps how many *new* certificates can be
// authorized per rolling window, so a flood of TLS handshakes can't trigger mass
// ACME issuance and exhaust the Let's Encrypt account's order limits — even for
// paid domains. (`ask`/authorization already denies unpaid SNIs before they ever
// reach the limiter, so this is the second layer the PRD calls for.)
//
// In-memory and per-process — the app runs single-instance, and certs persist in
// S3, so a restart that drops this state is harmless (at worst it re-allows a
// burst). Not pure (it holds counters), but `now` is injected on every call so
// the window/dedup behavior is deterministically unit-testable.

export class IssuanceRateLimiter {
  readonly #limit: number;
  readonly #windowMs: number;
  readonly #dedupMs: number;
  // Epoch-ms timestamps of recent new-domain authorizations (issuance events).
  #events: number[] = [];
  // domain -> last time it was authorized. Collapses the several `ask` calls
  // Caddy makes for a single issuance (and renewal retries) into one event, so a
  // single legitimate domain can never drain the window on its own.
  #lastSeen = new Map<string, number>();

  constructor(limit: number, windowMs: number, dedupMs: number) {
    this.#limit = limit;
    this.#windowMs = windowMs;
    this.#dedupMs = dedupMs;
  }

  // Returns true if a certificate for `domain` may be issued now. A domain seen
  // within `dedupMs` is always allowed and consumes no budget (its issuance is
  // already in flight, or its cert is renewing). A genuinely new domain consumes
  // one slot in the rolling window; once `limit` slots are taken, further new
  // domains are denied until older events age out of the window.
  tryAcquire(domain: string, now: number): boolean {
    const last = this.#lastSeen.get(domain);
    if (last !== undefined && now - last < this.#dedupMs) {
      this.#lastSeen.set(domain, now);
      return true;
    }

    this.#prune(now);
    if (this.#events.length >= this.#limit) return false;

    this.#events.push(now);
    this.#lastSeen.set(domain, now);
    return true;
  }

  // Drop events outside the window and lastSeen entries old enough that the
  // domain would count as new again — bounds memory to domains seen recently.
  #prune(now: number): void {
    const eventCutoff = now - this.#windowMs;
    this.#events = this.#events.filter((t) => t > eventCutoff);

    const seenCutoff = now - Math.max(this.#windowMs, this.#dedupMs);
    for (const [domain, t] of this.#lastSeen) {
      if (t <= seenCutoff) this.#lastSeen.delete(domain);
    }
  }
}
