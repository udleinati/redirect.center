#!/bin/sh
set -e

echo "[entrypoint] Starting Caddy..."
caddy start --config /app/Caddyfile.initial --adapter caddyfile

echo "[entrypoint] Starting sidecar (Deno)..."
exec deno run \
  --allow-net \
  --allow-read=/certs,/app \
  --allow-write=/certs \
  --allow-env \
  /app/src/main.ts
