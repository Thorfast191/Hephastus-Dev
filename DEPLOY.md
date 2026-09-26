# Deployment

This walks through deploying to a generic Linux VPS (Ubuntu/Debian
assumed for package names; adjust for your distro). No specific
provider is assumed.

One app serves four hosts, told apart by the `Host` header
(see `src/middleware.ts`):

| Host | Serves |
|---|---|
| `hephastusdev.com` | Redirects each visitor to their region + language; first-timers see the chooser |
| `eu.hephastusdev.com` | Europe & international site — `/en`, `/fr` |
| `bd.hephastusdev.com` | Bangladesh site — `/en` |
| `admin.hephastusdev.com` | Admin panel (both regions, with a region switcher) |

## DNS

Point the apex and a wildcard at the VPS:

```
A     hephastusdev.com      <VPS IP>
A     *.hephastusdev.com    <VPS IP>
```

Recommended: put the domain on Cloudflare (free plan) with the proxy
enabled. The app then gets each visitor's country from the
`CF-IPCountry` header, which pre-fills the country in the chooser and
sends Bangladeshi visitors to the BD site. Without Cloudflare it falls
back to the browser's language settings, which is less accurate.

## Prerequisites on the VPS

- Node.js 18.18+ and Corepack (`corepack enable && corepack prepare pnpm@latest --activate`)
- Docker and the Docker Compose plugin (`docker compose version` should work)
- PM2 (`npm install -g pm2`)
- Nginx
- certbot with the Nginx plugin and, for the wildcard certificate, a DNS
  plugin for your DNS provider (`apt install certbot python3-certbot-nginx
  python3-certbot-dns-cloudflare` on Debian/Ubuntu with Cloudflare DNS)

## 1. Clone and install

```bash
git clone <your-repo-url> agency-website
cd agency-website
pnpm install
```

## 2. Configure .env

Copy `.env.example` to `.env` and fill in real values:

```bash
cp .env.example .env
```

- `DATABASE_URL` — must point at the Postgres container started in step 3,
  using the *same* credentials as `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB`
  below, e.g. `postgresql://agency_app:<password>@localhost:5432/agency_production`.
- `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` — read by
  `docker-compose.yml` to initialize the Postgres container. Generate a
  real password (`openssl rand -base64 24 | tr -d '/+=\n'`) — don't ship
  the `changeme` placeholder.
- `POSTGRES_PORT` — host port the Postgres container binds (defaults to
  `5432`). Only change it if `5432` is already taken on the box; keep it
  in sync with the port in `DATABASE_URL`.
- `AUTH_SECRET` — generate with `openssl rand -base64 32`.
- `AUTH_URL` — leave unset. Auth.js is configured with `trustHost: true`
  for this reverse-proxy setup; only set `AUTH_URL` to the public origin
  if you still hit `UntrustedHost` errors on login.
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` —
  your SMTP provider's credentials. Leaving `SMTP_HOST` empty is valid;
  the app logs emails to the console instead of sending them, which is
  useful for a staging deploy but not for production.
- `ROOT_DOMAIN` — the bare domain, `hephastusdev.com`. Every host and
  every absolute link (canonical URLs, hreflang, sitemap, the chooser's
  cross-site redirect) is derived from it.
- `SITE_PROTOCOL` — leave unset in production (defaults to `https`).

`ROOT_DOMAIN` and `SITE_PROTOCOL` must be set when you run `pnpm build`,
not just when the app starts: the public pages are prerendered at build
time and bake their absolute URLs in. (`SITE_URL` from older versions is
no longer read.)

## 3. Start Postgres

```bash
docker compose up -d postgres
```

## 4. Run migrations

```bash
pnpm exec prisma migrate deploy
```

Use `migrate deploy`, not `migrate dev` — `migrate dev` needs `CREATEDB`
privilege for a shadow database (a local-dev-only requirement) and can
prompt interactively, neither of which belongs in a production deploy.
Also use `pnpm exec`, never `pnpm dlx` — `dlx` always fetches the latest
npm dist-tag, which currently points at Prisma's newer cloud-platform
major version, not the classic migration workflow this project uses.

## 5. Seed content and the admin user

```bash
pnpm db:seed
pnpm seed:admin --email you@example.com --password 'a-real-password' --name "Your Name"
```

The account created by `seed:admin` is a super admin. Add region admins
(Europe-only or Bangladesh-only staff) from **Admin → Admins**.

`db:seed` is idempotent: it only inserts content, availability rules and
per-region `SiteSettings` rows that don't exist yet. Placeholder content
comes with draft French translations. Edit it afterwards from
`https://admin.hephastusdev.com/admin`: pick **Europe** or **Bangladesh**
in the header switcher to edit that site's settings (hero text, contact
details, WhatsApp number, prices, timezone) and booking hours.

