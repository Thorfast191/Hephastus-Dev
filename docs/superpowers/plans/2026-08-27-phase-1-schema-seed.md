# Phase 1: Full Schema, Migrations, Seed Scripts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The full Prisma data model from the spec exists and is migrated (Service, PortfolioItem, Testimonial, TeamMember, SiteSettings, Lead, Meeting, AvailabilityRule, BlackoutDate — `AdminUser` already exists from Phase 0). A `pnpm seed:admin` script creates/resets the admin login. A `pnpm db:seed` script (also wired to `prisma db seed`) seeds the singleton `SiteSettings` row plus clearly-marked placeholder content for Services/Portfolio/Testimonials/Team.

**Architecture:** Extend `prisma/schema.prisma` in place, one migration. Two separate seed scripts on purpose: `scripts/seed-admin.ts` (re-runnable anytime to create or reset the one admin login) and `prisma/seed.ts` (one-time-ish content bootstrap, idempotent via row-count checks so re-running is still safe).

**Tech Stack:** Same as Phase 0 (Next.js 15, Prisma 6.19.3, Auth.js v5) plus `tsx` for running the TypeScript seed scripts directly.

**Spec:** `docs/superpowers/specs/2026-08-25-agency-website-design.md`

## Global Constraints

- Prisma is pinned to 6.19.3, not `latest` — Prisma 7+ replaced the classic schema/migrate workflow with a cloud-platform CLI that doesn't fit this project's self-hosted requirement (established in Phase 0).
- Always invoke the Prisma CLI via `pnpm exec prisma`, never `pnpm dlx prisma` — `dlx` always fetches fresh from npm's `latest` tag (Prisma's newer major), ignoring the pinned local version (established in Phase 0).
- `package.json`'s `"prisma": { "seed": ... }` config still works on 6.x (verified directly — prints a deprecation notice, removed only in 7, which this project avoids). No `prisma.config.ts` needed.
- Local dev database is the native Postgres role/database from Phase 0 (`agency_app`/`agency_dev`), not Docker.
- No public registration route exists anywhere in the app, ever — admin accounts are created only via `pnpm seed:admin`.
- No test suite in v1 — verification here is migrations applying cleanly, `pnpm build` passing, and direct `psql`/script-output checks.
- Content seeded here is clearly-marked placeholder text (bracketed `[Placeholder]` prefix), per the project's content-approach decision — all of it is edited later via the admin panel, never hardcoded into the public site.

---

### Task 1: Extend the schema with the remaining content and business models

**Files:**
- Modify: `prisma/schema.prisma` (append enums and models after the existing `AdminUser` model/`AdminRole` enum)

**Interfaces:**
- Consumes: nothing new from Phase 0 beyond the existing datasource/generator blocks.
- Produces: the `Service`, `PortfolioItem`, `Testimonial`, `TeamMember`, `SiteSettings`, `Lead`, `Meeting`, `AvailabilityRule`, `BlackoutDate` Prisma models and the `LeadStatus`/`MeetingStatus` enums, with the exact field names below — Task 2 and Task 3's seed scripts, and every later phase's admin/public code, reference these names verbatim.

- [ ] **Step 1: Append the new enums and models to `prisma/schema.prisma`**

Add this block after the existing `AdminUser` model:

