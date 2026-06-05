// Authorization for Caddy's on-demand TLS `ask`: "has this domain paid?"
//
// Pure scope-matching module (no I/O): given a normalized SNI and a set of
// candidate Subscription rows, decide whether a certificate may be issued.
// Kept side-effect free so the rules below are exhaustively unit-testable.

import { get as registrableDomainOf } from "psl";

export type Scope = "single" | "whole-domain";

export interface Subscription {
  polarSubscriptionId: string; // provider id; unique key / idempotency anchor
  domain: string; // normalized: lowercase, no trailing dot, punycode
  scope: Scope;
  status: "active" | "inactive";
  currentPeriodEnd: number; // epoch ms; authorization requires now < this
  createdAt: number;
  updatedAt: number;
}

// Normalize an SNI/hostname for comparison: trim, strip trailing dot(s),
// lowercase, and convert IDN labels to ASCII (punycode). Returns "" when the
// input can't be parsed as a hostname.
export function normalizeDomain(input: string): string {
  const trimmed = input.trim().replace(/\.+$/, "");
  if (!trimmed) return "";
  let host: string;
  try {
    host = new URL(`https://${trimmed}/`).hostname;
  } catch {
    host = trimmed;
  }
  return host.replace(/\.+$/, "").toLowerCase();
}

// True when `domain` is its own registrable (base) domain per the public suffix
// list — e.g. example.com and example.co.uk, but NOT a public suffix like "com"
// / "co.uk" (psl returns null) nor a subdomain like "www.example.com".
export function isRegistrableDomain(domain: string): boolean {
  return !!domain && registrableDomainOf(domain) === domain;
}

// Pure authorization decision. `now` is epoch ms; `subscriptions` are candidate
// rows (the store may pre-filter, but this re-checks status/period itself).
export function isAuthorized(
  sni: string,
  subscriptions: readonly Subscription[],
  now: number,
): boolean {
  const host = normalizeDomain(sni);
  if (!host) return false;
  return subscriptions.some((sub) => authorizes(sub, host, now));
}

function authorizes(sub: Subscription, host: string, now: number): boolean {
  // A subscription only grants access while active and within its paid period.
  if (sub.status !== "active") return false;
  if (now >= sub.currentPeriodEnd) return false;

  const domain = sub.domain;
  if (!domain) return false;

  if (sub.scope === "single") {
    if (host === domain) return true;
    // A single-domain purchase for an apex also covers its `www` host.
    return isRegistrableDomain(domain) && host === `www.${domain}`;
  }

  // whole-domain: the registrable domain plus any subdomain at any depth.
  // Reject targets that aren't a registrable domain (e.g. a public suffix
  // like "com"), so a purchase can never blanket-authorize an entire TLD.
  if (!isRegistrableDomain(domain)) return false;
  return host === domain || host.endsWith(`.${domain}`);
}
