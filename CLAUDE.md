# redirect.center — Contexto para Claude Code

## Visão geral
redirect.center é um serviço de redirect de domínios baseado em DNS (CNAME records).
O redirect HTTP é gratuito. HTTPS é uma feature paga com emissão automática de certificados Let's Encrypt.

## Arquitectura
Monorepo Deno com 5 workspace members:
- `packages/web` — Landing page + painel de gestão de subscrições (server-rendered HTML)
- `packages/redirect` — Serviço de redirecionamento HTTP (lógica original, independente)
- `packages/certmanager` — Validação DNS, emissão e renovação de certificados HTTPS
- `packages/proxy` — HTTPS reverse proxy (Caddy + Deno sidecar para TLS termination)
- `packages/shared` — Código partilhado (DB connection, queries, tipos, config, migrations)

## Stack
- Runtime: Deno + TypeScript (monorepo com `deno.json` workspace)
- HTTP: Hono v4
- Templates: Vento (`.vto` files) — usado apenas no redirect service landing page
- Templates web: Server-rendered HTML via funções TypeScript (`packages/web/src/templates/pages.ts`)
- Base de dados: PostgreSQL 17 (raw queries via `deno-postgres@v0.19.3`)
- Pagamentos: Stripe (Checkout hosted + Customer Portal)
- Auth: Magic link por email (denominailer@1.6.0, compatível com AWS SES)
- Frontend: Server-rendered HTML + Tailwind CSS via CDN (sem framework SPA)
- Dev: Docker Compose (web + redirect + certmanager + proxy + postgres + pebble + mailpit + stripe-cli)
- DNS: `Deno.resolveDns()` — no certmanager usa DNS público (8.8.8.8, 1.1.1.1) para evitar cache Docker
- Statistics: Deno KV (`--unstable-kv`) — usado apenas no redirect service
- Encoding: Base32 para paths/queries em CNAME records
- ACME: `npm:acme-client@^5` — certificados Let's Encrypt via DNS-01 challenge
- Encryption: AES-256-GCM via Web Crypto API (chaves privadas encriptadas no banco)
- Proxy: Caddy 2 (TLS termination, configurado via API admin JSON)

## Fases do projeto
1. **Fase 1 (concluída):** Gestão de subscritores, slots, pagamentos Stripe, painel
2. **Fase 2 (concluída):** Validação DNS, emissão e renovação de certificados HTTPS via Let's Encrypt
3. **Fase 3 (concluída):** Servir HTTPS via reverse proxy Caddy + sidecar Deno para TLS termination

## Modelo de dados (PostgreSQL)

### Tabelas
- **users** — `id`, `email` (unique), `stripe_customer_id`, `created_at`, `updated_at`, `deleted_at`
- **sessions** — `id`, `user_id`, `token` (unique), `expires_at`, `created_at` (sem soft delete)
- **magic_links** — `id`, `email`, `token` (unique), `expires_at`, `used_at`, `created_at`, `deleted_at`
- **subscriptions** — `id`, `user_id`, `type` (simple/wildcard), `stripe_subscription_id`, `stripe_price_id`, `quantity`, `status` (active/canceled/past_due), `billing_interval` (monthly/yearly), `current_period_start`, `current_period_end`, `grace_period_end`, `over_limit`, `deleted_at`
- **domains** — `id`, `subscription_id`, `domain` (unique among active), `is_wildcard`, `validation_status` (pending/validated/failed), `dns_challenge_token`, `dns_challenge_created_at`, `validation_requested_at`, `deleted_at`
- **certificates** — `id`, `domain_id`, `domain`, `is_wildcard`, `certificate_pem`, `private_key_pem_encrypted`, `private_key_iv`, `acme_account_key_encrypted`, `acme_account_key_iv`, `acme_order_url`, `acme_account_url`, `status` (pending/dns_configured/issuing/issued/renewal_pending/renewal_failed/expired/failed), `error_message`, `issued_at`, `expires_at`, `last_renewal_attempt`, `renewal_attempts`, `deleted_at`
- **notifications** — `id`, `user_id`, `domain_id`, `type`, `channel` (email/panel), `sent_at`
- **_migrations** — tracking automático de migrações aplicadas

