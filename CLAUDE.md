# redirect.center — Contexto para Claude Code

## Visão geral
redirect.center é um serviço de redirect de domínios baseado em DNS (CNAME records).
O redirect HTTP é gratuito. Estamos a adicionar suporte a HTTPS como feature paga.

## Arquitectura
Monorepo com dois serviços:
- `packages/web` — Landing page + painel de gestão de subscrições (server-rendered HTML)
- `packages/redirect` — Serviço de redirecionamento HTTP (lógica original)
- `packages/shared` — Código partilhado (DB, tipos, config)

## Stack
- Runtime: Deno + TypeScript
- HTTP: Hono v4
- Templates: Vento (`.vto` files) — usado no redirect service
- Base de dados: PostgreSQL 18 (raw queries via deno-postgres)
- Pagamentos: Stripe (Checkout hosted + Customer Portal)
- Auth: Magic link por email (SMTP genérico, compatível com AWS SES)
- Frontend: Server-rendered HTML + Tailwind CSS via CDN (sem framework SPA)
- Dev: Docker Compose (web + redirect + postgres + mailhog)
- DNS: `Deno.resolveDns()` para resolver CNAME records
- Statistics: Deno KV (built-in key-value store)
- Encoding: Base32 para paths/queries em CNAME records

## Fases do projeto
1. **Fase 1 (concluída):** Gestão de subscritores, seats, pagamentos Stripe, painel
2. **Fase 2:** Validação de domínios — quando um utilizador adiciona um domínio a um seat,
   validar que o DNS está corretamente configurado
3. **Fase 3:** Emissão automática de certificados HTTPS via Let's Encrypt para domínios validados

## Modelo de dados
- **Users:** identificados por email, autenticação por magic link
- **Sessions:** token de sessão com expiração de 3 horas
- **MagicLinks:** token de login via email com expiração de 24 horas
- **Seats:** subscrição paga (simples ou wildcard), gerida via Stripe
- **Domains:** associados 1:1 a seats, com status de validação (pending/validated/failed)
- Um utilizador pode ter seats ilimitados (desde que pague)
- Um seat tem no máximo 1 domínio associado (substituível)

## Regras de negócio
- Magic link expira em 24h; sessão expira em 3h
- Redirect HTTP gratuito continua inalterado para todos
- HTTPS é feature paga (requer seat ativo)
- Planos: mensal e anual (anual com 10% de desconto)
- Cancelamento remove acesso imediatamente
- Domínio pode ser substituído no seat a qualquer momento

## Comandos
```bash
# Desenvolvimento (Docker Compose)
docker compose up                              # Sobe tudo: web + redirect + postgres + mailhog

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
- `packages/web/src/main.ts` — Entry point do web service
- `packages/web/src/services/stripe.ts` — Integração Stripe
- `packages/web/src/services/auth.ts` — Autenticação magic link
- `packages/shared/src/db/migrations/` — SQL migrations
- `packages/shared/src/db/queries/` — DB queries (users, sessions, seats, domains, magic_links)

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

## Protecções implementadas
- Loop detection via cookies (max 3 redirects em 10s)
- Guardian blacklist (db/guardian.json, recarregado a cada 60s)
- Host validation (rejeita caracteres inválidos em DNS)
- Path traversal protection (URLs maliciosas retornam 400)
- Bot blocking (requests sem User-Agent retornam 403 na landing page)
- Gzip compression em todas as respostas
- Logger com níveis (debug só em dev)