## 6. Build and start the app

```bash
pnpm build
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

`pm2 startup` prints a command to run once (as root) so PM2's process
list survives a server reboot — follow its output.

## 7. Configure Nginx and TLS

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/agency-website
```

Edit the copied file: check `server_name` covers the apex and
`*.` wildcard of your domain, and set the `location /uploads/` `alias`
to the absolute path of this project's `uploads/` directory on the VPS
(e.g. `/home/deploy/agency-website/uploads/`). Keep the
`X-Forwarded-Host` line — the app routes on it.

```bash
sudo ln -s /etc/nginx/sites-available/agency-website /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

TLS needs a certificate covering `*.hephastusdev.com`, and Let's Encrypt
only issues wildcards through a DNS challenge. With Cloudflare DNS
(create an API token with *Zone → DNS → Edit* and put it in
`~/.cf.ini` as `dns_cloudflare_api_token = …`, `chmod 600`):

```bash
sudo certbot certonly --dns-cloudflare --dns-cloudflare-credentials ~/.cf.ini \
  -d hephastusdev.com -d '*.hephastusdev.com'
sudo certbot install --nginx --cert-name hephastusdev.com
```

Alternatively, with the Cloudflare proxy on, use a Cloudflare Origin
Certificate (covers the wildcard, no renewal) and set SSL mode to
*Full (strict)*.

## 8. Persistent uploads

`uploads/` on disk is not part of the build and is gitignored. If your
deploy process ever replaces the project directory wholesale (e.g. a
symlinked "current release" pattern), `uploads/` must live outside that
replaced directory and be bind-mounted or symlinked back in — losing it
silently breaks every previously-uploaded portfolio/team/testimonial
image. A simple `git pull`-in-place deploy (as this guide uses) doesn't
have this problem, since `uploads/` is never touched by `git`.

## 9. Daily backups

```bash
crontab -e
```

Add:

```
0 3 * * * /home/deploy/agency-website/deploy/pg-backup.sh >> /var/log/agency-website-backup.log 2>&1
```

(Adjust the path to wherever the project actually lives.) This runs
`pg_dump` inside the Postgres container nightly at 03:00, gzips the
output to `/var/backups/agency-website/`, and deletes backups older
than 7 days.

## Upgrading from the single-region version

The `regions_and_localized_content` migration converts the existing
content in place: every text field becomes `{"en": <old text>}`, all
content is shown on both sites, the existing settings become the Europe
row and are copied to a new Bangladesh row (timezone `Asia/Dhaka`),
availability rules and blackout dates are copied to Bangladesh, and
existing leads and meetings are marked Europe. Take a backup first:

```bash
./deploy/pg-backup.sh
pnpm exec prisma migrate deploy
```

Then set `ROOT_DOMAIN` in `.env`, rebuild, and update the Nginx config
and certificate as above.

## Redeploying after changes

```bash
git pull
pnpm install
pnpm exec prisma migrate deploy
pnpm build
pm2 restart agency-website
```
