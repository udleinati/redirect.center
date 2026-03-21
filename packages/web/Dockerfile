FROM denoland/deno:latest

WORKDIR /app

# Copy all workspace member configs (Deno requires all members present)
COPY packages/web/deno.json ./packages/web/
COPY packages/shared/deno.json ./packages/shared/
COPY packages/redirect/deno.json ./packages/redirect/
COPY deno.json .

RUN deno install

# Only copy what this service needs
COPY packages/web/ ./packages/web/
COPY packages/shared/ ./packages/shared/

RUN deno cache packages/web/src/main.ts

EXPOSE 8000

CMD ["run", "--allow-net", "--allow-read", "--allow-env", "--allow-write", "packages/web/src/main.ts"]
