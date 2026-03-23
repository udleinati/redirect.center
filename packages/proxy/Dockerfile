# Stage 1: Get Caddy binary from official image
FROM caddy:2-alpine AS caddy-bin

# Stage 2: Deno Alpine + Caddy binary
FROM denoland/deno:alpine

# Copy Caddy binary
COPY --from=caddy-bin /usr/bin/caddy /usr/local/bin/caddy

WORKDIR /app

# Copy sidecar source and config
COPY packages/proxy/deno.json ./
COPY packages/proxy/src/ ./src/
COPY packages/proxy/static/ ./static/
COPY packages/proxy/Caddyfile.initial ./
COPY packages/proxy/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Cache dependencies
RUN deno cache src/main.ts

# Create certs directory
RUN mkdir -p /certs

EXPOSE 80 443

CMD ["/entrypoint.sh"]
