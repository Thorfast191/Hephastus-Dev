# Phase 0: Scaffold, Local Database, Auth.js Wiring — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working local dev environment — `pnpm dev` serves a Next.js 15 app backed by a local Postgres database via Prisma, with Auth.js v5 (Credentials provider, JWT sessions) wired end-to-end at the plumbing level. No login UI or protected routes yet — those are Phase 2.

**Architecture:** Scaffold Next.js 15 (App Router, TypeScript, Tailwind, `src/` dir) with pnpm, add shadcn/ui, connect Prisma to a dedicated database/role on the machine's existing native Postgres 18 instance, define the `AdminUser` model and run the first migration, then configure Auth.js v5 against that model.

**Tech Stack:** Next.js 15 (pinned — `create-next-app@latest` currently scaffolds Next 16), TypeScript strict mode, Tailwind CSS, shadcn/ui, Prisma + `@prisma/client`, PostgreSQL (native Homebrew instance, not Docker), Auth.js v5 (`next-auth@beta`), `bcryptjs`, pnpm via Corepack.

**Spec:** `docs/superpowers/specs/2026-08-25-agency-website-design.md`

## Global Constraints

- Next.js 15, App Router, TypeScript strict mode (spec: Tech stack; version pin confirmed over the tool's current 16 default).
- PostgreSQL + Prisma ORM (spec: Tech stack).
- Local dev database is a dedicated role/database on the machine's existing native Homebrew Postgres 18 instance — NOT `docker-compose` (spec: "Decisions carried in from clarifying questions" — local dev database note). `docker-compose.yml` is written later, in the Phase 8 deployment plan, for the VPS target only.
- Auth.js v5 (`next-auth@beta`), Credentials provider only, JWT session strategy, bcrypt-hashed passwords. No public registration route exists anywhere in the app, ever (spec: Auth & admin access).
- pnpm package manager, activated via Corepack (already available on this machine at v0.34.6) — no global npm install needed.
- No test suite for v1 — TypeScript strict mode and Zod validation at input boundaries are the correctness net instead (spec: Tech stack). Verification steps in this plan use manual commands (`curl`, `psql`, `pnpm build`), not a test runner.
- Secrets live in a root `.env` (gitignored, loaded automatically by both Next.js and the Prisma CLI); `.env.example` is the committed, documented contract with placeholder values.

---

### Task 1: Scaffold the Next.js 15 project

**Files:**
- Create: entire Next.js scaffold at the project root (`package.json`, `src/app/*`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `public/*`, `.gitignore`) via `create-next-app@15`.

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a runnable Next.js 15 app (`pnpm dev` on port 3000), `src/app/` as the App Router root, `@/*` import alias resolving to `src/*`.

- [ ] **Step 1: Activate pnpm via Corepack**

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm -v
```

Expected: prints a pnpm version number (already confirmed available: 11.24.0).

- [ ] **Step 2: Scaffold the app, pinned to Next.js 15**

Run from the project root (`/Users/macbookair/Work/Web Devlopment/software agency`, which currently contains only `.git/` and `docs/` — `create-next-app` tolerates this, confirmed by a spike test):

```bash
pnpm dlx create-next-app@15 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --yes
```

This can take several minutes on first run (dependency download) — do not treat a long-running install as stuck.

- [ ] **Step 3: Verify the scaffold and install completed**

```bash
test -d node_modules/next && echo "next installed" || echo "FAIL: next not installed"
grep '"strict": true' tsconfig.json && echo "strict mode on" || echo "FAIL: strict mode not enabled"
```

Expected: both checks print their success line. If `next` isn't installed, re-run `pnpm install` directly (the scaffold step may have completed writing files but been interrupted during dependency install). If strict mode isn't on, add `"strict": true` to the `compilerOptions` in `tsconfig.json`.

- [ ] **Step 4: Verify the dev server serves the default page**

```bash
pnpm dev &
DEV_PID=$!
sleep 5
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000
kill $DEV_PID
```

Expected: prints `200`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Scaffold Next.js 15 app with TypeScript, Tailwind, App Router"
```

---

### Task 2: Add shadcn/ui

**Files:**
- Create: `components.json`, `src/lib/utils.ts`, `src/components/ui/button.tsx`.
- Modify: `src/app/globals.css` (shadcn theme CSS variables), `tsconfig.json` (path alias additions if the init script adds any beyond what Task 1 already set).

**Interfaces:**
- Consumes: the `@/*` import alias and Tailwind setup from Task 1.
- Produces: `src/components/ui/*` as the location all future shadcn components install into; `cn()` helper exported from `src/lib/utils.ts` for class-name merging, used by every future component that needs conditional classes.

- [ ] **Step 1: Initialize shadcn/ui with defaults, non-interactively**

```bash
pnpm dlx shadcn@latest init -y -d
```

Expected: creates `components.json` and `src/lib/utils.ts`, updates `src/app/globals.css` with shadcn's CSS variables.

- [ ] **Step 2: Add the Button component as a smoke test**

```bash
pnpm dlx shadcn@latest add button -y
```

Expected: creates `src/components/ui/button.tsx`.

- [ ] **Step 3: Verify the project still builds**

```bash
pnpm build
```

Expected: exits 0 (typecheck + lint + build all pass). Fix any reported type/lint errors before continuing — don't skip past a red build.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add shadcn/ui with the Button component"
```

---

### Task 3: Local Postgres database + Prisma + AdminUser model

**Files:**
- Create: `prisma/schema.prisma`, `.env` (gitignored, real local secret), `.env.example` (committed, placeholder).
- Modify: `.gitignore` (ensure `.env.example` is committed despite an `.env*` ignore pattern, if one exists).

**Interfaces:**
- Consumes: nothing new from prior tasks.
- Produces: a migrated `AdminUser` table (`id: String @id @default(cuid())`, `email: String @unique`, `passwordHash: String`, `name: String`, `role: AdminRole @default(ADMIN)`, `createdAt`, `updatedAt`) that Task 4's Auth.js config and the Phase 1 seed script both depend on by these exact field names.

- [ ] **Step 1: Confirm `.env.example` can be committed**

```bash
git check-ignore -v .env.example || echo "not ignored, good"
```

If it prints a matching ignore rule (e.g. a blanket `.env*` line in `.gitignore`), open `.gitignore` and add `!.env.example` immediately after that line so the example file can still be committed while `.env` stays ignored.

- [ ] **Step 2: Create a dedicated Postgres role and database for local dev**

```bash
DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=\n')
psql postgres -c "CREATE ROLE agency_app WITH LOGIN PASSWORD '$DB_PASSWORD';"
psql postgres -c "CREATE DATABASE agency_dev OWNER agency_app;"
echo "DATABASE_URL=\"postgresql://agency_app:${DB_PASSWORD}@localhost:5432/agency_dev\"" > .env
unset DB_PASSWORD
```

Expected: both `psql` commands print `CREATE ROLE` / `CREATE DATABASE`.

- [ ] **Step 3: Write the committed `.env.example`**

Create `.env.example`:

```
DATABASE_URL="postgresql://agency_app:changeme@localhost:5432/agency_dev"
```

- [ ] **Step 4: Install Prisma**

```bash
pnpm add -D prisma
pnpm add @prisma/client
```

- [ ] **Step 5: Write `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum AdminRole {
  ADMIN
}

model AdminUser {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String
  name         String
  role         AdminRole @default(ADMIN)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}
```

- [ ] **Step 6: Run the first migration**

```bash
pnpm dlx prisma migrate dev --name init_admin_user
```

Expected: creates `prisma/migrations/<timestamp>_init_admin_user/`, applies it, generates the Prisma client. Prisma CLI reads `DATABASE_URL` from the root `.env` automatically — no extra sourcing needed.

- [ ] **Step 7: Verify the table exists with the expected columns**

```bash
set -a; source .env; set +a
psql "$DATABASE_URL" -c '\d "AdminUser"'
```

Expected: lists columns `id, email, passwordHash, name, role, createdAt, updatedAt`.

- [ ] **Step 8: Commit**

```bash
git add prisma .env.example .gitignore
git commit -m "Add Prisma with AdminUser model, connect to local Postgres"
```

(`.env` is intentionally not added — verify with `git status` that it does not appear as staged.)

---

### Task 4: Auth.js v5 wiring (Credentials provider, no UI yet)

**Files:**
- Create: `src/lib/prisma.ts`, `src/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/types/next-auth.d.ts`.
- Modify: `.env` (add `AUTH_SECRET`), `.env.example` (document `AUTH_SECRET`).

**Interfaces:**
- Consumes: `AdminUser` model from Task 3 (fields `email`, `passwordHash`, `id`, `name`).
- Produces: `prisma` (typed `PrismaClient` singleton) from `@/lib/prisma`, used by every future server-side data access. `auth`, `handlers`, `signIn`, `signOut` exported from `@/auth`, used by Phase 2's login page and protected `/admin` layout.

- [ ] **Step 1: Install dependencies**

```bash
pnpm add next-auth@beta bcryptjs
pnpm add -D @types/bcryptjs
```

- [ ] **Step 2: Generate and store `AUTH_SECRET`**

```bash
echo "AUTH_SECRET=\"$(openssl rand -base64 32)\"" >> .env
echo 'AUTH_SECRET="changeme"' >> .env.example
```

- [ ] **Step 3: Create the Prisma client singleton**

Create `src/lib/prisma.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 4: Add the session/JWT type augmentation**

Create `src/types/next-auth.d.ts`:

```ts
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}
```

- [ ] **Step 5: Create the Auth.js config**

Create `src/auth.ts`:

```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.adminUser.findUnique({ where: { email } });
        if (!user) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
});
```

- [ ] **Step 6: Create the route handler**

Create `src/app/api/auth/[...nextauth]/route.ts`:

```ts
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
```

- [ ] **Step 7: Verify it builds**

```bash
pnpm build
```

Expected: exits 0. This catches any type mismatch between the augmentation file and `src/auth.ts`.

- [ ] **Step 8: Verify the auth plumbing responds correctly with no session and no login UI**

```bash
pnpm dev &
DEV_PID=$!
sleep 5
curl -s http://localhost:3000/api/auth/providers
echo
curl -s http://localhost:3000/api/auth/session
echo
kill $DEV_PID
```

Expected: the first `curl` prints JSON containing `"id":"credentials"`; the second prints `null` (unauthenticated, no session) with no server error. A full login round-trip is exercised in the Phase 2 plan once a login page and a real admin user exist.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Wire Auth.js v5 Credentials provider against AdminUser"
```

---

### Task 5: Local setup README

**Files:**
- Modify: `README.md` (replace `create-next-app`'s default content).

**Interfaces:**
- Consumes: the setup steps performed in Tasks 1–4.
- Produces: nothing consumed by later phases' code — this task documents Phase 0's setup for a human. Phase 1 will append admin-seeding instructions to this same file once `pnpm seed:admin` exists.

- [ ] **Step 1: Write `README.md`**

```markdown
# Agency Website + Admin CMS

## Prerequisites

- Node.js 18.18+ (tested with Node 24)
- pnpm, via Corepack: `corepack enable && corepack prepare pnpm@latest --activate`
- A local PostgreSQL server running and reachable at `localhost:5432`

## Local setup

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Create a dedicated database role and database:
   ```bash
   DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=\n')
   psql postgres -c "CREATE ROLE agency_app WITH LOGIN PASSWORD '$DB_PASSWORD';"
   psql postgres -c "CREATE DATABASE agency_dev OWNER agency_app;"
   echo "DATABASE_URL=\"postgresql://agency_app:${DB_PASSWORD}@localhost:5432/agency_dev\"" > .env
   ```
3. Copy `.env.example` for reference and fill in the remaining values in `.env`
   (`AUTH_SECRET` — generate with `openssl rand -base64 32`).
4. Run migrations:
   ```bash
   pnpm dlx prisma migrate dev
   ```
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
- No test suite in v1 — TypeScript strict mode and Zod validation at input
  boundaries are the correctness net.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "Add local setup README"
```
