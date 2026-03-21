# redirect.center — Contexto para Claude Code

## Visão geral
redirect.center é um serviço de redirect de domínios baseado em DNS (CNAME records).
O redirect HTTP é gratuito. Estamos a adicionar suporte a HTTPS como feature paga.

## Arquitectura
Monorepo com quatro serviços:
- `packages/web` — Landing page + painel de gestão de subscrições (server-rendered HTML)
- `packages/redirect` — Serviço de redirecionamento HTTP (lógica original)
- `packages/certmanager` — Validação DNS, emissão e renovação de certificados HTTPS
- `packages/proxy` — HTTPS reverse proxy (Caddy + Deno sidecar para TLS termination)
- `packages/shared` — Código partilhado (DB, tipos, config)

## Stack
- Runtime: Deno + TypeScript
- HTTP: Hono v4
- Templates: Vento (`.vto` files) — usado no redirect service
- Base de dados: PostgreSQL 17 (raw queries via deno-postgres)
- Pagamentos: Stripe (Checkout hosted + Customer Portal)
- Auth: Magic link por email (SMTP genérico, compatível com AWS SES)
- Frontend: Server-rendered HTML + Tailwind CSS via CDN (sem framework SPA)
- Dev: Docker Compose (web + redirect + certmanager + proxy + postgres + pebble + mailhog + stripe-cli)
- DNS: `Deno.resolveDns()` para resolver CNAME records
- Statistics: Deno KV (built-in key-value store)
- Encoding: Base32 para paths/queries em CNAME records

## Fases do projeto
1. **Fase 1 (concluída):** Gestão de subscritores, slots, pagamentos Stripe, painel
2. **Fase 2 (concluída):** Validação DNS, emissão e renovação de certificados HTTPS via Let's Encrypt
3. **Fase 3 (concluída):** Servir HTTPS via reverse proxy Caddy + sidecar Deno para TLS termination

## Modelo de dados
- **Users:** identificados por email, autenticação por magic link
- **Subscriptions:** 1 por tipo (simple/wildcard) por utilizador, com quantity variável, gerida via Stripe
- **Domains:** associados a subscriptions, limitados pelo quantity da subscrição
- Um utilizador pode ter no máximo 2 subscrições ativas (1 simple + 1 wildcard)
- Cada subscrição pode ter N domínios até ao limite do quantity
- Soft delete em todas as tabelas exceto sessions
- Subscrições do mesmo utilizador são alinhadas na data de renovação via billing_cycle_anchor

## Regras de negócio
- Magic link expira em 24h; sessão expira em 3h
- Redirect HTTP gratuito continua inalterado para todos
- HTTPS é feature paga (requer slot ativo)
- Planos: mensal e anual (anual com 10% de desconto)
- Na UI: "Simple Slot" e "Wildcard Slot"
- Compra múltipla: o utilizador escolhe a quantidade de slots ao subscrever
- Se já tem subscrição do tipo, aumenta a quantity (não cria nova)
- Subscrições de tipos diferentes são alinhadas na mesma data de renovação (billing_cycle_anchor)
- past_due: domínios continuam a funcionar, aviso no painel, bloqueio de novas adições
- Cancelamento definitivo: 7 dias de graça antes de soft delete nos domínios
- Redução de quantity abaixo do número de domínios: flag over_limit, exige remoção manual
- Domínio pode ser removido (soft delete) a qualquer momento, liberando o slot

