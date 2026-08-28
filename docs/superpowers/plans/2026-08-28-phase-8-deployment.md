# Phase 8: Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce everything needed to run this project on a generic self-hosted VPS: a `docker-compose.yml` for Postgres, a PM2 `ecosystem.config.js` for the Next.js process, an Nginx reverse-proxy template (including the `/uploads/` static-file bypass), a daily backup script with 7-day rotation, and a `DEPLOY.md` that walks through the whole sequence end to end.

**Architecture:** Only Postgres runs in Docker (per the spec's own scope — the Next.js app itself runs directly on the host under PM2, not containerized). Nginx terminates TLS and reverse-proxies to the PM2-managed Next.js process on `127.0.0.1:3000`, serving `/uploads/` directly from disk to bypass Node for static files. This is documentation and static config generation, not application code — there is no browser to verify against, so each task is verified by syntax-checking the artifact (YAML/JS/Bash parse) plus a careful manual read-through against the actual scripts and env vars this project already has (`package.json`, `.env.example`, the upload route's `/uploads/<file>` convention).

**Tech Stack:** Docker Compose (Postgres only), PM2, Nginx, certbot (documented as a manual step, not scripted).

**Spec:** `docs/superpowers/specs/2026-08-25-agency-website-design.md` (see "Deployment" section)

## Global Constraints