```prisma
enum LeadStatus {
  NEW
  CONTACTED
  WON
  LOST
}

enum MeetingStatus {
  CONFIRMED
  CANCELLED
}

model Service {
  id          String   @id @default(cuid())
  title       String
  description String
  icon        String
  order       Int      @default(0)
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  leads Lead[]
}

model PortfolioItem {
  id           String   @id @default(cuid())
  title        String
  description  String
  images       String[]
  tags         String[]
  externalLink String?
  order        Int      @default(0)
  featured     Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model Testimonial {
  id         String   @id @default(cuid())
  quote      String
  authorName String
  company    String?
  photo      String?
  order      Int      @default(0)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model TeamMember {
  id        String   @id @default(cuid())
  name      String
  role      String
  photo     String?
  bio       String
  order     Int      @default(0)
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model SiteSettings {
  id                  String   @id @default(cuid())
  agencyName          String
  tagline             String
  contactEmail        String
  contactPhone        String
  socialLinks         Json
  smtpSenderName      String
  businessTimezone    String
  slotDurationMinutes Int      @default(30)
  minNoticeHours      Int      @default(24)
  bookingWindowDays   Int      @default(30)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}

model Lead {
  id        String     @id @default(cuid())
  name      String
  email     String
  company   String?
  message   String
  serviceId String?
  service   Service?   @relation(fields: [serviceId], references: [id], onDelete: SetNull)
  status    LeadStatus @default(NEW)
  notes     String     @default("")
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
}

model Meeting {
  id              String        @id @default(cuid())
  name            String
  email           String
  topic           String
  scheduledAt     DateTime      @unique
  durationMinutes Int
  status          MeetingStatus @default(CONFIRMED)
  icsUid          String
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

model AvailabilityRule {
  id        String  @id @default(cuid())
  dayOfWeek Int
  startTime String
  endTime   String
  active    Boolean @default(true)
}

model BlackoutDate {
  id     String   @id @default(cuid())
  date   DateTime @unique
  reason String?
}
```

- [ ] **Step 2: Run the migration**

```bash
pnpm exec prisma migrate dev --name add_content_models
```

Expected: creates `prisma/migrations/<timestamp>_add_content_models/`, applies cleanly, regenerates the Prisma Client.

- [ ] **Step 3: Verify the tables exist**

```bash
psql "$DATABASE_URL" -c '\dt'
```

(Load `DATABASE_URL` from `.env` first if not already exported in your shell — e.g. `set -a; source .env; set +a`.)

Expected: lists `AdminUser`, `Service`, `PortfolioItem`, `Testimonial`, `TeamMember`, `SiteSettings`, `Lead`, `Meeting`, `AvailabilityRule`, `BlackoutDate`, plus Prisma's `_prisma_migrations`.

- [ ] **Step 4: Commit**

```bash
git add prisma
git commit -m "Add content and business models to the schema"
```

---

### Task 2: Admin seed script (`pnpm seed:admin`)

