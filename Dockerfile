FROM denoland/deno:latest

WORKDIR /app

COPY deno.json .
RUN deno install

COPY src/ ./src/
COPY views/ ./views/
COPY db/ ./db/
COPY supervisor.ts .

RUN deno cache src/main.ts

CMD ["run", "--allow-net", "--allow-read", "--allow-env", "--unstable-kv", "supervisor.ts"]
