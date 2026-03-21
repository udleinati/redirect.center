FROM denoland/deno:latest

WORKDIR /app

COPY packages/redirect/deno.json ./packages/redirect/
COPY packages/shared/deno.json ./packages/shared/
COPY deno.json .

RUN deno install

COPY packages/redirect/ ./packages/redirect/
COPY packages/shared/ ./packages/shared/

RUN deno cache packages/redirect/src/main.ts

CMD ["run", "--allow-net", "--allow-read", "--allow-env", "--unstable-kv", "packages/redirect/src/main.ts"]