**Files:**
- Create: `scripts/seed-admin.ts`
- Modify: `package.json` (add `"seed:admin"` script; `tsx` is already installed as of this task's Step 1)
- Modify: `README.md` (replace the placeholder "Admin user" section with real instructions)

**Interfaces:**
- Consumes: `AdminUser` model from Phase 0 (`email`, `passwordHash`, `name` fields) and the `prisma` singleton pattern (this script makes its own `PrismaClient` instance directly, since it's a standalone CLI script, not part of the Next.js app).
- Produces: the `pnpm seed:admin` command, documented in the README as the only way to create or reset an admin login.

- [ ] **Step 1: Install `tsx`**

```bash
pnpm add -D tsx
```

If pnpm reports `[ERR_PNPM_IGNORED_BUILDS]` for `esbuild` (a `tsx` dependency), run:

```bash
pnpm approve-builds --all
```

- [ ] **Step 2: Write `scripts/seed-admin.ts`**

```ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

async function main() {
  const email = getArg("--email") ?? process.env.ADMIN_EMAIL;
  const password = getArg("--password") ?? process.env.ADMIN_PASSWORD;
  const name = getArg("--name") ?? process.env.ADMIN_NAME ?? "Admin";

  if (!email || !password) {
    console.error(
      'Usage: pnpm seed:admin --email you@example.com --password secret [--name "Your Name"]\n' +
        "Or set ADMIN_EMAIL / ADMIN_PASSWORD (/ ADMIN_NAME) environment variables."
    );
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash, name },
    create: { email, passwordHash, name },
  });

  console.log(`Admin user ready: ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 3: Add the `seed:admin` script to `package.json`**

Add to the `"scripts"` object:

```json
"seed:admin": "tsx scripts/seed-admin.ts"
```

- [ ] **Step 4: Verify it creates an admin user**

```bash
pnpm seed:admin --email admin@example.com --password test-password-123 --name "Test Admin"
```

Expected: prints `Admin user ready: admin@example.com`.

```bash
psql "$DATABASE_URL" -c 'SELECT email, name FROM "AdminUser";'
```

Expected: one row, `admin@example.com` / `Test Admin`.

- [ ] **Step 5: Verify upsert (reset) behavior**

```bash
pnpm seed:admin --email admin@example.com --password a-different-password --name "Test Admin"
```

Expected: prints the same success line, no error about a duplicate email.

```bash
psql "$DATABASE_URL" -c 'SELECT count(*) FROM "AdminUser";'
```

Expected: `1` — the row was updated in place, not duplicated.

- [ ] **Step 6: Update the README's "Admin user" section**

Replace the current placeholder section with:

```markdown
## Admin user

Create or reset the admin login:

```bash
pnpm seed:admin --email you@example.com --password your-password --name "Your Name"
```

Or set `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` environment
variables instead of passing flags. Running this again for the same
email updates that user's password and name rather than creating a
second account — this is also how you reset a forgotten password.
```

- [ ] **Step 7: Commit**

```bash
git add scripts package.json pnpm-lock.yaml README.md
git commit -m "Add pnpm seed:admin script for creating/resetting the admin login"
```

---

### Task 3: Content seed script (`SiteSettings` + placeholder content)

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json` (add the `"prisma": { "seed": "tsx prisma/seed.ts" }` config block and a `"db:seed"` script)

**Interfaces:**
- Consumes: `Service`, `PortfolioItem`, `Testimonial`, `TeamMember`, `SiteSettings` models from Task 1.
- Produces: the `pnpm db:seed` command (and `prisma db seed`, which some future Prisma commands like `migrate reset` call automatically) as the way to (re-)populate placeholder content. Idempotent — safe to run multiple times.

- [ ] **Step 1: Write `prisma/seed.ts`**

```ts
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SERVICES: Prisma.ServiceCreateManyInput[] = [
  {
    title: "Web Development",
    icon: "Globe",
    description:
      "[Placeholder] Custom web applications built with modern, scalable frameworks — replace this copy in /admin.",
    order: 0,
  },
  {
    title: "Desktop Apps",
    icon: "Monitor",
    description:
      "[Placeholder] Cross-platform desktop software tailored to your workflow — replace this copy in /admin.",
    order: 1,
  },
  {
    title: "Mobile Apps",
    icon: "Smartphone",
    description:
      "[Placeholder] Native and cross-platform mobile apps for iOS and Android — replace this copy in /admin.",
    order: 2,
  },
  {
    title: "Machine Learning",
    icon: "Cpu",
    description:
      "[Placeholder] Predictive models and data pipelines that turn data into decisions — replace this copy in /admin.",
    order: 3,
  },
  {
    title: "Deep Learning",
    icon: "Network",
    description:
      "[Placeholder] Neural network solutions for complex pattern recognition tasks — replace this copy in /admin.",
    order: 4,
  },
  {
    title: "LLM / Generative AI",
    icon: "Sparkles",
    description:
      "[Placeholder] Custom generative AI and LLM-powered products and integrations — replace this copy in /admin.",
    order: 5,
  },
  {
    title: "Computer Vision",
    icon: "Eye",
    description:
      "[Placeholder] Image and video analysis systems for automation and insight — replace this copy in /admin.",
    order: 6,
  },
];

const PORTFOLIO_ITEMS: Prisma.PortfolioItemCreateManyInput[] = [
  {
    title: "Placeholder Project One",
    description:
      "[Placeholder] A short case study description goes here — replace via /admin.",
    images: [],
    tags: ["Next.js", "PostgreSQL"],
    externalLink: null,
    order: 0,
    featured: true,
  },
  {
    title: "Placeholder Project Two",
    description:
      "[Placeholder] A short case study description goes here — replace via /admin.",
    images: [],
    tags: ["Python", "TensorFlow"],
    externalLink: null,
    order: 1,
    featured: false,
  },
];

const TESTIMONIALS: Prisma.TestimonialCreateManyInput[] = [
  {
    quote:
      "[Placeholder] This is where a great client quote will go — replace via /admin.",
    authorName: "Placeholder Client",
    company: "Placeholder Co.",
    photo: null,
    order: 0,
  },
  {
    quote:
      "[Placeholder] Another example client testimonial — replace via /admin.",
    authorName: "Placeholder Client Two",
    company: "Placeholder Inc.",
    photo: null,
    order: 1,
  },
];

const TEAM_MEMBERS: Prisma.TeamMemberCreateManyInput[] = [
  {
    name: "Placeholder Name",
    role: "Founder",
    photo: null,
    bio: "[Placeholder] Short bio goes here — replace via /admin.",
    order: 0,
    active: true,
  },
  {
    name: "Placeholder Name Two",
    role: "Lead Engineer",
    photo: null,
    bio: "[Placeholder] Short bio goes here — replace via /admin.",
    order: 1,
    active: true,
  },
];

async function main() {
  await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      agencyName: "[Placeholder Agency Name]",
      tagline: "[Placeholder] One-line value proposition — replace via /admin.",
      contactEmail: "hello@example.com",
      contactPhone: "+1 (555) 555-5555",
      socialLinks: {},
      smtpSenderName: "[Placeholder Agency Name]",
      businessTimezone: "UTC",
      slotDurationMinutes: 30,
      minNoticeHours: 24,
      bookingWindowDays: 30,
    },
  });

  if ((await prisma.service.count()) === 0) {
    await prisma.service.createMany({ data: SERVICES });
  }

  if ((await prisma.portfolioItem.count()) === 0) {
    await prisma.portfolioItem.createMany({ data: PORTFOLIO_ITEMS });
  }

  if ((await prisma.testimonial.count()) === 0) {
    await prisma.testimonial.createMany({ data: TESTIMONIALS });
  }

  if ((await prisma.teamMember.count()) === 0) {
    await prisma.teamMember.createMany({ data: TEAM_MEMBERS });
  }

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 2: Wire the seed command into `package.json`**

