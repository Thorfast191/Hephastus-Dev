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
5. Start the dev server:
   ```bash
   pnpm dev
   ```
   Visit http://localhost:3000.

## Admin user

Creating/resetting the admin login is not available yet — it ships in
Phase 1 as `pnpm seed:admin`. This section will be updated then.

## Notes

- Local dev uses a native Postgres install, not Docker. `docker-compose.yml`
  (added later) is for the VPS deployment target only.
- Prisma is pinned to the 6.x line, not `latest`. Prisma 7+ replaced the
  classic `schema.prisma` + `migrate` workflow with a cloud-platform CLI
  (managed Postgres, branches, contracts) that doesn't fit this project's
  self-hosted requirement.
- No test suite in v1 — TypeScript strict mode and Zod validation at input
  boundaries are the correctness net.
