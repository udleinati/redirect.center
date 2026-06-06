// Whether a Customer may add a Domain to a Scope (Phase 11) — pure, no I/O, so the
// dashboard's write path is exhaustively testable. The handler gathers the inputs
// (the Plan's cap and the Customer's existing active Domains) and applies this
// decision before writing. See PRD "Domain rules (v2)".
//
// Rules, in the order they're reported (most specific cause first):
//   1. format        — normalizes to a real host, else "invalid"
//   2. scope shape    — whole-domain must be a registrable domain; single must sit
//                       under one (not a bare public suffix) → "not-registrable"
//   3. plan present   — an active Plan must back the Scope → "no-plan"
//   4. duplicate      — already an active Domain in this Scope → "duplicate"
//   5. redundant      — a single Host already covered by an active whole-domain
//                       Domain wastes a Cap slot → "redundant"
//   6. capacity       — active count must be below the Cap → "over-cap" (also the
//                       post-downgrade grace state: over Cap blocks new adds)

import {
  coversHost,
  hasRegistrableDomain,
  isRegistrableDomain,
  normalizeDomain,
  type Scope,
} from "./authorization.ts";

export type AddRejectCode =
  | "invalid"
  | "not-registrable"
  | "no-plan"
  | "duplicate"
  | "redundant"
  | "over-cap";

export interface AddDomainInput {
  raw: string; // the domain as typed by the Customer
  scope: Scope; // the Scope they're adding it to
  cap: number; // the active Plan's cap in this Scope (0 = no active Plan)
  existingInScope: readonly string[]; // their active Domains in this Scope (normalized)
  wholeDomains: readonly string[]; // their active whole-domain Domains (normalized)
}

export type AddDecision =
  | { ok: true; domain: string }
  | { ok: false; code: AddRejectCode; message: string };

export function decideAddDomain(input: AddDomainInput): AddDecision {
  const domain = normalizeDomain(input.raw);
  if (!domain) {
    return { ok: false, code: "invalid", message: "Enter a valid domain." };
  }

  if (input.scope === "whole-domain") {
    if (!isRegistrableDomain(domain)) {
      return {
        ok: false,
        code: "not-registrable",
        message:
          "Whole-domain coverage needs a registrable domain like example.com.",
      };
    }
  } else if (!hasRegistrableDomain(domain)) {
    // A bare public suffix ("com") is not a host anyone can point at the service.
    return {
      ok: false,
      code: "not-registrable",
      message: "Enter a valid domain.",
    };
  }

  if (input.cap <= 0) {
    return {
      ok: false,
      code: "no-plan",
      message: "No active plan for this scope.",
    };
  }

  if (input.existingInScope.includes(domain)) {
    return {
      ok: false,
      code: "duplicate",
      message: `${domain} is already on your list.`,
    };
  }

  // A single Host already inside one of the Customer's whole-domain Domains would
  // burn a Cap slot for coverage they already have.
  if (input.scope === "single") {
    const covering = input.wholeDomains.find((w) =>
      coversHost(w, "whole-domain", domain)
    );
    if (covering) {
      return {
        ok: false,
        code: "redundant",
        message:
          `${domain} is already covered by your whole-domain plan (${covering}).`,
      };
    }
  }

  // Capacity / grace: at or over Cap, no new add. `>=` also blocks the
  // post-downgrade over-Cap state (existing Domains keep serving; adds don't).
  if (input.existingInScope.length >= input.cap) {
    return {
      ok: false,
      code: "over-cap",
      message:
        `You've used all ${input.cap} domains in this plan. Upgrade to add more.`,
    };
  }

  return { ok: true, domain };
}
