# Agency Marketing Site + Admin CMS — Design Spec

Date: 2026-08-25
Status: Approved for planning

## Summary

A single-page marketing website for a software/AI development agency, plus a
separate authenticated `/admin` CMS for managing all site content, leads, and
a self-built meeting scheduler. Self-hosted end to end (Postgres, local disk
uploads, VPS deployment) — no third-party CMS or scheduling SaaS.

## Decisions carried in from clarifying questions

- **Content:** seed with clearly-marked placeholder copy (agency name,
  taglines, service descriptions). All of it is admin-editable, so no
  rework is needed when real copy arrives.
- **Scheduler timezone:** one fixed `businessTimezone` (admin-configured).
  Visitors see slots auto-converted to their browser's local timezone for
  display; the stored/compared value is always the UTC instant.
- **SMTP:** built against a documented `.env` contract
  (`SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`SMTP_FROM`). Real
  credentials are dropped in later, no code changes required.
- **Deployment:** `DEPLOY.md` is a generic runbook, not tailored to a
  specific VPS/domain (none provisioned yet).

## Tech stack

- Next.js 15, App Router, TypeScript, strict mode
- PostgreSQL + Prisma ORM
- Auth.js v5 (`next-auth@beta`), Credentials provider, JWT sessions,
  bcrypt-hashed passwords — no public registration route exists anywhere
  in the app
- Tailwind CSS + shadcn/ui, `next-themes` for dark mode
- Framer Motion for scroll-in animations
- Nodemailer (SMTP) for contact notifications, auto-replies, and meeting
  confirmations; `ics` package for calendar attachments
- `date-fns-tz` for business-timezone ↔ UTC conversion
- Local disk storage under `/uploads`, served via a Next.js route handler
  in dev and directly by Nginx in production
- pnpm, Node 20 LTS
- Deployment: Docker Compose (Postgres only), PM2 (app process), Nginx
  (reverse proxy + static `/uploads`)

No test suite is being built for v1 — not part of the original ask.
TypeScript strict mode and Zod validation at every input boundary (forms,
route handlers, server actions) are the correctness net instead. Revisit if
the CMS or scheduler logic grows complex enough to need it.

## Data model (Prisma)

```
AdminUser {
  id, email (unique), passwordHash, name, role (enum: ADMIN — single
  variant today, structured so more roles can be added later), timestamps
}

Service {
  id, title, description, icon (string, lucide-react icon name),
  order (int), active (bool), timestamps
}

PortfolioItem {
  id, title, description, images (String[] — uploaded file paths),
  tags (String[]), externalLink (nullable), order (int), featured (bool),
  timestamps
}

Testimonial {
  id, quote, authorName, company (nullable), photo (nullable path),
  order (int), timestamps
}

TeamMember {
  id, name, role, photo (nullable path), bio, order (int), active (bool),
  timestamps
}

SiteSettings {
  // single row, enforced at the application layer — admin can only
  // edit this row, never create/delete additional rows
  id, agencyName, tagline, contactEmail, contactPhone,
  socialLinks (Json: { twitter?, linkedin?, github?, ... }),
  smtpSenderName,
  businessTimezone (IANA tz string, e.g. "America/New_York"),
  slotDurationMinutes (default 30),
  minNoticeHours (default 24),
  bookingWindowDays (default 30),
  timestamps
}

Lead {
  id, name, email, company (nullable), message,
  service (relation → Service, onDelete: SetNull, nullable),
  status (enum: NEW / CONTACTED / WON / LOST, default NEW),
  notes (text, admin-editable), timestamps
}

Meeting {
  id, name, email, topic,
  scheduledAt (DateTime, UTC instant, UNIQUE — primary double-booking guard),
  durationMinutes, status (enum: CONFIRMED / CANCELLED), icsUid (string),
  timestamps
}

AvailabilityRule {
  id, dayOfWeek (0-6), startTime, endTime, active (bool)
}

BlackoutDate {
  id, date, reason (nullable)
}
```

Notes:

- `Lead.service` is a nullable relation with `SetNull` on delete, so
  removing a Service from the CMS never breaks historical lead records.
- `Meeting.scheduledAt` uniqueness is the real defense against
  double-booking; the booking endpoint also re-validates server-side
  before insert (belt and suspenders — see Scheduler section).
- Icons for Services are picked from a fixed lucide-react name list, not
  uploaded — keeps that part of the admin UI a simple picker instead of
  another upload flow.

## Auth & admin access

- Auth.js v5, Credentials provider only. No signup route exists anywhere
  in the app; the only way an `AdminUser` row is created is the seed
  script below.
- `/admin/*` routes are wrapped in a layout that calls the server-side
  `auth()` helper and redirects to `/admin/login` if there's no session.
- `pnpm seed:admin` (reads `ADMIN_EMAIL` / `ADMIN_PASSWORD` from env or
  CLI args) upserts the admin user — this is how you create the first
  admin and how you reset a forgotten password. Documented in the README.

## Public site

- Single route, `app/page.tsx`, a Server Component reading `Service`,
  `PortfolioItem`, `Testimonial`, `TeamMember`, and `SiteSettings`
  directly via Prisma — no public API layer needed since it's rendered
  server-side. `export const revalidate = 60`.
- Sections in order: Hero, Services, Portfolio, Process (static steps,
  not DB-backed — it's a fixed methodology description, not content that
  changes per-project), Testimonials, About/Team, Contact (form +
  scheduler), Footer.
- Dark mode via `next-themes`; scroll-in animations via Framer Motion;
  smooth-scroll anchor links for the CTA buttons.
- SEO: `generateMetadata` sourced from `SiteSettings`, an OG image,
  `sitemap.xml` and `robots.txt` via Next.js file conventions.
- Visual identity: distinct color/type system, not default shadcn
  styling — finalized during the polish phase, not blocking the schema
  or backend work.

## Admin CMS

- `/admin` dashboard: recent 5 leads, recent 5 meetings, basic counts.
- CRUD screens (Services, Portfolio, Testimonials, Team, Settings, Leads,
  Meetings, Availability) use shadcn table/dialog/form components.
- Admin mutations go through Next.js **Server Actions** — colocated with
  the screens, no separate API layer to maintain for authenticated CRUD.
- Ordering (Services/Portfolio/Testimonials/Team) is a plain integer
  `order` field with up/down controls in the table — not drag-and-drop.
  Simple for v1, upgradeable later without a schema change.
- Description/bio fields are plain textareas (newlines preserved), not a
  rich text editor — matches the short-copy style of this content and
  avoids a WYSIWYG dependency.
- Leads table: filter/sort by status, inline status change, notes field.
- Meetings table: filter/sort by status, cancel action (sets
  `CANCELLED`, frees the slot, sends a cancellation email to the
  visitor).
- Availability editor: CRUD for `AvailabilityRule` (recurring weekly
  windows) and `BlackoutDate` (specific dates fully blocked), plus the
  scheduler-related fields on `SiteSettings`
  (`businessTimezone`/`slotDurationMinutes`/`minNoticeHours`/`bookingWindowDays`).

## Contact form + email

- `POST /api/leads` — a Route Handler (not a Server Action, since it's a
  public, unauthenticated write called from a client component with its
  own loading/error state). Validates with Zod.
- Order of operations: save the `Lead` first, **then** attempt to send
  the two emails (agency notification + visitor auto-reply) inside a
  try/catch that cannot roll back the save. A flaky SMTP server must
  never cause a lead to be lost — a failed send is logged, not fatal.

## File uploads

- `POST /api/upload` — admin-only (session-checked), accepts multipart
  form data, validates `image/*` mime type and a 5MB size cap, writes to
  `/uploads/<uuid>.<ext>` on local disk, returns the path to store on the
  relevant record.
- Served via a Next.js route handler in dev; `DEPLOY.md` documents an
  Nginx `location /uploads/` block that serves the directory directly in
  production (bypasses Node for static file serving) and calls out that
  the directory must be a persistent volume/bind mount, not wiped on
  redeploy.

## Meeting scheduler

This is the most novel piece of the system, detailed here in full.

### Availability model

Admin defines:
- `AvailabilityRule` rows — recurring weekly windows (e.g. "Mon–Fri
  09:00–17:00"), interpreted in `SiteSettings.businessTimezone`.
- `BlackoutDate` rows — specific dates fully blocked (holidays, days
  off), independent of the weekly rules.

### Computing open slots (on-the-fly, not pre-materialized)

Chosen over a pre-generated `TimeSlot` table because it avoids needing a
cron job to keep a rolling window populated and avoids reconciling
already-generated slots whenever an admin edits the rules. At agency
booking-calendar volume, per-request computation is cheap.

`GET /api/meetings/availability`:

1. For each date in `[today, today + bookingWindowDays]`, find the
   `AvailabilityRule` matching that date's day-of-week (skip entirely if
   the date is in `BlackoutDate`).
2. Expand each rule's `startTime`–`endTime` into discrete
   `slotDurationMinutes` slots.
3. Convert each slot's business-timezone wall-clock time to a UTC
   instant via `date-fns-tz` — this makes DST transitions correct
   automatically rather than needing manual offset math.
4. Drop slots inside the `minNoticeHours` buffer from now.
5. Subtract slots already covered by a `CONFIRMED` `Meeting` in that
   window.
6. Return the remaining UTC instants to the client.

The client renders the returned instants converted to the **visitor's
own** browser timezone (`Intl.DateTimeFormat`) for display. The slot's
identity everywhere else (storage, the booking request, uniqueness
checks) stays the UTC instant — only the display step is
visitor-timezone-aware.

### Booking + race safety

`POST /api/meetings/book { scheduledAt, name, email, topic }`:

1. Zod-validate the payload.
2. Re-derive whether `scheduledAt` is still a legal slot server-side
   (matches a rule, not blacked out, not inside the notice buffer) —
   never trust the client's slot list, which may be stale.
3. Inside a transaction, check no `CONFIRMED` `Meeting` already exists at
   that exact `scheduledAt`, then insert.
4. The DB-level `UNIQUE` constraint on `Meeting.scheduledAt` is the real
   guard: if two visitors race for the same slot, one insert wins and
   the other fails cleanly. The failing request gets a 409 and the UI
   tells the visitor the slot was just taken and to pick another.
5. On success: build an `.ics` event (`ics` package, times expressed in
   `businessTimezone`) and email it — with the ICS attached — to both
   the visitor and the agency's `contactEmail`.

Admin-side cancellation (from the Meetings table) sets `status =
CANCELLED`, which frees the slot for the availability computation, and
sends a cancellation email to the visitor.

## Deployment

- `docker-compose.yml`: single Postgres service, named volume,
  credentials from env.
- PM2 `ecosystem.config.js` running `next start` as a managed,
  auto-restarting process.
- Nginx: reverse-proxy template to the Next.js port, gzip, a
  `location /uploads/` block serving uploads directly, TLS via certbot
  documented as a manual step.
- `DEPLOY.md` walks through: clone → install deps → configure `.env` →
  `docker-compose up -d postgres` → `pnpm prisma migrate deploy` →
  `pnpm seed:admin` → `pnpm build` → `pm2 start ecosystem.config.js` →
  configure Nginx + certbot → set up a daily `pg_dump` cron job with
  7-day rotation.
- README covers local dev setup and how to create/reset the admin user
  via `pnpm seed:admin`.

## Build phases

Matches the originally requested build order — validated during design,
kept as-is for the implementation plan:

0. Scaffold: Next.js + TS + Tailwind + shadcn, docker-compose Postgres,
   Prisma init, Auth.js wiring, working `pnpm dev`.
1. Full Prisma schema, migrations, seed script (admin user + default
   `SiteSettings` row + placeholder content).
2. Admin auth flow: login, protected `/admin` layout, logout.
3. Admin CRUD: Services, Portfolio, Testimonials, Team, Settings.
4. Leads: admin table + public contact form + email notification/auto-reply.
5. Scheduler: availability/blackout editor, public booking UI, booking
   API, ICS + email.
6. Public single-page site wired to live data, all sections.
7. Polish: animations, responsiveness, distinct visual identity, SEO
   metadata, OG image.
8. `DEPLOY.md` + `docker-compose.yml` + PM2 config + Nginx config +
   README.

## Out of scope for v1

- Multiple admin roles/permissions (schema supports it via `role`, but
  only `ADMIN` is implemented).
- Rich text editing for descriptions.
- Drag-and-drop reordering (up/down controls instead).
- Image resizing/optimization pipeline for uploads.
- Automated test suite.
- Third-party CMS, scheduling SaaS, or object storage (S3 etc.) — local
  disk + self-hosted Postgres per the stated constraints.
