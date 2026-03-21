# redirect.center

A free, open-source DNS-based domain redirect service. Create CNAME records pointing to `redirect.center` and the service performs HTTP redirects — no server, no hosting, no code needed.

## How it works

1. Create a CNAME record on your domain pointing to `redirect.center`
2. The service resolves the DNS record and extracts the destination URL
3. Visitors are automatically redirected via HTTP 301

**Example:** To redirect `go.example.com` → `https://example.com/landing`:
```
go.example.com  CNAME  example.com.opts-slash.landing.opts-https.redirect.center
```

## Project structure

```
redirect.center/
├── packages/
│   ├── shared/          # Shared code (DB, types, config)
│   ├── web/             # Web service (landing page + subscription dashboard)
│   └── redirect/        # Redirect service (DNS-based HTTP redirects)
├── docker-compose.yml   # Development environment
└── deno.json            # Workspace root
```

## Prerequisites

- [Deno](https://deno.land/) v2+
- [Docker](https://docs.docker.com/get-docker/) (for development)

## Development

```bash
# Start all services (web + redirect + postgres + mailhog)
docker compose up

# Or run individually:
cd packages/redirect && deno task dev    # Redirect service (port 80)
cd packages/web && deno task dev         # Web service (port 8000)
```

MailHog UI is available at http://localhost:8025 to view sent emails.

## Production deployment

### Redirect service (systemd)

1. Clone the repository:
```bash
git clone https://github.com/udleinati/redirect.center.git /opt/redirect.center
```

2. Copy the systemd service file:
```bash
sudo cp /opt/redirect.center/redirect-center.service /etc/systemd/system/
```

3. Edit the service file if needed (adjust paths, user, env vars):
```bash
sudo nano /etc/systemd/system/redirect-center.service
```

4. Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable redirect-center
sudo systemctl start redirect-center
```

5. Check status and logs:
```bash
sudo systemctl status redirect-center
sudo journalctl -u redirect-center -f
```

### Log management

The service uses systemd journal. To limit log size:

```bash
# Clean logs older than 7 days
sudo journalctl --vacuum-time=7d

# Limit total log size to 1GB
sudo journalctl --vacuum-size=1G
```

To set permanent limits, edit `/etc/systemd/journald.conf`:
```ini
[Journal]
SystemMaxUse=1G
MaxRetentionSec=7day
```
Then restart journald: `sudo systemctl restart systemd-journald`

### Updating

```bash
cd /opt/redirect.center
git pull
sudo systemctl restart redirect-center
```

## Environment variables

### Redirect service
| Variable | Default | Description |
|----------|---------|-------------|
| `FQDN` | `localhost` | Service domain name |
| `ENTRY_IP` | `127.0.0.1` | IP address for A record |
| `LISTEN_PORT` | `3000` | HTTP listen port |
| `LOGGER_LEVEL` | `debug` | Log level: debug, info, warn, error |

### Web service
| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://...@localhost:5432/redirect_center` | PostgreSQL connection string |
| `WEB_PORT` | `8000` | HTTP listen port |
| `BASE_URL` | `http://localhost:8000` | Public URL |
| `SMTP_HOST` | — | SMTP server host |
| `SMTP_PORT` | `587` | SMTP server port |
| `SMTP_USER` | — | SMTP username |
| `SMTP_PASS` | — | SMTP password |
| `SMTP_FROM` | `noreply@redirect.center` | Sender email |
| `STRIPE_SECRET_KEY` | — | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | — | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | — | Stripe webhook secret |

## Stripe setup

1. Create a Stripe account at https://stripe.com
2. Create 4 Products/Prices in the Stripe Dashboard:
   - **Simple Monthly** — monthly price for a simple seat
   - **Simple Yearly** — yearly price (10% discount vs monthly × 12)
   - **Wildcard Monthly** — monthly price for a wildcard seat
   - **Wildcard Yearly** — yearly price (10% discount vs monthly × 12)
3. Copy each `price_id` to the corresponding env vars
4. Configure a webhook at `{BASE_URL}/api/webhooks/stripe` with events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Copy the webhook secret to `STRIPE_WEBHOOK_SECRET`
6. Configure the Customer Portal in Stripe Dashboard → Settings → Customer Portal

## DNS modifiers

| Modifier | Example | Description |
|----------|---------|-------------|
| `.opts-https` | `example.com.opts-https.redirect.center` | Redirect to HTTPS |
| `.opts-statuscode-{code}` | `example.com.opts-statuscode-302.redirect.center` | Custom status code (301/302/307/308) |
| `.opts-slash.{path}` | `example.com.opts-slash.page.redirect.center` | Add path `/page` |
| `.opts-path-{base32}` | `example.com.opts-path-F52GK43U.redirect.center` | Base32-encoded path |
| `.opts-query-{base32}` | `example.com.opts-query-MFRGGPLEMVTA.redirect.center` | Base32-encoded query string |
| `.opts-port-{number}` | `example.com.opts-port-8080.redirect.center` | Custom port |
| `.opts-uri` | `example.com.opts-uri.redirect.center` | Pass original URI through |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
