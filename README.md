[![All Contributors](https://img.shields.io/badge/all_contributors-1-orange.svg?style=flat-square)](#contributors)
[![Backers on Open Collective](https://opencollective.com/redirectcenter/backers/badge.svg)](#backers)
[![Sponsors on Open Collective](https://opencollective.com/redirectcenter/sponsors/badge.svg)](#sponsors)

# redirect.center
Redirect domains using DNS only.

## Requirements

- [Deno](https://deno.land/) v2+

## How do I install?

```sh
cd /opt
git clone https://github.com/udleinati/redirect.center.git
cd redirect.center
```

## Environment Variables

Look at the file `./src/config.ts` to see all available environment variables.
You must set at least these variables:

```sh
export FQDN=redirect.center
export ENTRY_IP=54.84.55.102
export LISTEN_PORT=80
```

| Variable | Default | Description |
|---|---|---|
| `FQDN` | `localhost` | Service domain (used to detect homepage vs redirect) |
| `ENTRY_IP` | `127.0.0.1` | IP users must set in their A record |
| `LISTEN_PORT` | `3000` | Server port |
| `LISTEN_IP` | `0.0.0.0` | Server bind address |
| `ENVIRONMENT` | `dev1` | Environment name |
| `PROJECT_NAME` | `redirect.center` | Displayed in UI and meta tags |
| `LOGGER_LEVEL` | `debug` | Log level |

## How do I run in development?

```sh
deno task dev
```

## How do I run tests?

```sh
deno task test
```

## How do I run in production?

### Option 1: systemd (recommended)

This runs the service in the background, auto-restarts on crash, and starts on boot.
You can SSH in, start it, and disconnect without issues.

```sh
# 1. Copy the service file to systemd
sudo cp redirect-center.service /etc/systemd/system/

# 2. Edit the service file to match your environment
#    - WorkingDirectory: path to your project (default: /opt/redirect-center)
#    - User: the system user to run as (default: www-data)
#    - ExecStart: path to deno binary (check with: which deno)
#    In the editor, add:
#      [Service]
#        Environment=FQDN=redirect.center
#        Environment=ENTRY_IP=54.84.55.102
#        Environment=LISTEN_PORT=80
sudo nano /etc/systemd/system/redirect-center.service

# 4. Reload systemd, enable on boot, and start
sudo systemctl daemon-reload
sudo systemctl enable redirect-center
sudo systemctl start redirect-center
```

**Common systemd commands:**

```sh
sudo systemctl status redirect-center    # Check if running
sudo systemctl restart redirect-center   # Restart
sudo systemctl stop redirect-center      # Stop
journalctl -u redirect-center -f         # View logs in real-time
journalctl -u redirect-center --since today  # Today's logs
```

**Log rotation (recommended):**

To limit logs to max 1GB and 7 days, edit `/etc/systemd/journald.conf`:

```sh
sudo nano /etc/systemd/journald.conf
```

Set or uncomment these lines:

```ini
[Journal]
SystemMaxUse=1G
MaxRetentionSec=7day
```

Then restart journald:

```sh
sudo systemctl restart systemd-journald
```

To manually clean old logs:

```sh
sudo journalctl --vacuum-size=1G --vacuum-time=7d
```

### Option 2: Direct (foreground)

```sh
deno task start
```

## DNS Setup

Create a wildcard entry in your DNS:

```
*.redirect.center CNAME redirect.center
```

## Contributors

This project exists thanks to all the people who contribute. [[Contribute](CONTRIBUTING.md)].

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore -->
| [<img src="https://avatars0.githubusercontent.com/u/302277?v=4" width="100px;"/><br /><sub><b>Udlei Nati</b></sub>](https://github.com/udleinati)<br />[💻](https://github.com/udleinati/redirect.center/commits?author=udleinati "Code") [📖](https://github.com/udleinati/redirect.center/commits?author=udleinati "Documentation") [🤔](#ideas-udleinati "Ideas, Planning, & Feedback") [🚇](#infra-udleinati "Infrastructure (Hosting, Build-Tools, etc)") |
| :---: |
<!-- ALL-CONTRIBUTORS-LIST:END -->


## Backers

Thank you to all our backers! 🙏 [[Become a backer](https://opencollective.com/redirectcenter#backer)]

<a href="https://opencollective.com/redirectcenter#backers" target="_blank"><img src="https://opencollective.com/redirectcenter/backers.svg?width=890"></a>


## Sponsors

Support this project by becoming a sponsor. Your logo will show up here with a link to your website. [[Become a sponsor](https://opencollective.com/redirectcenter#sponsor)]

<a href="https://opencollective.com/redirectcenter/sponsor/0/website" target="_blank"><img src="https://opencollective.com/redirectcenter/sponsor/0/avatar.svg"></a>
<a href="https://opencollective.com/redirectcenter/sponsor/1/website" target="_blank"><img src="https://opencollective.com/redirectcenter/sponsor/1/avatar.svg"></a>
<a href="https://opencollective.com/redirectcenter/sponsor/2/website" target="_blank"><img src="https://opencollective.com/redirectcenter/sponsor/2/avatar.svg"></a>
<a href="https://opencollective.com/redirectcenter/sponsor/3/website" target="_blank"><img src="https://opencollective.com/redirectcenter/sponsor/3/avatar.svg"></a>
<a href="https://opencollective.com/redirectcenter/sponsor/4/website" target="_blank"><img src="https://opencollective.com/redirectcenter/sponsor/4/avatar.svg"></a>
<a href="https://opencollective.com/redirectcenter/sponsor/5/website" target="_blank"><img src="https://opencollective.com/redirectcenter/sponsor/5/avatar.svg"></a>
<a href="https://opencollective.com/redirectcenter/sponsor/6/website" target="_blank"><img src="https://opencollective.com/redirectcenter/sponsor/6/avatar.svg"></a>
<a href="https://opencollective.com/redirectcenter/sponsor/7/website" target="_blank"><img src="https://opencollective.com/redirectcenter/sponsor/7/avatar.svg"></a>
<a href="https://opencollective.com/redirectcenter/sponsor/8/website" target="_blank"><img src="https://opencollective.com/redirectcenter/sponsor/8/avatar.svg"></a>
<a href="https://opencollective.com/redirectcenter/sponsor/9/website" target="_blank"><img src="https://opencollective.com/redirectcenter/sponsor/9/avatar.svg"></a>
