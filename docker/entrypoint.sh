#!/bin/sh
# Select the Caddy config from the single feature flag. With the flag off the
# stack behaves byte-for-byte like the legacy HTTP-only service.
set -e

if [ "$HTTPS_TIER_ENABLED" = "true" ]; then
	echo "[entrypoint] paid HTTPS tier ENABLED -> Caddyfile (on-demand TLS, S3 storage)"
	exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
fi

echo "[entrypoint] paid HTTPS tier DISABLED -> Caddyfile.off (HTTP reverse proxy only)"
exec caddy run --config /etc/caddy/Caddyfile.off --adapter caddyfile
