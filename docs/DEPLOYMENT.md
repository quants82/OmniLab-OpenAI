# Production deployment

## Current production layout

| Item | Value |
| --- | --- |
| Site | `https://ominilab.vatli365.vn` |
| Server | Ubuntu 24.04 LTS, `103.57.223.80` |
| Repository | `https://github.com/quants82/Ominilab-OpenAI.git` |
| Checkout | `/var/www/ominilab.vatli365.vn/app` |
| Backend | `/var/www/ominilab.vatli365.vn/app/backend_Ominilab` |
| Frontend | `/var/www/ominilab.vatli365.vn/app/frontend_Ominilab` |
| Python environment | `/var/www/ominilab.vatli365.vn/venv` |
| Environment file | `/var/www/ominilab.vatli365.vn/config/backend.env` |
| SQLite database | `/var/www/ominilab.vatli365.vn/data/ominilab.db` |
| Backend service | `ominilab.service`, bound to `127.0.0.1:8010` |
| Nginx site | `/etc/nginx/sites-available/ominilab.vatli365.vn` |
| Deploy command | `/usr/local/sbin/deploy-ominilab` |
| Application user | `ominilab` |
| SSH deploy user | `ominilab-deploy` |

Nginx serves the Astro `dist` directory, proxies `/api/`, `/docs`, `/redoc`, and `/openapi.json`, and upgrades `/api/lab/ws/` for WebSockets. Certbot manages the Let's Encrypt certificate and HTTP redirects to HTTPS.

## What the deployment script does

`ops/deploy-production.sh` is installed as `/usr/local/sbin/deploy-ominilab`. It:

1. Takes a nonblocking deployment lock.
2. Fast-forwards the server checkout from `origin/main`.
3. Installs backend requirements into the existing virtual environment.
4. Compiles backend Python sources.
5. Runs locked frontend dependency installation.
6. Builds the static frontend with production URLs.
7. Restarts `ominilab.service` and retries local health for up to 15 seconds.

## Manual deployment

Run from the Linux server as root:

```bash
sudo -n /usr/local/sbin/deploy-ominilab
```

Or, from the trusted Windows machine with the deployment key:

```powershell
ssh -i "$env:USERPROFILE\.ssh\ominilab_github_actions" `
  -o IdentitiesOnly=yes `
  ominilab-deploy@ominilab.vatli365.vn `
  "sudo -n /usr/local/sbin/deploy-ominilab"
```

Do not paste PowerShell backticks or `$env:` expressions into a Linux shell.

## GitHub Actions

`.github/workflows/ci-deploy.yml` validates every push and pull request with Python 3.12 and Node 20.19.6. A successful validation on `main` then attempts SSH deployment.

The deployment job expects repository secret `OMINILAB_SSH_PRIVATE_KEY_B64`. Its value must be the Base64 encoding of the complete private-key file, not the public `.pub` line. The workflow strips whitespace, decodes it, validates it with `ssh-keygen`, and pins the production ED25519 host key.

Automatic deployment was verified end to end on 2026-07-19 with workflow #10 for commit `4857de8`. If key decoding fails again, use the recovery steps in `OPERATIONS.md`; manual deployment remains available as a controlled fallback.

## Post-deployment verification

```bash
systemctl is-active ominilab
systemctl is-active nginx
curl -fsS http://127.0.0.1:8010/api/lab/health
curl -fsS https://ominilab.vatli365.vn/api/lab/health
curl -fsS https://ominilab.vatli365.vn/ | grep -o '<title>[^<]*</title>' | head -n 1
curl -fsS https://ominilab.vatli365.vn/openapi.json | python3 -c 'import json,sys; print(json.load(sys.stdin)["info"]["title"])'
```

Also test login, the firmware manifest, an AI request when configured, and bidirectional WSS after changes to authentication, Nginx, WebSockets, or deployment.

## Backup and rollback

Before database, path, service, Nginx, or credential migrations, copy the affected configuration and database to a timestamped root-only directory. A migration backup currently exists at `/root/ominilab-migration-20260719-024239`.

The pre-rename frontend was moved recoverably to `/var/www/ominilab.vatli365.vn/legacy/frontend_OmiLb-20260719`. It is not served and may be removed later only after an explicit decision.

For a code rollback, select a known good Git commit, review the change, update the checkout safely, rebuild, restart, and repeat all health checks. Do not use `git reset --hard` on a dirty server checkout.
