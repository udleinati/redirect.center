#!/bin/sh
# Periodic pg_dump of the v2 durable store (Plans + Domains) to the S3 bucket that
# already holds the certs (ADR-0002, Phase 12). Certs persist in S3 and Plans
# rebuild from Polar via `deno task reconcile`, so THIS dump is the only thing that
# makes the app-owned Domain list recoverable. Losing the Postgres volume WITHOUT a
# recent dump = Domain-list data loss (the explicit durability boundary).
#
# Run on a schedule from the host (the app does not schedule it), e.g. daily cron:
#   0 4 * * * cd /srv/redirect.center && docker compose --env-file docker/prod.env \
#             -f docker-compose.prod.yml run --rm pg-backup
#
# Restore into a fresh Postgres — see README "Durability & backup".
set -eu

: "${DATABASE_URL:?DATABASE_URL required}"
: "${S3_BUCKET:?S3_BUCKET required}"

PREFIX="${S3_BACKUP_PREFIX:-backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
KEY="s3://${S3_BUCKET}/${PREFIX}/redirect-${STAMP}.sql.gz"

# Non-AWS S3 (RustFS in dev) needs an explicit endpoint + path-style addressing;
# real AWS leaves S3_ENDPOINT_URL unset and uses virtual-hosted style.
ENDPOINT_ARG=""
if [ -n "${S3_ENDPOINT_URL:-}" ]; then
  aws configure set default.s3.addressing_style path
  ENDPOINT_ARG="--endpoint-url ${S3_ENDPOINT_URL}"
fi

echo "[backup] dumping plans+domains -> ${KEY}"
# --no-owner/--no-privileges so the dump restores cleanly into any role. pg_dump's
# nonzero exit (set -e + pipefail-less sh) is caught by checking the pipeline head
# below — but sh has no pipefail, so we dump to a temp file first to fail loud.
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
pg_dump --no-owner --no-privileges "${DATABASE_URL}" | gzip -9 > "$TMP"
# shellcheck disable=SC2086
aws ${ENDPOINT_ARG} s3 cp "$TMP" "${KEY}"
echo "[backup] done: ${KEY} ($(wc -c < "$TMP") bytes gzipped)"