- This project has no specific target VPS yet (per an earlier clarifying-question answer) — `DEPLOY.md` and the config templates stay generic (placeholder domain, placeholder paths), not tied to a specific provider.
- Neither Docker nor PM2 is installed in this dev environment — config files are verified by syntax-checking (YAML parse via `python3 -c "import yaml; ..."`, JS syntax via `node -e "require(...)"`, Bash syntax via `bash -n`) and careful manual review against this project's actual `package.json` scripts and `.env`/`.env.example` variables, not by an actual deploy.
- The Next.js app itself is **not** containerized — only Postgres runs in Docker Compose, matching the spec's explicit scope ("`docker-compose.yml`: single Postgres service"). The app runs directly on the VPS host via PM2 + `pnpm start` (i.e. `next start`), consistent with `package.json`'s existing `"start": "next start"` script.
- Uploaded files live on local disk at `<project-root>/uploads/` and are referenced publicly as `/uploads/<filename>` (confirmed in `src/app/api/upload/route.ts`) — the Nginx template's `location /uploads/` block and `DEPLOY.md`'s persistence warning both need to match this exact path convention.
- Production migrations use `pnpm exec prisma migrate deploy`, never `migrate dev` — `migrate dev` requires `CREATEDB` privilege for a shadow database (a dev-only need, already documented in this project's README for local setup) and is interactive/destructive-capable in ways inappropriate for a production deploy script.
- Deployment-specific artifacts that aren't auto-discovered by a tool from a fixed location (Nginx config, the backup script) live under a new `deploy/` directory to keep the project root uncluttered; `docker-compose.yml` and `ecosystem.config.js` stay at the project root because Docker Compose and PM2 both look for those filenames there by convention.

---

### Task 1: docker-compose.yml and PM2 ecosystem.config.js

**Files:**
- Create: `docker-compose.yml`
- Create: `ecosystem.config.js`
- Modify: `.env.example`

**Interfaces:**
- Consumes: nothing from earlier phases beyond the existing `.env` variable conventions.
- Produces: `docker-compose.yml` (referenced by `DEPLOY.md` and `deploy/pg-backup.sh` in Task 2), `ecosystem.config.js` (referenced by `DEPLOY.md` in Task 3).

- [ ] **Step 1: Add Postgres container credentials to .env.example**

Docker Compose needs `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` (its own standard variable names for the official `postgres` image) separately from the app's own `DATABASE_URL` — the two must describe the same database. Add to `.env.example`, after the existing `DATABASE_URL` line:

```
POSTGRES_USER="agency_app"
POSTGRES_PASSWORD="changeme"
POSTGRES_DB="agency_production"
```

- [ ] **Step 2: Write docker-compose.yml**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

The port binds to `127.0.0.1` only, not `0.0.0.0` — Postgres should be reachable from the Next.js process on the same host, never exposed to the public internet directly.

- [ ] **Step 3: Write ecosystem.config.js**

```js
module.exports = {
  apps: [
    {
      name: "agency-website",
      script: "pnpm",
      args: "start",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
```

- [ ] **Step 4: Verify syntax**

```bash
python3 -c "import yaml; yaml.safe_load(open('docker-compose.yml')); print('docker-compose.yml: valid YAML')"
node -e "require('./ecosystem.config.js'); console.log('ecosystem.config.js: valid module')"
```

Expected: both print their success line with no errors.

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml ecosystem.config.js .env.example
git commit -m "Add docker-compose.yml (Postgres) and PM2 ecosystem.config.js"
```

---

### Task 2: Nginx template and backup script

**Files:**
- Create: `deploy/nginx.conf`
- Create: `deploy/pg-backup.sh`

**Interfaces:**
- Consumes: the `POSTGRES_USER`/`POSTGRES_DB` env vars from Task 1.
- Produces: both files, referenced by `DEPLOY.md` in Task 3.

- [ ] **Step 1: Write the Nginx template**

`deploy/nginx.conf`:

```nginx
# Copy to /etc/nginx/sites-available/agency-website on the VPS, adjust
# `server_name` and the /uploads/ alias path, then:
#   ln -s /etc/nginx/sites-available/agency-website /etc/nginx/sites-enabled/
#   nginx -t && systemctl reload nginx
# Run `certbot --nginx -d example.com -d www.example.com` afterwards --
# certbot rewrites this file in place to add the HTTPS server block and
# the HTTP-to-HTTPS redirect, so there is no TLS config to hand-write here.

upstream agency_website {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    listen [::]:80;
    server_name example.com www.example.com;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
    gzip_min_length 256;

    # Serve uploaded files directly from disk, bypassing Node entirely.
    # This path must point at the project's `uploads/` directory and must
    # be a stable location that survives redeploys -- see DEPLOY.md.
    location /uploads/ {
        alias /var/www/agency-website/uploads/;
        expires 30d;
        access_log off;
    }

    location / {
        proxy_pass http://agency_website;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

- [ ] **Step 2: Write the backup script**

`deploy/pg-backup.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Daily Postgres backup with 7-day rotation.
# Install via crontab (run as the deploy user, from anywhere):
#   0 3 * * * /path/to/agency-website/deploy/pg-backup.sh >> /var/log/agency-website-backup.log 2>&1

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="/var/backups/agency-website"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

cd "$PROJECT_DIR"
set -a
source .env
set +a

mkdir -p "$BACKUP_DIR"

docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  | gzip > "$BACKUP_DIR/agency-website-$TIMESTAMP.sql.gz"

find "$BACKUP_DIR" -name "agency-website-*.sql.gz" -mtime "+$RETENTION_DAYS" -delete
```

- [ ] **Step 3: Make the backup script executable and verify syntax**

```bash
chmod +x deploy/pg-backup.sh
bash -n deploy/pg-backup.sh && echo "pg-backup.sh: valid syntax"
```

Expected: prints the success line with no errors. (`bash -n` parses without executing, so it's safe to run without Docker or a real `.env` present.)

- [ ] **Step 4: Commit**

```bash
git add deploy/nginx.conf deploy/pg-backup.sh
git commit -m "Add Nginx reverse-proxy template and Postgres backup script"
```

---

### Task 3: DEPLOY.md

**Files:**
- Create: `DEPLOY.md`

**Interfaces:**
- Consumes: `docker-compose.yml` and `ecosystem.config.js` (Task 1), `deploy/nginx.conf` and `deploy/pg-backup.sh` (Task 2), and the existing `package.json` scripts / `.env.example` variables / README conventions.
- Produces: nothing consumed elsewhere — this is the last file in the last phase.

- [ ] **Step 1: Write DEPLOY.md**

```markdown
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
```

- [ ] **Step 2: Proofread against the real project**

Re-read `DEPLOY.md` against `package.json`'s actual scripts (`dev`, `build`, `start`, `seed:admin`, `db:seed`), `.env.example`'s actual variable names (including the two added in Task 1), and `scripts/seed-admin.ts`'s actual CLI flags (`--email`, `--password`, `--name`). Fix any drift before committing — this file will be followed literally by a human with no other context.

- [ ] **Step 3: Commit**

```bash
git add DEPLOY.md
git commit -m "Add DEPLOY.md"
```

---

## Phase 8 completion — project completion

After Task 3's commit, all 9 phases from the original spec (0-Scaffold through 8-Deploy docs) are complete: scaffold, schema, admin auth, admin CRUD, leads/contact/email, the self-built meeting scheduler (availability admin + booking engine), the public site pulling live data, visual/motion/SEO polish, and deployment docs. This is the last plan in this project — there is no Phase 9 to write next. Report completion to the user with a summary of what was built and point them at `README.md` (local dev) and `DEPLOY.md` (production) as the two entry points.
