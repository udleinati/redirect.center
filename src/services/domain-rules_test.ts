import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { type AddDomainInput, decideAddDomain } from "./domain-rules.ts";

function input(overrides: Partial<AddDomainInput>): AddDomainInput {
  return {
    raw: "example.com",
    scope: "single",
    cap: 5,
    existingInScope: [],
    wholeDomains: [],
    ...overrides,
  };
}

// WHY: the happy path — a fresh host under cap is the whole point of the dashboard,
// and the stored value must be the normalized form (not whatever case/dots the user
// typed) so it matches what the authorizer compares against.
Deno.test("a valid host within cap is accepted and normalized", () => {
  const res = decideAddDomain(
    input({ raw: "  WWW.Example.COM.  ", scope: "single" }),
  );
  assert(res.ok);
  assertEquals(res.domain, "www.example.com");
});

// WHY: whole-domain coverage is sold per registrable domain; letting someone buy it
// for a subdomain would over-promise (they'd expect siblings covered) and for a
// public suffix would blanket a whole TLD.
Deno.test("whole-domain must target a registrable domain", () => {
  const sub = decideAddDomain(
    input({ raw: "app.example.com", scope: "whole-domain" }),
  );
  assert(!sub.ok);
  assertEquals(sub.code, "not-registrable");

  const tld = decideAddDomain(input({ raw: "com", scope: "whole-domain" }));
  assert(!tld.ok);
  assertEquals(tld.code, "not-registrable");

  const ok = decideAddDomain(
    input({ raw: "example.co.uk", scope: "whole-domain", cap: 1 }),
  );
  assert(ok.ok);
});

// WHY: a single Domain may be any real host (apex OR subdomain), but never a bare
// public suffix — there's no host to issue a cert for.
Deno.test("single accepts a subdomain but rejects a bare public suffix", () => {
  assert(
    decideAddDomain(input({ raw: "deep.app.example.com", scope: "single" })).ok,
  );
  const tld = decideAddDomain(input({ raw: "co.uk", scope: "single" }));
  assert(!tld.ok);
  assertEquals(tld.code, "not-registrable");
});

// WHY: a Customer with no active Plan in a Scope has bought no capacity there, so an
// add must be refused rather than silently creating an unbacked Domain.
Deno.test("no active plan in the scope refuses the add", () => {
  const res = decideAddDomain(input({ cap: 0 }));
  assert(!res.ok);
  assertEquals(res.code, "no-plan");
});

// WHY: re-adding a domain already on the list must not consume a second Cap slot —
// it's reported as a duplicate, not counted toward capacity.
Deno.test("an exact duplicate is rejected", () => {
  const res = decideAddDomain(
    input({ raw: "example.com", existingInScope: ["example.com"] }),
  );
  assert(!res.ok);
  assertEquals(res.code, "duplicate");
});

// WHY: a single Host already inside one of the Customer's whole-domain Domains is
// already served — adding it as a single would waste a paid slot on redundant
// coverage. This is the cross-scope rule from the PRD.
Deno.test("a single host already covered by a whole-domain is redundant", () => {
  const res = decideAddDomain(input({
    raw: "shop.acme.com",
    scope: "single",
    wholeDomains: ["acme.com"],
  }));
  assert(!res.ok);
  assertEquals(res.code, "redundant");
});

// WHY: capacity is the Cap's whole purpose — at the limit, the next add must be
// refused with an upgrade prompt, not quietly exceed what the Customer paid for.
Deno.test("adding at the cap is refused", () => {
  const res = decideAddDomain(input({
    scope: "single",
    cap: 2,
    raw: "c.com",
    existingInScope: ["a.com", "b.com"],
  }));
  assert(!res.ok);
  assertEquals(res.code, "over-cap");
});

// WHY: after a downgrade a Customer can sit ABOVE the new Cap (grace — existing
// Domains keep serving). The rule must still block *new* adds in that state, never
// let them climb further from an already-over-Cap position.
Deno.test("an over-cap (post-downgrade) account cannot add more", () => {
  const res = decideAddDomain(input({
    scope: "single",
    cap: 2,
    raw: "d.com",
    existingInScope: ["a.com", "b.com", "c.com"], // 3 active under a cap of 2
  }));
  assert(!res.ok);
  assertEquals(res.code, "over-cap");
});
