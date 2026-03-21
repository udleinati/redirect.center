FROM denoland/deno:latest

WORKDIR /app

# Copy all workspace member configs (Deno requires all members present)
COPY packages/redirect/deno.json ./packages/redirect/
COPY packages/shared/deno.json ./packages/shared/
COPY packages/web/deno.json ./packages/web/
COPY deno.json .

RUN deno install

# Only copy what this service needs
COPY packages/redirect/ ./packages/redirect/
COPY packages/shared/ ./packages/shared/

RUN deno cache packages/redirect/src/main.ts

CMD ["run", "--allow-net", "--allow-read", "--allow-env", "--unstable-kv", "packages/redirect/src/main.ts"]