### Migrações (4 ficheiros)
- `001_initial_schema.sql` — users, sessions, magic_links, seats (obsoleto), domains (v1)
- `002_refactor_seats_to_subscriptions.sql` — drop seats/domains, create subscriptions + domains (v2) com quantity e soft delete
- `003_certificates_and_notifications.sql` — certificates, notifications, dns_challenge columns em domains
- `004_add_acme_account_url.sql` — acme_account_url em certificates

### Regras
- Soft delete em todas as tabelas (exceto sessions) via `deleted_at`
- Partial unique indexes: `WHERE deleted_at IS NULL`
- Todas as queries filtram `deleted_at IS NULL`
- 1 active subscription por tipo por utilizador (unique index)
- Domain unique entre registos activos

## Regras de negócio
- Magic link expira em 24h; sessão expira em 3h
- Redirect HTTP gratuito continua inalterado para todos
- HTTPS é feature paga (requer slot ativo)
- Planos: mensal e anual (anual com 10% de desconto)
- Na UI: "Simple Slot" e "Wildcard Slot"
- Compra múltipla: o utilizador escolhe a quantidade de slots ao subscrever
- Se já tem subscrição do tipo, aumenta a quantity (não cria nova)
- Subscrições de tipos diferentes são alinhadas na mesma data de renovação via billing_cycle_anchor
- past_due: domínios continuam a funcionar, aviso no painel, bloqueio de novas adições
- Cancelamento definitivo: 7 dias de graça antes de soft delete nos domínios (cleanup job a cada hora no web)
- Redução de quantity abaixo do número de domínios: flag over_limit, exige remoção manual
- Domínio pode ser removido (soft delete) a qualquer momento, liberando o slot

## Serviços Docker Compose (dev)

| Serviço | Imagem | Portas | Descrição |
|---|---|---|---|
| `postgres` | postgres:17 | 5432 | Base de dados (user: `redirect_center`, pass: `dev_password`) |
| `web` | Dockerfile próprio | 8000 | Landing page + painel + Stripe webhooks |
| `redirect` | Dockerfile próprio | 8180→80 | Serviço de redirect HTTP |
| `certmanager` | Dockerfile próprio | — | Workers de validação/renovação/notificação |
| `proxy` | Dockerfile próprio | 443 | Caddy + sidecar Deno (TLS termination) |
| `pebble` | letsencrypt/pebble | 14000, 15000 | Servidor ACME local (`PEBBLE_VA_ALWAYS_VALID=1`) |
| `mailpit` | axllent/mailpit | 1025 (SMTP), 8025 (UI) | Captura de emails dev (substitui MailHog) |
| `stripe-cli` | stripe/stripe-cli | — | Webhook forwarding para web:8000 |

## Rotas HTTP

### Web service (porta 8000)
- `GET /` — Landing page com pricing
- `GET /auth/login` — Formulário de login
- `POST /auth/login` — Envia magic link por email
- `GET /auth/verify?token=` — Valida magic link, cria sessão
- `GET /auth/logout` — Termina sessão
- `GET /dashboard` — Painel com subscrições e domínios (auth required)
- `GET /dashboard/subscribe` — Página de escolha de plano
- `POST /dashboard/subscribe` — Cria checkout Stripe
- `POST /dashboard/subscriptions/:id/add-slots` — Adiciona slots a subscrição existente
- `GET /dashboard/checkout/success` — Retorno do checkout Stripe
- `POST /dashboard/subscriptions/:id/domains` — Adiciona domínio a subscrição
- `POST /dashboard/domains/:id/validate` — Pede validação de domínio
- `POST /dashboard/domains/:id/remove` — Remove domínio (soft delete)
- `GET /dashboard/portal` — Redirect para Stripe Customer Portal
- `POST /api/webhooks/stripe` — Webhook Stripe (subscription events)

### Redirect service (porta 80)
- `GET /` com `host === FQDN` → Landing page (Vento template)
- `ALL /*` com `host === FQDN` → 404 JSON
- `ALL /*` com qualquer outro host → Redirect via DNS CNAME parsing

