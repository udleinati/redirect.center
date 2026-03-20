# redirect.center

## What is this project?

A free, open-source DNS-based domain redirect service. Users create CNAME records pointing to `redirect.center` and the service parses the DNS record to perform HTTP redirects. No server, no hosting, no code needed by the end user.

**Owner:** Udlei Nati (communicates in Portuguese)

## Tech Stack

- **Runtime:** Deno (TypeScript)
- **HTTP framework:** Hono (`jsr:@hono/hono@^4`)
- **Template engine:** Vento (`ventojs` — `.vto` files, NOT Handlebars)
- **Database:** Deno KV (`Deno.openKv()`) for statistics
- **DNS resolution:** `Deno.resolveDns(host, "CNAME")`
- **Process management:** Custom `supervisor.ts` (replaces PM2)
- **Container:** Docker (`denoland/deno:latest`)

## Project Structure

```
src/
├── main.ts                    # Entry point — Hono app + Deno.serve()
├── config.ts                  # AppConfig from Deno.env (FQDN, ENTRY_IP, LISTEN_PORT, etc.)
├── services/
│   ├── redirect.ts            # Core logic: DNS resolution + CNAME parsing → redirect URL
│   ├── redirect_test.ts       # Tests for parseDestination (19 tests)
│   ├── guardian.ts            # Blacklist service (reads db/guardian.json every 60s)
│   └── statistic.ts           # Statistics via Deno KV (domains per 24h, total)
├── helpers/
│   ├── dns.ts                 # Wrapper for Deno.resolveDns()
│   ├── base32.ts              # Pure TypeScript RFC 4648 base32 encode/decode
│   └── base32_test.ts         # Tests for base32 (6 tests)
├── types/
│   ├── destination.ts         # Destination interface (protocol, host, pathnames, queries, status, port)
│   └── redirect-response.ts   # RedirectResponse class — builds final URL from Destination
├── middleware/
│   └── error-handler.ts       # Hono onError handler (HttpError → JSON response)
views/
├── index.vto                  # Landing page template (Vento syntax, bilingual EN/PT)
db/
├── guardian.json               # Blacklist file {"denyFqdn": [...]}
supervisor.ts                  # Process supervisor with exponential backoff restart
Dockerfile                     # Multi-stage Docker build
deno.json                      # Config, tasks, imports
```

## Key Commands

```bash
deno task dev          # Dev server with --watch (port 3000)
deno task start        # Production server
deno task test         # Run all tests (50 tests)
deno task supervisor   # Run via supervisor (auto-restart on crash)
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `FQDN` | `localhost` | Service domain (used to detect homepage vs redirect) |
| `ENTRY_IP` | `127.0.0.1` | IP users must set in their A record |
| `LISTEN_PORT` | `3000` | Server port |
| `LISTEN_IP` | `0.0.0.0` | Server bind address |
| `ENVIRONMENT` | `dev1` | Environment name |
| `PROJECT_NAME` | `redirect.center` | Displayed in UI and meta tags |
| `LOGGER_LEVEL` | `debug` | Log level |

## How the Redirect Logic Works

1. User creates an **A record** pointing their domain to `ENTRY_IP` (e.g., `127.0.0.1`)
2. User creates a **CNAME record** like `redirect.my-domain.com → dest.redirect.center`
3. When a request arrives, `redirect.ts` resolves the CNAME via DNS
4. The CNAME target is parsed by `parseDestination()` which extracts:
   - **Host:** the destination domain (e.g., `dest`)
   - **Options** parsed from labels:
     - `.opts-https` → force HTTPS
     - `.opts-statuscode-{301|302|307|308}` → HTTP status code
     - `.opts-port-{N}` → custom port
     - `.opts-slash.{path}` → append path segment
     - `.opts-query-{base32}` → append query string (Base32-encoded)
     - `.opts-path-{base32}` → append path (Base32-encoded)
     - `.opts-uri` → preserve original request path and query
5. A `RedirectResponse` is built and returned as an HTTP redirect

### DNS Error Handling

Deno's `resolveDns()` throws errors **without** an `error.code` property (unlike Node.js). The code checks both `error.code === "ENODATA"` and `error.message?.includes("no records found")`.

If no CNAME is found and the subdomain is not `redirect`, it retries with `redirect.` prefix (e.g., `example.com` → `redirect.example.com`).

## Landing Page (`views/index.vto`)

- **Bilingual:** EN/PT with browser language auto-detection (`navigator.language`)
- **Language switching:** CSS-based via `body[data-lang="en"] .pt { display: none }` and vice versa
- **Language persistence:** `localStorage.setItem('lang', lang)`
- **`<html lang>` is updated dynamically** when language is switched
- **SEO:** JSON-LD structured data, Open Graph, Twitter Card, canonical URL, hreflang alternates
- **Footer:** Multilingual SEO text blocks in 12 languages (en, pt, es, de, fr, it, ja, ru, ko, zh, ar, hi) with `lang` attributes
- **CNAME Generator:** Modal with URL-to-CNAME converter (uses base32.js from unpkg)
- **Sections:** Hero → How it works (3 steps) → How to use (accordion examples) → CNAME Generator button → Parameters Reference table → Footer

### Vento Template Syntax

- Variables: `{{ app.fqdn }}`, `{{ statistics.periodDomains }}`
- NOT Handlebars — no `{{#each}}`, no `{{> partial}}`, no `{{{ unescaped }}}`
- Vento docs: https://vento.js.org/

## Routing (main.ts)

- `GET /` with `host === config.fqdn` → Render landing page
- `ALL /*` with `host === config.fqdn` → Return 404 JSON (prevents favicon.ico errors)
- `ALL /*` with any other host → Redirect logic
- Static files: `/public/*` served via `hono/deno` serveStatic

## Testing

- Tests use `Deno.test()` natively
- Test files: `*_test.ts` next to source files
- Run with `deno task test` (NOT bare `deno test` — needs flags)
- 50 tests total: 25 redirect parsing + 25 base32 (duplicated across worktree)

## Guardian (Blacklist)

- `db/guardian.json` contains `{"denyFqdn": ["blocked-domain.com"]}`
- Reloaded every 60 seconds
- Checks both the full FQDN and the base domain (via `psl` library)
- Blocks both source (incoming) and destination (redirect target) domains

## Supervisor

- `supervisor.ts` runs `src/main.ts` as a subprocess
- Auto-restarts on crash with exponential backoff (1s → 2s → 4s → ... max 30s)
- Resets backoff after 60s of stable uptime
- Forwards SIGINT/SIGTERM for graceful shutdown

## Docker

```bash
docker build -t redirect-center .
docker run -p 3000:3000 -e FQDN=redirect.center -e ENTRY_IP=1.2.3.4 redirect-center
```

## Important Notes

- The `--watch` flag in `deno task dev` only watches `.ts` files. Changes to `.vto` templates require touching `main.ts` or restarting the server
- Deno KV is used for statistics — no external database needed
- The project was migrated from NestJS/Node.js to Deno in March 2026
