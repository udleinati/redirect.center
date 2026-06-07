# Durable Domain store in on-box Postgres, with an in-process authorization cache

## Context

In v2 the domain _list_ is owned by redirect.center, not Polar (Polar holds only
the Tier/count). The store holding Domains is therefore a **source of truth**,
not a rebuildable cache — reversing the v1 decision that the subscription store
is a disposable SQLite cache with Polar as the source of truth. Separately,
`/tls-check` runs **inside the TLS handshake** and must answer synchronously in
milliseconds, offline.

## Decision

Persist Domains and Plans in a **Postgres container running on the box** (same
Compose stack) as the durable source of truth. The `/tls-check` authorization
path reads from an **in-process cache** refreshed on webhook / domain-change and
by periodic reconcile — never a per-handshake database round-trip. A periodic
`pg_dump` to the existing S3 bucket provides disaster recovery.

## Considered options

- **Keep embedded SQLite + snapshot the Domain table to S3** — simpler, no new
  container, keeps the box disposable; not chosen (operator preferred a real
  database).
- **Managed Postgres (RDS/Neon)** — keeps state off-box and enables HA; deferred
  to avoid external cost/dependency while single-instance remains the target.

## Consequences

- Reverses v1's "embedded SQLite, no DB container, Postgres out of scope,
  effectively stateless box" decisions (PRD §Datastore / §Infrastructure, Phase
  6).
- The box is no longer trivially disposable: recovery depends on the Postgres
  volume **plus** the `pg_dump`→S3 backup.
- Adds ~50–150 MB RAM on the t3.small (2 GB) — fits but tightens the budget;
  monitor.
- The in-process cache is **mandatory**, not optional, to preserve handshake
  latency and availability.
