import { assert, assertEquals, assertFalse } from "@std/assert";
import {
  coversHost,
  isRegistrableDomain,
  normalizeDomain,
} from "./authorization.ts";

// The pure scope geometry shared by both authorization (v2 `authorizeHost`) and
// cert teardown. The v2 union/cap/per-Customer rules are covered in
// authorization_v2_test.ts; here we pin the "what a purchase covers" primitives
// (status/period live above this layer).

// WHY: a `single` apex purchase must protect exactly the apex and its www host —
// the two forms a visitor types — and nothing else, or it would leak free certs
// to sibling hosts the customer never paid for.
Deno.test("single apex covers apex and www, denies siblings", () => {
  assert(coversHost("example.com", "single", "example.com"));
  assert(coversHost("example.com", "single", "www.example.com"));
  assertFalse(coversHost("example.com", "single", "blog.example.com"));
  assertFalse(coversHost("example.com", "single", "other.com"));
});

// WHY: a `single` purchase for a non-apex host (a subdomain) covers only that
// exact host — there is no apex, so the www convenience does not apply.
Deno.test("single non-apex covers only the exact host", () => {
  assert(coversHost("blog.example.com", "single", "blog.example.com"));
  assertFalse(coversHost("blog.example.com", "single", "www.blog.example.com"));
  assertFalse(coversHost("blog.example.com", "single", "example.com"));
});

// WHY: `whole-domain` is the premium tier — it must cover the apex and any
// subdomain at any depth, which is the whole point a customer pays more for.
Deno.test("whole-domain covers apex and arbitrary-depth subdomains", () => {
  assert(coversHost("example.com", "whole-domain", "example.com"));
  assert(coversHost("example.com", "whole-domain", "www.example.com"));
  assert(coversHost("example.com", "whole-domain", "a.b.c.example.com"));
  // ...but never a different registrable domain that merely shares a suffix.
  assertFalse(
    coversHost("example.com", "whole-domain", "example.com.attacker.com"),
  );
  assertFalse(coversHost("example.com", "whole-domain", "notexample.com"));
});

// WHY: Caddy passes the raw SNI; without normalization a mixed-case, dotted, or
// IDN hostname would silently miss its Domain and be denied a cert. Coverage is
// only meaningful once both sides are normalized to the same form.
Deno.test("SNI is normalized (case, trailing dot, IDN) before matching", () => {
  assertEquals(normalizeDomain("EXAMPLE.com."), "example.com");
  assert(coversHost("example.com", "single", normalizeDomain("EXAMPLE.com.")));
  assert(
    coversHost("example.com", "single", normalizeDomain("WWW.Example.COM")),
  );

  // IDN apex stored in punycode is matched from its Unicode SNI form.
  assertEquals(normalizeDomain("Bücher.example"), "xn--bcher-kva.example");
  assert(
    coversHost(
      "xn--bcher-kva.example",
      "single",
      normalizeDomain("Bücher.example"),
    ),
  );
});

// WHY: a whole-domain target that is a public suffix (e.g. *.com) would let one
// payment hijack certs for every domain under a TLD — it must never authorize.
Deno.test("whole-domain targeting a public suffix is rejected", () => {
  assertFalse(isRegistrableDomain("com"));
  assertFalse(isRegistrableDomain("co.uk"));
  assertFalse(coversHost("com", "whole-domain", "anything.com"));
  assertFalse(coversHost("com", "whole-domain", "com"));
});
