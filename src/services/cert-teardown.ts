// Certificate teardown (module #5). On a revoke we must delete the issued cert
// objects from S3 — not just deny future `ask` checks — because the proxy does
// not reliably re-consult `ask` when renewing an already-issued on-demand cert.
// Removing the cert is what actually stops HTTPS; the next request then has no
// cert and falls through to the fallback page (Phase 5).
//
// CertMagic (the proxy's cert manager) lays certs out under the storage prefix as
//   {prefix}/certificates/{issuer}/{host}/{host}.{crt,key,json}
// so a host's objects all share the ".../certificates/{issuer}/{host}/" segment.
// We list under "{prefix}/certificates/", pull the host from each key, and delete
// every object whose host is covered by the revoked subscription's scope.

import { coversHost, normalizeDomain, type Scope } from "./authorization.ts";

// The slice of an S3 client we need; satisfied structurally by s3-lite-client's
// S3Client. Kept narrow so the pure helpers below stay free of any S3 dependency.
export interface CertStore {
  listObjects(options: { prefix?: string }): AsyncIterable<{ key: string }>;
  deleteObject(objectName: string): Promise<unknown>;
}

// The S3 key prefix under which all cert objects live, for a given storage prefix.
export function certificatesPrefix(storagePrefix: string): string {
  const p = storagePrefix.replace(/^\/+|\/+$/g, "");
  return p ? `${p}/certificates/` : "certificates/";
}

// Extract the normalized host a cert object belongs to, or null if the key isn't
// a per-host cert object. Robust to the storage prefix having any depth: we
// anchor on the "certificates" segment and take host = the segment two after it
// ({issuer}/{host}). Returns null for keys without that shape (locks, ocsp, ...).
export function certHostFromKey(key: string): string | null {
  const parts = key.split("/").filter(Boolean);
  const i = parts.indexOf("certificates");
  if (i < 0 || i + 2 >= parts.length) return null;
  const host = normalizeDomain(parts[i + 2]);
  return host || null;
}

// Does a cert object key belong to a subscription for (domain, scope)? This is
// the dangerous decision — deleting too much would kill another customer's cert,
// deleting too little would leave HTTPS up after a revoke — so it is pure and
// unit-tested, reusing the same scope geometry that authorized issuance.
export function certKeyBelongsToScope(
  key: string,
  domain: string,
  scope: Scope,
): boolean {
  const host = certHostFromKey(key);
  return host !== null && coversHost(domain, scope, host);
}

// Delete every cert object covered by the revoked subscription's (domain, scope).
// Returns the keys deleted. I/O only — the matching decision lives in the pure
// helper above. A whole-domain revoke removes the apex plus all issued subdomain
// certs; a single revoke removes the host (and the apex's www, mirroring issuance).
export async function deleteCertsForSubscription(
  store: CertStore,
  storagePrefix: string,
  domain: string,
  scope: Scope,
): Promise<string[]> {
  const normalized = normalizeDomain(domain);
  if (!normalized) return [];

  const toDelete: string[] = [];
  for await (
    const obj of store.listObjects({
      prefix: certificatesPrefix(storagePrefix),
    })
  ) {
    if (certKeyBelongsToScope(obj.key, normalized, scope)) {
      toDelete.push(obj.key);
    }
  }

  const deleted: string[] = [];
  for (const key of toDelete) {
    await store.deleteObject(key);
    deleted.push(key);
  }
  return deleted;
}
