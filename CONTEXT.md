# redirect.center

Free HTTP domain redirects driven by DNS, with an optional paid tier that adds HTTPS. This glossary covers the **paid HTTPS** language (the free redirect engine has its own well-established vocabulary in the code).

## Language

### Account & billing

**Customer**:
The billable account — a single Polar customer, identified by email. Owns Plans and Domains.
_Avoid_: account, user, client, "domain owner" (when meaning the billable entity).

**Plan**:
A Customer's active subscription to one Tier within a Scope. Defines the Cap. A Customer holds at most one Plan per Scope.
_Avoid_: entitlement, package, seat.

**Tier**:
A bundle size within a Scope's ladder (e.g. up to 1 / 5 / 25 Domains), sold as a distinct product. Growing means upgrading to a higher Tier.
_Avoid_: level, quantity.

**Cap**:
The maximum number of active Domains a Plan allows in its Scope.
_Avoid_: quota, limit, seats, quantity.

### Coverage

**Domain**:
A unit of HTTPS coverage a Customer has enabled — one hostname (under `single`) or one registrable domain (under `whole-domain`). App-owned and durable.
_Avoid_: site, subscription.

**Scope**:
What a Domain's coverage spans: **single** (the exact host plus its `www`) or **whole-domain** (the registrable domain and every subdomain).
_Avoid_: tier (Tier = size, not coverage), plan.

**Host**:
The FQDN on an incoming request (the SNI / `Host` header) that the redirect engine and the authorization check evaluate. A single Domain can authorize several Hosts (e.g. a whole-domain Domain authorizes every subdomain Host).
_Avoid_: using "domain" for a request's hostname.

## Flagged ambiguities

- **"account"** → always **Customer**.
- **"domain"** is overloaded: the purchased coverage unit is a **Domain**; the hostname on a request is a **Host**.
- **"subscription"** is the Polar billing object; the redirect.center concept layered on top of it is the **Plan** (a Tier + its Cap).

## Example dialogue

> **Dev:** A customer bought the "up to 5" single Tier. Do they pick which domains?
> **Operator:** Yes — that Plan gives a Cap of 5 in the single Scope. They add up to 5 Domains themselves; each single Domain authorizes its Host plus the `www` Host.
> **Dev:** And if the same customer also wants a whole subdomain tree?
> **Operator:** That's a separate Plan in the whole-domain Scope, with its own Cap. One Customer, two Plans, two ladders.
> **Dev:** So `app.acme.com` arriving over HTTPS…
> **Operator:** That's a Host. It's authorized if some active Domain of an active Plan covers it — an exact single Domain `app.acme.com`, or a whole-domain Domain `acme.com`.
