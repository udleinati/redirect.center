import { assert, assertEquals, assertFalse } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  type CertStore,
  certHostFromKey,
  certificatesPrefix,
  certKeyBelongsToScope,
  deleteCertsForSubscription,
} from "./cert-teardown.ts";

// A cert object key as CertMagic lays it out, for a given host/extension.
function key(host: string, ext = "crt", prefix = "certs", issuer = "acme-v02.api.letsencrypt.org-directory") {
  return `${prefix}/certificates/${issuer}/${host}/${host}.${ext}`;
}

// WHY: teardown anchors on the host parsed from the key; if parsing missed the
// prefix depth or returned the issuer/extension instead, we'd match the wrong
// objects. It must also ignore non-cert objects (locks/ocsp) entirely.
Deno.test("teardown: parses the host from a cert key, ignores non-cert keys", () => {
  assertEquals(certHostFromKey(key("example.com")), "example.com");
  assertEquals(certHostFromKey(key("a.b.example.com", "key", "certs/sub")), "a.b.example.com");
  assertEquals(certHostFromKey("certs/locks/issue_cert_example.com.lock"), null);
  assertEquals(certHostFromKey("certs/ocsp/example.com"), null);
});

// WHY: a single-apex revoke must remove exactly the apex and its www cert (the
// two issuance covers) and never a sibling's cert — over-deletion would break a
// different paying customer's HTTPS.
Deno.test("teardown: single apex matches apex + www only", () => {
  assert(certKeyBelongsToScope(key("example.com"), "example.com", "single"));
  assert(certKeyBelongsToScope(key("www.example.com"), "example.com", "single"));
  assertFalse(certKeyBelongsToScope(key("blog.example.com"), "example.com", "single"));
  assertFalse(certKeyBelongsToScope(key("other.com"), "example.com", "single"));
});

// WHY: a whole-domain revoke must tear down the apex AND every issued subdomain
// cert at any depth, or HTTPS would survive on subdomains the customer stopped
// paying for — while still never touching a different registrable domain.
Deno.test("teardown: whole-domain matches apex and any-depth subdomain only", () => {
  assert(certKeyBelongsToScope(key("example.com"), "example.com", "whole-domain"));
  assert(certKeyBelongsToScope(key("a.b.c.example.com"), "example.com", "whole-domain"));
  assertFalse(certKeyBelongsToScope(key("example.com.attacker.com"), "example.com", "whole-domain"));
  assertFalse(certKeyBelongsToScope(key("notexample.com"), "example.com", "whole-domain"));
});

// In-memory CertStore: records list/delete calls so the orchestration can be
// asserted without touching real S3.
function fakeStore(keys: string[]) {
  const deleted: string[] = [];
  let listedPrefix: string | undefined;
  const store: CertStore = {
    // deno-lint-ignore require-await
    async *listObjects({ prefix }) {
      listedPrefix = prefix;
      for (const k of keys) yield { key: k };
    },
    // deno-lint-ignore require-await
    async deleteObject(name: string) {
      deleted.push(name);
      return undefined;
    },
  };
  return { store, deleted, prefix: () => listedPrefix };
}

// WHY: end-to-end the delete pass must remove the whole subtree's objects (crt,
// key, json across hosts) and leave unrelated domains' objects untouched — this
// is the behavior that actually stops HTTPS for the revoked domain.
Deno.test("teardown: deletes only the covered subtree's objects", async () => {
  const keys = [
    key("example.com", "crt"),
    key("example.com", "key"),
    key("www.example.com", "crt"),
    key("blog.example.com", "json"),
    key("other.com", "crt"), // unrelated customer — must survive
    "certs/locks/issue_cert_example.com.lock", // not a cert object — must survive
  ];
  const { store, deleted, prefix } = fakeStore(keys);

  const removed = await deleteCertsForSubscription(store, "certs", "example.com", "whole-domain");

  assertEquals(prefix(), "certs/certificates/"); // only scans under the cert prefix
  assertEquals(removed.sort(), [
    key("blog.example.com", "json"),
    key("example.com", "crt"),
    key("example.com", "key"),
    key("www.example.com", "crt"),
  ].sort());
  assertEquals(deleted.sort(), removed.sort());
  assertFalse(deleted.includes(key("other.com", "crt")));
  assertFalse(deleted.includes("certs/locks/issue_cert_example.com.lock"));
});

Deno.test("teardown: certificatesPrefix is prefix-correct and empty-prefix safe", () => {
  assertEquals(certificatesPrefix("certs"), "certs/certificates/");
  assertEquals(certificatesPrefix("/certs/"), "certs/certificates/");
  assertEquals(certificatesPrefix(""), "certificates/");
});