## Comandos
```bash
# Docker Compose
docker compose up                              # Sobe tudo
docker compose up -d --build web               # Rebuild apenas o web
docker compose up -d --build certmanager       # Rebuild apenas o certmanager
docker compose up -d --build proxy             # Rebuild apenas o proxy
docker compose logs certmanager --tail=30      # Logs do certmanager

# Redirect service (local, fora do Docker)
cd packages/redirect
deno task dev                                  # Dev com watch mode
deno task test                                 # Correr testes (25 testes: 19 redirect + 6 base32)

# Web service (local, fora do Docker)
cd packages/web
deno task dev                                  # Dev com watch mode

# Dev URLs
# http://localhost:8000        — Web (painel, login)
# http://localhost:8180        — Redirect service
# https://localhost:443        — HTTPS via proxy (requer certificado emitido)
# http://localhost:8025        — Mailpit (ver emails)
# http://localhost:14000       — Pebble ACME
```

## Variáveis de ambiente

### Redirect service
- `FQDN` — domínio principal (default: localhost)
- `ENTRY_IP` — IP de entrada (default: 127.0.0.1)
- `LISTEN_PORT` — porta (default: 3000)
- `LOGGER_LEVEL` — debug|info|warn|error (default: debug)

### Web service
- `DATABASE_URL` — conexão PostgreSQL
- `WEB_PORT` — porta do web (default: 8000)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM` — SMTP (obrigatórios para enviar emails)
- `SMTP_USER`, `SMTP_PASS` — credenciais SMTP (opcionais; sem eles envia sem auth com `allowUnsecure`)
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` — Stripe API
- `STRIPE_PRICE_SIMPLE_MONTHLY`, `STRIPE_PRICE_SIMPLE_YEARLY` — Price IDs simples
- `STRIPE_PRICE_WILDCARD_MONTHLY`, `STRIPE_PRICE_WILDCARD_YEARLY` — Price IDs wildcard
- `BASE_URL` — URL base (default: http://localhost:8000)
- `SESSION_DURATION_HOURS` — duração sessão (default: 3)
- `MAGIC_LINK_DURATION_HOURS` — validade magic link (default: 24)

### Certmanager
- `DATABASE_URL` — conexão PostgreSQL
- `CERT_ENCRYPTION_KEY` — 64 hex chars (32 bytes). Gerar: `openssl rand -hex 32`
- `ACME_DIRECTORY_URL` — URL do servidor ACME (prod: Let's Encrypt, dev: `https://pebble:14000/dir`)
- `DNS_PROVIDER` — route53, cloudflare, pebble, mock
- `DNS_ZONE_ID`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` — para Route53
- `DNS_PROVIDER_API_KEY` — para Cloudflare
- `VALIDATION_WORKER_INTERVAL_SECONDS` — default 30
- `RENEWAL_WORKER_INTERVAL_SECONDS` — default 3600
- `NOTIFICATION_WORKER_INTERVAL_SECONDS` — default 3600

### Proxy (Caddy + sidecar)
- `DATABASE_URL` — conexão PostgreSQL (obrigatório)
- `CERT_ENCRYPTION_KEY` — chave AES-256-GCM (64 hex chars, obrigatório)
- `CADDY_ADMIN_API` — URL da API admin do Caddy (default: `http://localhost:2019`)
- `REDIRECT_UPSTREAM` — URL do redirect service (default: `http://redirect:80`)
- `SYNC_INTERVAL_SECONDS` — intervalo de polling ao banco (default: 30)
- `LOGGER_LEVEL` — debug|info|warn|error (default: debug)

## Ficheiros importantes
- `deno.json` — Root workspace config (5 members)
- `docker-compose.yml` — Todos os serviços dev
- `packages/shared/src/types.ts` — Tipos TypeScript (User, Subscription, Domain, Certificate, Notification, etc.)
- `packages/shared/src/config.ts` — Config loader (env vars)
- `packages/shared/src/db/connection.ts` — Pool PostgreSQL
- `packages/shared/src/db/migrate.ts` — Migration runner automático
- `packages/shared/src/db/migrations/` — 4 SQL migrations
- `packages/shared/src/db/queries/` — DB queries (users, sessions, subscriptions, domains, certificates, notifications, magic_links)
- `packages/web/src/main.ts` — Entry point do web service (inclui job de limpeza de grace period a cada hora)
- `packages/web/src/routes/auth.ts` — Login/logout magic link
- `packages/web/src/routes/dashboard.ts` — Painel, domínios, subscrições
- `packages/web/src/routes/webhook.ts` — Stripe webhook handler
- `packages/web/src/services/stripe.ts` — Integração Stripe (checkout, webhooks, quantity updates)
- `packages/web/src/services/auth.ts` — Lógica magic link + sessões
- `packages/web/src/services/email.ts` — Envio SMTP (denominailer, `allowUnsecure` em dev)
- `packages/web/src/templates/pages.ts` — Todas as páginas HTML (landing, dashboard, login, subscribe, etc.)
- `packages/redirect/src/services/redirect.ts` — Core da lógica de redirect (DNS CNAME parsing)
- `packages/redirect/src/main.ts` — Entry point do redirect com Hono
- `packages/redirect/views/index.vto` — Landing page bilíngue (EN/PT) com SEO e gerador CNAME
- `packages/certmanager/src/main.ts` — Entry point do certmanager (3 workers)
- `packages/certmanager/src/acme/client.ts` — Wrapper ACME (createAcmeClient, restoreAcmeClient, createOrderAndGetChallenge, completeAndFinalize + getCertificate)
- `packages/certmanager/src/acme/dns-challenge.ts` — CNAME delegation TXT records (Route53/Cloudflare/mock)
- `packages/certmanager/src/dns/resolver.ts` — Verificação CNAME com DNS público (8.8.8.8, 1.1.1.1)
- `packages/certmanager/src/workers/validation.ts` — Worker de validação (re-fetch domain após init, continue no 1º ciclo)
- `packages/certmanager/src/workers/renewal.ts` — Worker de renovação
- `packages/certmanager/src/workers/notification.ts` — Worker de notificação
- `packages/certmanager/src/services/crypto.ts` — AES-256-GCM encryption/decryption
- `packages/certmanager/src/services/certificate.ts` — Orquestração ACME (init, validate, issue, renew)
- `packages/proxy/src/main.ts` — Entry point do sidecar (wait Caddy → sync → loop)
- `packages/proxy/src/services/cert-sync.ts` — Polling PostgreSQL, decrypt, write PEM, reload Caddy
- `packages/proxy/src/services/caddy-api.ts` — Build config JSON + POST /load (upstream: redirect:80)
- `packages/proxy/src/services/db.ts` — Query certificados issued + não expirados
- `packages/proxy/src/services/crypto.ts` — Decryption AES-256-GCM (mirror do certmanager)
- `packages/proxy/static/error.html` — Página de erro bilingue (domínio sem HTTPS)
- `packages/proxy/Caddyfile.initial` — Config mínima para arranque do Caddy (admin :2019, auto_https off)
- `packages/proxy/entrypoint.sh` — Script que inicia Caddy em background + sidecar Deno
- `packages/proxy/Dockerfile` — Multi-stage: `denoland/deno:alpine` + Caddy binary copiado de `caddy:2-alpine`
- `docker/pebble/pebble-config.json` — Config do Pebble (portas 14000/15000)
- `db/guardian.json` — Blacklist de domínios `{"denyFqdn": [...]}`

## Redirect: Modificadores DNS suportados
- `.opts-https` — Force HTTPS
- `.opts-statuscode-{301|302|307|308}` — HTTP status code
- `.opts-slash.{path}` — Add path segment
- `.opts-path-{base32}` — Add base32-encoded path
- `.opts-query-{base32}` — Add base32-encoded query string
- `.opts-port-{number}` — Custom port
- `.opts-uri` — Pass original URI through

## Git workflow
- Branch de desenvolvimento: `feat/pro-version`
- **Nunca fazer commits diretamente no `master`**
- O merge para `master` será feito manualmente após revisão

## Fluxo de certificados HTTPS

### Emissão
1. Utilizador adiciona domínio no dashboard → certmanager cria conta ACME + order → guarda challenge token e `acme_account_url` na BD
2. Dashboard mostra instruções CNAME: `_acme-challenge.{domain}` → `_acme-challenge.{domain}.acme.redirect.center`
3. No próximo ciclo (30s), validation worker verifica CNAME via DNS público (8.8.8.8)
4. Se CNAME ok: seta TXT record (via provider API), restaura ACME client (com `accountUrl`), cria nova order, completa challenge
5. `finalizeOrder()` retorna order object → `getCertificate()` busca PEM real
6. Certificado PEM guardado no banco, chave privada encriptada com AES-256-GCM

### Proxy (TLS termination)
7. Sidecar do proxy faz polling ao banco a cada 30s
8. Desencripta chave privada, escreve PEM em `/certs/{domain}/`
9. Envia configuração ao Caddy via `POST /load` (API admin :2019)
10. Caddy serve HTTPS na porta 443 e faz reverse proxy para redirect:80

### Renovação
- 14 dias antes da expiração: renovação automática
- CNAME delegation permite renovar sem intervenção do utilizador
- Se DNS inválido: notificação por email + aviso no painel

## Gotchas e detalhes técnicos

### Dockerfiles
- Todos os Dockerfiles copiam `deno.json` de TODOS os workspace members (Deno exige resolução completa do workspace)
- certmanager usa `--unsafely-ignore-certificate-errors=pebble` no docker-compose (Pebble tem cert self-signed)
- redirect usa `--unstable-kv` (Deno KV é API unstable)
- proxy Dockerfile: multi-stage com `denoland/deno:alpine` base + Caddy binary de `caddy:2-alpine`

### ACME (acme-client v5)
- `client.finalizeOrder(order, csr)` retorna o **order object**, NÃO o certificado PEM
- Deve-se chamar `client.getCertificate(finalizedOrder)` separadamente para obter o PEM
- `restoreAcmeClient` precisa do `accountUrl` guardado na BD (Pebble não suporta `onlyReturnExisting`)

### DNS no certmanager
- Usa DNS público (8.8.8.8, 1.1.1.1) via `Deno.resolveDns(host, type, { nameServer })` para evitar cache do Docker DNS
- CNAME records vêm com trailing dot (e.g., `foo.bar.`), normalizado com `.replace(/\.$/, "")`

### Validation worker
- Após `initializeCertificate`, faz `continue` (não tenta validar no mesmo ciclo)
- Re-fetch do domain object antes de `validateAndIssueCertificate` (evita objeto stale com `dns_challenge_token = null`)
- Cada nova ACME order gera novo challenge token — o worker actualiza o TXT record e o banco se mudou

### Email (denominailer)
- Sem `SMTP_USER`/`SMTP_PASS`, envia sem auth com `debug: { allowUnsecure: true }`
- Mailpit (dev) não requer credenciais na porta 1025
- `client.close()` em try/catch porque falha se a conexão nunca foi estabelecida

### Pebble (ACME dev)
- `PEBBLE_VA_ALWAYS_VALID=1` — aceita qualquer challenge sem verificar DNS real
- `PEBBLE_VA_NOSLEEP=1` — sem delay na validação
- Config em `docker/pebble/pebble-config.json`

## Protecções implementadas
- Loop detection via cookies (max 3 redirects em 10s)
- Guardian blacklist (db/guardian.json, recarregado a cada 60s)
- Host validation (rejeita caracteres inválidos em DNS)
- Path traversal protection (URLs maliciosas retornam 400)
- Bot blocking (requests sem User-Agent retornam 403 na landing page)
- Gzip compression em todas as respostas
- Logger com níveis (debug só em dev)
- Chaves privadas encriptadas no banco (AES-256-GCM), desencriptadas apenas no filesystem efémero do container proxy

## Testes
- Apenas no redirect service: `deno task test` (25 testes: 19 redirect parsing + 6 base32)
- Ficheiros: `packages/redirect/src/services/redirect_test.ts`, `packages/redirect/src/helpers/base32_test.ts`
- Outros packages não têm testes automatizados
