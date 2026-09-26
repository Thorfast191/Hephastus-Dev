# Agency Website + Admin CMS

## Prerequisites

- Node.js 18.18+ (developed against Node 24)
- pnpm, via Corepack: `corepack enable && corepack prepare pnpm@latest --activate`
- A local PostgreSQL server running and reachable at `localhost:5432`

## Local setup

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Create a dedicated database role and database (needs `CREATEDB` so
   Prisma can create its shadow database for `migrate dev`):
   ```bash
   DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=\n')
   psql postgres -c "CREATE ROLE agency_app WITH LOGIN CREATEDB PASSWORD '$DB_PASSWORD';"
   psql postgres -c "CREATE DATABASE agency_dev OWNER agency_app;"
   echo "DATABASE_URL=\"postgresql://agency_app:${DB_PASSWORD}@localhost:5432/agency_dev\"" > .env
   ```
3. Copy `.env.example` for reference and add the remaining value to `.env`:
   ```bash
   echo "AUTH_SECRET=\"$(openssl rand -base64 32)\"" >> .env
   ```
4. Run migrations:
   ```bash
   pnpm exec prisma migrate dev
   ```
   Use `pnpm exec`, not `pnpm dlx` — `dlx` always fetches a fresh copy from
   npm's `latest` tag, which currently points at Prisma's newer
   cloud-platform-oriented major version. This project is pinned to the
   classic Prisma 6.x workflow (`prisma`/`@prisma/client` in
   `package.json`), and `pnpm exec` runs that pinned local version.
5. Seed placeholder content (services, portfolio, testimonials, team, site
   settings) and create your admin login:
   ```bash
   pnpm db:seed
   pnpm seed:admin --email you@example.com --password your-password --name "Your Name"
   ```
6. Start the dev server:
   ```bash
   pnpm dev
   ```
   The app serves several hosts (see DEPLOY.md). Locally they are
   subdomains of `localhost`, which browsers resolve with no setup:

   | URL | What |
   |---|---|
   | http://localhost:3000 | Redirects to your region/language and opens the chooser |
   | http://eu.localhost:3000/en, `/fr` | Europe & international site |
   | http://bd.localhost:3000/en | Bangladesh site |
   | http://admin.localhost:3000/admin | Admin |

   If you run on another port, set `ROOT_DOMAIN="localhost:<port>"`.

## Admin users

There are two kinds of admin:

- **Super admin** — both sites, the team, and other admin accounts.
- **Region admin** — one site (Europe or Bangladesh): its leads,
  meetings, settings and booking hours, and content shown on that site
  alone. Content shared by both sites is read-only for them.

Create the first super admin from the command line:

```bash
pnpm seed:admin --email you@example.com --password your-password --name "Your Name"
```

After that, add and manage admins from **Admin → Admins**. The script can
also create region admins (`--role region --region BD`). Running it again
for the same email resets that account's password (and name) without
touching its role unless `--role` is given — this is also how you
recover a forgotten super-admin password. Environment variables
`ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` / `ADMIN_ROLE` /
`ADMIN_REGION` work in place of the flags.

## Notes

- Local dev uses a native Postgres install, not Docker. `docker-compose.yml`
  (added later) is for the VPS deployment target only.
- Prisma is pinned to the 6.x line, not `latest`. Prisma 7+ replaced the
  classic `schema.prisma` + `migrate` workflow with a cloud-platform CLI
  (managed Postgres, branches, contracts) that doesn't fit this project's
  self-hosted requirement.
- `pnpm test` runs the unit tests (host/region/language resolution, the
  localized-text helpers, and a check that `messages/en.json` and
  `messages/fr.json` define the same keys).
- Interface text lives in `messages/<locale>.json`; admin-edited content
  stores each text field as `{"en": "…", "fr": "…"}` and falls back to
  English. Regions and languages are declared in `src/lib/site/config.ts`.
