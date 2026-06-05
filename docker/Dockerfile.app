# Deno redirect app, built to run on an internal (unpublished) port behind Caddy.
# Mirrors the root Dockerfile but runs src/main.ts directly (the root image's
# supervisor.ts entrypoint is not present in the repo).
FROM denoland/deno:latest

WORKDIR /app

COPY deno.json deno.lock ./
RUN deno install

COPY src/ ./src/
COPY views/ ./views/
COPY db/ ./db/

RUN deno cache src/main.ts

EXPOSE 3000

CMD ["run", "--allow-net", "--allow-read", "--allow-write", "--allow-env", "src/main.ts"]
