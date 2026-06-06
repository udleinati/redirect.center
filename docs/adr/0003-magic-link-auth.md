# Passwordless magic-link authentication for the domain dashboard

## Context

v2 adds a "My Domains" dashboard, so a returning Customer must authenticate to redirect.center. The service has no accounts today and sends no email. Polar's customer sessions are merchant-initiated and authenticate against Polar's *own* portal, not against our app, so they cannot be the first factor; Polar's portal OTP logs the user into Polar with no authenticated hand-back to us.

## Decision

Authenticate with a **passwordless magic link owned by redirect.center**: the Customer enters an email, we look it up in Polar's customer directory, and (if found) email a short-lived **signed** link that establishes a session bound to the Polar `customer_id`. First login after checkout is skipped via a session minted from the completed checkout. Polar **customer sessions** are used only to deep-link into Polar's hosted portal for billing / Tier changes. Email is sent through a transactional provider behind a thin adapter (Resend by default).

## Considered options

- **OAuth (Google/GitHub)** — rejected: heavier integration, and the OAuth identity must be reconciled with the Polar email.
- **DNS challenge** — rejected: proves control of a *domain*, not of the *account*.
- **Cookie-only, defer email** — rejected: a Customer who loses the cookie or switches device would be locked out until email shipped.

## Consequences

- Introduces the project's **first outbound-email dependency** (the only new external service in v2).
- The only identity persisted is `customer_id` + email; no passwords.
- `/auth/request` must not reveal whether an email is a known Customer (anti-enumeration).