## Comandos
```bash
# Desenvolvimento (Docker Compose)
docker compose up                              # Sobe tudo: web + redirect + postgres + mailhog + stripe-cli

# Redirect service
cd packages/redirect
deno task dev                                  # Dev com watch mode
deno task start                                # Produção
deno task test                                 # Correr testes (25 testes)

# Web service
cd packages/web
deno task dev                                  # Dev com watch mode
deno task start                                # Produção
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
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — SMTP para magic links
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` — Stripe API
- `STRIPE_PRICE_SIMPLE_MONTHLY`, `STRIPE_PRICE_SIMPLE_YEARLY` — Price IDs simples
- `STRIPE_PRICE_WILDCARD_MONTHLY`, `STRIPE_PRICE_WILDCARD_YEARLY` — Price IDs wildcard
- `BASE_URL` — URL base (default: http://localhost:8000)
- `SESSION_DURATION_HOURS` — duração sessão (default: 3)
- `MAGIC_LINK_DURATION_HOURS` — validade magic link (default: 24)

## Ficheiros importantes
- `packages/redirect/src/services/redirect.ts` — Core da lógica de redirect (DNS parsing)
- `packages/redirect/src/main.ts` — Entry point do redirect com Hono
- `packages/redirect/views/index.vto` — Landing page bilíngue (EN/PT) com SEO
- `packages/web/src/main.ts` — Entry point do web service (inclui job de limpeza de grace period)
- `packages/web/src/services/stripe.ts` — Integração Stripe (checkout, webhooks, quantity updates)
- `packages/web/src/services/auth.ts` — Autenticação magic link
- `packages/shared/src/db/migrations/` — SQL migrations
- `packages/shared/src/db/queries/` — DB queries (users, sessions, subscriptions, domains, certificates, notifications, magic_links)
- `packages/shared/src/types.ts` — Tipos TypeScript (User, Subscription, Domain, Certificate, Notification, etc.)
- `packages/certmanager/src/main.ts` — Entry point do certmanager (3 workers)
- `packages/certmanager/src/acme/client.ts` — Wrapper ACME (acme-client)
- `packages/certmanager/src/acme/dns-challenge.ts` — CNAME delegation (Route53/Cloudflare)
- `packages/certmanager/src/workers/` — Validation, renewal, notification workers
- `packages/certmanager/src/services/crypto.ts` — AES-256-GCM encryption for private keys
- `packages/proxy/src/main.ts` — Entry point do sidecar (sync certs + manage Caddy)
- `packages/proxy/src/services/cert-sync.ts` — Polling PostgreSQL, decrypt, write PEM, reload Caddy
- `packages/proxy/src/services/caddy-api.ts` — Client para API admin do Caddy (:2019)
- `packages/proxy/src/services/db.ts` — Queries de certificados válidos
- `packages/proxy/src/services/crypto.ts` — Decryption AES-256-GCM (mirror do certmanager)
- `packages/proxy/static/error.html` — Página de erro bilingue (domínio sem HTTPS)
- `packages/proxy/Caddyfile.initial` — Config mínima para arranque do Caddy
- `packages/proxy/entrypoint.sh` — Inicia Caddy + sidecar Deno

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

## Fase 2 — Validação DNS e Certificados

### Arquitectura
- Novo serviço `certmanager` (packages/certmanager) — gere validação DNS, emissão e renovação de certificados
- Usa `npm:acme-client` para interagir com Let's Encrypt via protocolo ACME
- Challenge DNS-01 com CNAME delegation: o utilizador configura um CNAME para `_acme-challenge.{domain}.acme.redirect.center`, e o certmanager gere os TXT records automaticamente
- Certificados e chaves privadas armazenados no PostgreSQL, encriptados com AES-256-GCM
- Desenvolvimento local usa Pebble (servidor ACME em Docker)

### Serviços (Docker Compose)
- `web` — landing page + painel (porta 8000)
- `redirect` — serviço de redirect HTTP (porta 80)
- `certmanager` — validação DNS + emissão/renovação de certificados
- `proxy` — HTTPS reverse proxy Caddy + sidecar Deno (porta 443)
- `postgres` — banco de dados
- `pebble` — servidor ACME local (dev, portas 14000/15000)
- `mailhog` — captura de emails (dev)
- `stripe-cli` — webhook forwarding (dev)

### Workers do certmanager
1. **Validation worker** (a cada 30s) — processa pedidos de validação, verifica DNS, emite certificados
2. **Renewal worker** (a cada 1h) — verifica certificados a expirar em 14 dias, tenta renovar
3. **Notification worker** (a cada 1h) — envia emails e cria avisos para problemas de renovação/expiração

### Fluxo de certificado
1. Utilizador adiciona domínio → sistema gera challenge → mostra instruções CNAME
2. Utilizador configura CNAME no DNS e clica "Validar"
3. Certmanager verifica CNAME, cria TXT em acme.redirect.center, submete challenge ao Let's Encrypt
4. Certificado emitido → armazenado encriptado no banco → domínio marcado como "validated"
5. 14 dias antes da expiração: renovação automática (sem intervenção do utilizador)
6. Se DNS inválido na renovação: notificação por email + aviso no painel

### Certificados Let's Encrypt
- Validade: 90 dias
- Renovação automática: 14 dias antes da expiração
- Challenge: DNS-01 via CNAME delegation (renovação sem intervenção do utilizador)

### Variáveis de ambiente do certmanager
- `CERT_ENCRYPTION_KEY` — 64 hex chars (32 bytes). Gerar: `openssl rand -hex 32`
- `ACME_DIRECTORY_URL` — URL do servidor ACME (production/staging/pebble)
- `DNS_PROVIDER` — route53, cloudflare, pebble, mock
- `DNS_ZONE_ID`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` — para Route53
- `DNS_PROVIDER_API_KEY` — para Cloudflare
- `VALIDATION_WORKER_INTERVAL_SECONDS` — default 30
- `RENEWAL_WORKER_INTERVAL_SECONDS` — default 3600
- `NOTIFICATION_WORKER_INTERVAL_SECONDS` — default 3600

## Fase 3 — HTTPS Reverse Proxy

### Arquitectura
- Container Docker com Caddy (TLS termination, porta 443) + sidecar Deno (sync certs do PostgreSQL)
- HTTP (porta 80) → redirect service (sem Caddy) | HTTPS (porta 443) → Caddy → redirect service
- Não há redirect automático HTTP→HTTPS — são independentes

### Sidecar (Deno)
- Polling PostgreSQL a cada 30s, lê certificados com status `issued` e não expirados
- Desencripta chaves privadas (AES-256-GCM), escreve PEM no filesystem `/certs/{domain}/`
- Checksum SHA-256 em memória para evitar reescritas desnecessárias
- Reconstrói configuração e envia `POST /load` à API admin do Caddy quando há mudanças
- No arranque, faz sync completo (clean + rebuild)

### Caddy
- Configurado via API admin JSON (`:2019`), não Caddyfile estático
- ACME automático desactivado (certificados geridos pelo certmanager)
- Reverse proxy para `http://redirect:3000`
- Certificados carregados via `tls.certificates.load_files`

### Variáveis de ambiente do proxy
- `DATABASE_URL` — conexão PostgreSQL (obrigatório)
- `CERT_ENCRYPTION_KEY` — chave AES-256-GCM (64 hex chars, obrigatório)
- `CADDY_ADMIN_API` — URL da API admin do Caddy (default: `http://localhost:2019`)
- `REDIRECT_UPSTREAM` — URL do redirect service (default: `http://redirect:3000`)
- `SYNC_INTERVAL_SECONDS` — intervalo de polling ao banco (default: 30)
- `LOGGER_LEVEL` — debug|info|warn|error (default: debug)

## Protecções implementadas
- Loop detection via cookies (max 3 redirects em 10s)
- Guardian blacklist (db/guardian.json, recarregado a cada 60s)
- Host validation (rejeita caracteres inválidos em DNS)
- Path traversal protection (URLs maliciosas retornam 400)
- Bot blocking (requests sem User-Agent retornam 403 na landing page)
- Gzip compression em todas as respostas
- Logger com níveis (debug só em dev)
