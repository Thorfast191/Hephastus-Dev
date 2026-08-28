# Deployment

This walks through deploying to a generic Linux VPS (Ubuntu/Debian
assumed for package names; adjust for your distro). No specific
provider is assumed.

## Prerequisites on the VPS

- Node.js 18.18+ and Corepack (`corepack enable && corepack prepare pnpm@latest --activate`)
- Docker and the Docker Compose plugin (`docker compose version` should work)
- PM2 (`npm install -g pm2`)
- Nginx
- certbot with the Nginx plugin (`apt install certbot python3-certbot-nginx` on Debian/Ubuntu)

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
- `AUTH_SECRET` — generate with `openssl rand -base64 32`.
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` —
  your SMTP provider's credentials. Leaving `SMTP_HOST` empty is valid;
  the app logs emails to the console instead of sending them, which is
  useful for a staging deploy but not for production.
- `SITE_URL` — the real public URL, e.g. `https://example.com`. This
  feeds `sitemap.xml`, `robots.txt`, and the OG image's absolute URL
  resolution.

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

`db:seed` is idempotent for content (it only inserts Services/Portfolio/
Testimonials/Team rows if the table is empty) but always upserts
`SiteSettings`. Edit the placeholder content afterwards from `/admin`.

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

Edit the copied file: set `server_name` to your real domain(s), and set
the `location /uploads/` `alias` to the absolute path of this project's
`uploads/` directory on the VPS (e.g. `/home/deploy/agency-website/uploads/`).

```bash
sudo ln -s /etc/nginx/sites-available/agency-website /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d example.com -d www.example.com
```

certbot rewrites the Nginx config in place to add the HTTPS server block
and an HTTP-to-HTTPS redirect — there's no TLS config to hand-write.

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

## Redeploying after changes

```bash
git pull
pnpm install
pnpm exec prisma migrate deploy
pnpm build
pm2 restart agency-website
```