Add this top-level key (sibling of `"scripts"`, `"dependencies"`, etc.):

```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

And add to `"scripts"`:

```json
"db:seed": "tsx prisma/seed.ts"
```

- [ ] **Step 3: Run the seed and verify row counts**

```bash
pnpm db:seed
```

Expected: prints `Seed complete.` (a `package.json#prisma` deprecation warning from Prisma is expected and harmless — see Global Constraints).

```bash
psql "$DATABASE_URL" -c 'SELECT count(*) FROM "SiteSettings";'
psql "$DATABASE_URL" -c 'SELECT count(*) FROM "Service";'
psql "$DATABASE_URL" -c 'SELECT count(*) FROM "PortfolioItem";'
psql "$DATABASE_URL" -c 'SELECT count(*) FROM "Testimonial";'
psql "$DATABASE_URL" -c 'SELECT count(*) FROM "TeamMember";'
```

Expected: `1`, `7`, `2`, `2`, `2` respectively.

- [ ] **Step 4: Verify idempotency**

```bash
pnpm db:seed
psql "$DATABASE_URL" -c 'SELECT count(*) FROM "Service";'
```

Expected: still `7`, not `14` — re-running did not duplicate rows.

- [ ] **Step 5: Verify the build still passes**

```bash
pnpm build
```

Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add prisma/seed.ts package.json
git commit -m "Add content seed script for SiteSettings and placeholder content"
```
