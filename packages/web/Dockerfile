FROM denoland/deno:latest

WORKDIR /app

COPY packages/web/deno.json ./packages/web/
COPY packages/shared/deno.json ./packages/shared/
COPY deno.json .

RUN deno install

COPY packages/web/ ./packages/web/
COPY packages/shared/ ./packages/shared/

RUN deno cache packages/web/src/main.ts

EXPOSE 8000

CMD ["run", "--allow-net", "--allow-read", "--allow-env", "--allow-write", "packages/web/src/main.ts"]
