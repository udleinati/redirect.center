// Authorization for Caddy's on-demand TLS `ask`: "has this domain paid?"
//
// Phase 1 stub — authorize a single configured test domain only. Phase 2
// replaces this with datastore-backed scope matching (single / whole-domain),
// SNI normalization, and public-suffix validation.

export function isStubAuthorized(domain: string, allowedDomain: string): boolean {
  if (!domain || !allowedDomain) return false;
  return domain.toLowerCase() === allowedDomain.toLowerCase();
}
