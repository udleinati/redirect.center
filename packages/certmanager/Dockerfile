FROM denoland/deno:latest

WORKDIR /app

# Copy all workspace member configs (Deno requires all members present)
COPY packages/certmanager/deno.json ./packages/certmanager/
COPY packages/shared/deno.json ./packages/shared/
COPY packages/web/deno.json ./packages/web/
COPY packages/redirect/deno.json ./packages/redirect/
COPY packages/proxy/deno.json ./packages/proxy/
COPY deno.json .

RUN deno install

# Only copy what this service needs
COPY packages/certmanager/ ./packages/certmanager/
COPY packages/shared/ ./packages/shared/

RUN deno cache packages/certmanager/src/main.ts

CMD ["run", "--allow-net", "--allow-read", "--allow-env", "--allow-write", "--allow-run", "packages/certmanager/src/main.ts"]
