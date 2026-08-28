# Phase 5b: Booking Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the self-hosted meeting scheduler's booking engine: timezone-aware slot computation, the public availability/booking API, ICS calendar invites over email, an admin Meetings screen, and a temporarily-mounted public `Scheduler` component.

**Architecture:** Slots are computed on-the-fly per request (never pre-materialized) from `AvailabilityRule` + `BlackoutDate` + `SiteSettings`, expressed in business-timezone wall-clock time and converted to UTC instants via `date-fns-tz`. `Meeting.scheduledAt`'s DB-level `UNIQUE` constraint is the real double-booking guard; the booking route re-validates server-side and catches the constraint violation (Prisma `P2002`) to return a clean 409. Booking success builds a UTC-timed `.ics` attachment (via the `ics` package) and emails it to both parties via the existing `sendMail` helper, extended with attachment support.

**Tech Stack:** Next.js 15 Route Handlers, Prisma 6.19.3, `date-fns-tz` 3.2.0 + `date-fns` 4.4.0, `ics` 3.12.0, `nodemailer` (existing), Zod v4, shadcn/ui (Base UI).

**Spec:** `docs/superpowers/specs/2026-08-25-agency-website-design.md` (see "Meeting scheduler" section)

## Global Constraints

- Package manager: `pnpm`. Always `pnpm exec prisma`, never `pnpm dlx prisma` (dlx re-resolves to the latest npm dist-tag regardless of what's installed, which is a v8 RC incompatible with this project's classic migrate workflow).
- shadcn/ui components in this project are built on **Base UI** (`@base-ui/react`), not Radix. Base UI's `Select` `onValueChange` passes `string | null` — guard with `if (next) onChange(next)`. Never nest a shadcn `<Button>` inside `*Trigger` via the `render` prop (causes a hydration `id` mismatch) — triggers render their own element via `className={buttonVariants({variant, size})}`.
- Any edit-dialog component seeded from row data must be keyed so it remounts when the row's data changes (`` `${row.id}-${row.updatedAt.toISOString()}` `` when the model has `updatedAt`, otherwise a composite key of the editable fields) — otherwise it shows stale data after a save because the same instance persists across the post-Server-Action refetch.
- A `<Select.Value>` displays the raw `value` string unless given `children` — use `<SelectValue>{options.find(o => o.id === value)?.label ?? placeholder}</SelectValue>` whenever `value !== label`.
- **`date-fns-tz` v3 contract (verified empirically against the installed v3.2.0 source in this project — do not trust intuition here, the naive-looking approach is wrong):**
  - `fromZonedTime(wallClockString, businessTimezone)` — pass a **plain string** with no `Z`/offset (e.g. `"2026-09-07T09:00:00"`). This branch parses the string's components directly as the target zone's wall clock and is DST-correct and **independent of the server's own system timezone**. Never pass a `Date` object to `fromZonedTime` for this use case — that branch reads the Date via *local* getters first, which reintroduces a server-timezone dependency.
  - `toZonedTime(instant, businessTimezone)` returns a `Date` whose **local** getters (`getFullYear`, `getMonth`, `getDate`, `getHours`, `getMinutes`, `getDay`) reflect the wall-clock time in `businessTimezone` — confirmed via source: it round-trips through `Date#setFullYear`/`Date#setHours` (local setters), so only local getters undo that shift correctly. Reading it with UTC getters (`getUTCHours()` etc.) gives a value silently shifted by the server's own system-timezone offset — this only "looks correct" in local dev if the dev machine happens to be UTC, and breaks in production. Always use local getters on a `toZonedTime()` result.
  - Calendar-only arithmetic that never touches a real timezone (e.g. advancing "today + N days" once you already have Y/M/D numbers) should use `Date.UTC(y, m, d)` + UTC getters — that's plain, TZ-independent calendar math and is unrelated to the `toZonedTime` contract above.
- `BlackoutDate.date` is stored via `new Date("YYYY-MM-DD")` (see existing `availability/actions.ts`), which JS parses as UTC midnight for that calendar date — so blackout dates are compared using **UTC** getters directly (no `toZonedTime` involved), matching how they were stored.
- No unit test framework exists in this project (established in prior phases). Verify library-behavior assumptions with a throwaway `tsx` script run via `pnpm exec tsx`, deleted before committing; verify feature correctness with `pnpm build` (typecheck + lint + production build) plus a real browser walkthrough via claude-in-chrome.
- Deviation from the spec's literal wording, decided in this plan: the spec says the ICS event's times should be "expressed in businessTimezone." The `ics` package has no support for attaching a `VTIMEZONE`/`TZID` to an arbitrary IANA zone name — its only options are a true UTC output (`Z`-suffixed, unambiguous in every calendar client) or a "floating" local time with no zone at all (would display at the wrong wall-clock time for any recipient not in the business's own zone — meaningfully wrong for the visitor, who found this slot converted to *their* browser timezone). This plan builds the ICS event in UTC output, which is the objectively-correct choice for interoperability and is consistent with the rest of the design's own principle that the UTC instant is the slot's canonical identity everywhere except final display.
- Second deviation, also decided in this plan: the spec's booking step 3 says "Inside a transaction, check no `CONFIRMED` `Meeting` already exists at that exact `scheduledAt`, then insert." Under Postgres's default `READ COMMITTED` isolation, a `SELECT`-then-`INSERT` inside a transaction does not actually close the race window (two concurrent transactions can both pass the `SELECT` before either commits) — the spec's own step 4 already says the `UNIQUE` constraint is "the real guard." This plan skips the redundant pre-check and relies solely on `prisma.meeting.create` + a `P2002` catch, which is atomic and correct without needing `SERIALIZABLE` isolation or explicit locking (neither of which the spec calls for). The pre-slot-legality check (`isSlotAvailable`) still runs beforehand as the spec's step 2 — it just isn't wrapped in a transaction with the insert, since it wouldn't add real protection.

---

### Task 1: Scheduler dependencies + email attachment support

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml` (dependency install)
- Modify: `src/lib/email.ts`

**Interfaces:**
- Produces: `sendMail(options: { to, subject, text, fromName?, attachments?: { filename: string; content: string; contentType?: string }[] })` — extends the existing signature backward-compatibly (new field is optional).

- [ ] **Step 1: Install dependencies**

```bash
pnpm add date-fns-tz date-fns ics
```

Expected: `package.json` gains `date-fns-tz`, `date-fns`, `ics` under `dependencies`; `pnpm-lock.yaml` updates. (If already installed from an earlier spike in this session, this is a no-op — confirm with `pnpm list date-fns-tz date-fns ics`.)

- [ ] **Step 2: Extend `sendMail` with attachment support**

Edit `src/lib/email.ts` to add an optional `attachments` field, passed straight through to nodemailer:

```ts
import nodemailer from "nodemailer";

function getTransport() {
  if (!process.env.SMTP_HOST) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

export async function sendMail(options: {
  to: string;
  subject: string;
  text: string;
  fromName?: string;
  attachments?: { filename: string; content: string; contentType?: string }[];
}) {
  const transport = getTransport();

  if (!transport) {
    console.log(
      `[email] SMTP not configured, skipping send to ${options.to}: "${options.subject}"`
    );
    return;
  }

  const fromName = options.fromName ?? "Agency";
  const fromAddress = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "no-reply@example.com";

  await transport.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    attachments: options.attachments,
  });
}
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: succeeds with no type errors.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml src/lib/email.ts
git commit -m "Add scheduler dependencies and email attachment support"
```

---

### Task 2: Availability slot computation library

**Files:**
- Create: `src/lib/availability.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `type AvailabilityRuleInput = { dayOfWeek: number; startTime: string; endTime: string; active: boolean }`
  - `type AvailabilityConfig = { businessTimezone: string; slotDurationMinutes: number; minNoticeHours: number; bookingWindowDays: number }`
  - `computeAvailableSlots(params: { config: AvailabilityConfig; rules: AvailabilityRuleInput[]; blackoutDates: Date[]; bookedSlots: Date[]; now: Date }): Date[]` — sorted ascending UTC instants.
  - `isSlotAvailable(params: { scheduledAt: Date; config: AvailabilityConfig; rules: AvailabilityRuleInput[]; blackoutDates: Date[]; now: Date }): boolean`
  - Both are consumed by Task 4's API routes.

- [ ] **Step 1: Write `src/lib/availability.ts`**

```ts
import { toZonedTime, fromZonedTime } from "date-fns-tz";

export type AvailabilityRuleInput = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  active: boolean;
};

export type AvailabilityConfig = {
  businessTimezone: string;
  slotDurationMinutes: number;
  minNoticeHours: number;
  bookingWindowDays: number;
};

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

// toZonedTime returns a Date whose LOCAL getters (getFullYear, getHours, ...)
// reflect the wall-clock time in `businessTimezone` -- verified against the
// date-fns-tz v3 source, which round-trips through local Date setters. Reading
// it with UTC getters instead silently shifts by the server's own system
// timezone offset. Always use local getters here.
function businessDateParts(instant: Date, businessTimezone: string) {
  const zoned = toZonedTime(instant, businessTimezone);
  return {
    year: zoned.getFullYear(),
    month: zoned.getMonth(),
    day: zoned.getDate(),
    dayOfWeek: zoned.getDay(),
    minutesSinceMidnight: zoned.getHours() * 60 + zoned.getMinutes(),
  };
}

function dateStringFromParts(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function blackoutDateStrings(blackoutDates: Date[]): Set<string> {
  // BlackoutDate.date is stored as new Date("YYYY-MM-DD") (UTC midnight for
  // that calendar date) -- UTC getters give back that same calendar date.
  return new Set(
    blackoutDates.map((d) =>
      dateStringFromParts(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
    )
  );
}

export function computeAvailableSlots(params: {
  config: AvailabilityConfig;
  rules: AvailabilityRuleInput[];
  blackoutDates: Date[];
  bookedSlots: Date[];
  now: Date;
}): Date[] {
  const { config, rules, blackoutDates, bookedSlots, now } = params;
  const blackoutSet = blackoutDateStrings(blackoutDates);
  const bookedSet = new Set(bookedSlots.map((d) => d.getTime()));
  const noticeCutoff = now.getTime() + config.minNoticeHours * 60 * 60 * 1000;
  const today = businessDateParts(now, config.businessTimezone);
  const activeRules = rules.filter((r) => r.active);

  const seen = new Set<number>();
  const slots: Date[] = [];

  for (let offset = 0; offset <= config.bookingWindowDays; offset++) {
    // Plain calendar arithmetic (no toZonedTime involved) -- Date.UTC/UTC
    // getters are TZ-independent here, unlike the businessDateParts contract.
    const dateAtOffset = new Date(Date.UTC(today.year, today.month, today.day + offset));
    const dateStr = dateStringFromParts(
      dateAtOffset.getUTCFullYear(),
      dateAtOffset.getUTCMonth(),
      dateAtOffset.getUTCDate()
    );
    const dayOfWeek = dateAtOffset.getUTCDay();

    if (blackoutSet.has(dateStr)) continue;

    const dayRules = activeRules.filter((r) => r.dayOfWeek === dayOfWeek);

    for (const rule of dayRules) {
      const startMinutes = parseTimeToMinutes(rule.startTime);
      const endMinutes = parseTimeToMinutes(rule.endTime);

      for (
        let slotStart = startMinutes;
        slotStart + config.slotDurationMinutes <= endMinutes;
        slotStart += config.slotDurationMinutes
      ) {
        const wallClock = `${dateStr}T${pad(Math.floor(slotStart / 60))}:${pad(
          slotStart % 60
        )}:00`;
        const instant = fromZonedTime(wallClock, config.businessTimezone);

        if (instant.getTime() < noticeCutoff) continue;
        if (bookedSet.has(instant.getTime())) continue;
        if (seen.has(instant.getTime())) continue;

        seen.add(instant.getTime());
        slots.push(instant);
      }
    }
  }

  slots.sort((a, b) => a.getTime() - b.getTime());
  return slots;
}

export function isSlotAvailable(params: {
  scheduledAt: Date;
  config: AvailabilityConfig;
  rules: AvailabilityRuleInput[];
  blackoutDates: Date[];
  now: Date;
}): boolean {
  const { scheduledAt, config, rules, blackoutDates, now } = params;

  const noticeCutoff = now.getTime() + config.minNoticeHours * 60 * 60 * 1000;
  if (scheduledAt.getTime() < noticeCutoff) return false;

  const parts = businessDateParts(scheduledAt, config.businessTimezone);
  const dateStr = dateStringFromParts(parts.year, parts.month, parts.day);

  if (blackoutDateStrings(blackoutDates).has(dateStr)) return false;

  const activeRules = rules.filter((r) => r.active && r.dayOfWeek === parts.dayOfWeek);

  return activeRules.some((rule) => {
    const startMinutes = parseTimeToMinutes(rule.startTime);
    const endMinutes = parseTimeToMinutes(rule.endTime);
    if (parts.minutesSinceMidnight < startMinutes) return false;
    if (parts.minutesSinceMidnight + config.slotDurationMinutes > endMinutes) return false;
    return (parts.minutesSinceMidnight - startMinutes) % config.slotDurationMinutes === 0;
  });
}
```

- [ ] **Step 2: Verify with a throwaway script**

Create a temporary `verify-availability.ts` at the project root:

```ts
import { computeAvailableSlots, isSlotAvailable } from "./src/lib/availability";

const config = {
  businessTimezone: "America/New_York",
  slotDurationMinutes: 30,
  minNoticeHours: 24,
  bookingWindowDays: 14,
};
const rules = [
  { dayOfWeek: 1, startTime: "09:00", endTime: "11:00", active: true }, // Monday
];

// now = a Sunday, well before the DST spring-forward boundary
const now = new Date("2026-03-01T12:00:00.000Z");
const blackoutDates: Date[] = [];
const bookedSlots: Date[] = [];

const slots = computeAvailableSlots({ config, rules, blackoutDates, bookedSlots, now });
console.log("slot count (expect 4 per open Monday: 09:00,09:30,10:00,10:30 x 2 Mondays in window) ->", slots.length);
console.log("first slot ISO ->", slots[0]?.toISOString(), "expect 2026-03-02T14:00:00.000Z (9am EST = 14:00 UTC)");

// Blackout the first Monday
const blackoutSlots = computeAvailableSlots({
  config,
  rules,
  blackoutDates: [new Date("2026-03-02")],
  bookedSlots,
  now,
});
console.log("with first Monday blacked out, first slot ->", blackoutSlots[0]?.toISOString(), "expect the following Monday");

// Booked-slot subtraction
const withBooking = computeAvailableSlots({
  config,
  rules,
  blackoutDates,
  bookedSlots: [slots[0]],
  now,
});
console.log("after booking first slot, count ->", withBooking.length, "expect", slots.length - 1);

// isSlotAvailable positive + negative cases
console.log("isSlotAvailable(first slot) ->", isSlotAvailable({ scheduledAt: slots[0], config, rules, blackoutDates, now }), "expect true");
console.log(
  "isSlotAvailable(off-grid time, e.g. +10min) ->",
  isSlotAvailable({
    scheduledAt: new Date(slots[0].getTime() + 10 * 60 * 1000),
    config,
    rules,
    blackoutDates,
    now,
  }),
  "expect false"
);
console.log(
  "isSlotAvailable(inside minNoticeHours buffer) ->",
  isSlotAvailable({ scheduledAt: new Date(now.getTime() + 60 * 60 * 1000), config, rules, blackoutDates, now }),
  "expect false"
);
```

Run: `pnpm exec tsx verify-availability.ts`
Expected: all printed values match their "expect" comments. If any mismatch, fix `src/lib/availability.ts` before proceeding — do not paper over a wrong result.

- [ ] **Step 3: Delete the throwaway script**

```bash
rm verify-availability.ts
```

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: succeeds with no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/availability.ts
git commit -m "Add availability slot computation library"
```

---

### Task 3: ICS calendar event builder

**Files:**
- Create: `src/lib/ics.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `buildMeetingIcs(params: { uid: string; title: string; description: string; scheduledAt: Date; durationMinutes: number; organizerEmail: string; organizerName: string; attendeeEmail: string; attendeeName: string }): string` — consumed by Task 4's booking route.

- [ ] **Step 1: Write `src/lib/ics.ts`**

```ts
import { createEvent } from "ics";

export function buildMeetingIcs(params: {
  uid: string;
  title: string;
  description: string;
  scheduledAt: Date;
  durationMinutes: number;
  organizerEmail: string;
  organizerName: string;
  attendeeEmail: string;
  attendeeName: string;
}): string {
  const {
    uid,
    title,
    description,
    scheduledAt,
    durationMinutes,
    organizerEmail,
    organizerName,
    attendeeEmail,
    attendeeName,
  } = params;

  const { error, value } = createEvent({
    uid,
    title,
    description,
    start: [
      scheduledAt.getUTCFullYear(),
      scheduledAt.getUTCMonth() + 1,
      scheduledAt.getUTCDate(),
      scheduledAt.getUTCHours(),
      scheduledAt.getUTCMinutes(),
    ],
    startInputType: "utc",
    startOutputType: "utc",
    duration: { minutes: durationMinutes },
    organizer: { name: organizerName, email: organizerEmail },
    attendees: [{ name: attendeeName, email: attendeeEmail, rsvp: true }],
  });

  if (error || !value) {
    throw error ?? new Error("Failed to build ICS event");
  }

  return value;
}
```

- [ ] **Step 2: Verify with a throwaway script**

Create a temporary `verify-ics.ts` at the project root:

```ts
import { buildMeetingIcs } from "./src/lib/ics";

const ics = buildMeetingIcs({
  uid: "test-uid-123@example.com",
  title: "Meeting: Test topic",
  description: "Meeting with Jane Doe (jane@example.com)\nTopic: Test topic",
  scheduledAt: new Date("2026-09-07T13:00:00.000Z"),
  durationMinutes: 30,
  organizerEmail: "agency@example.com",
  organizerName: "Agency",
  attendeeEmail: "jane@example.com",
  attendeeName: "Jane Doe",
});

console.log(ics);
console.log("--- checks ---");
console.log("has DTSTART with Z suffix (UTC, unambiguous) ->", /DTSTART:20260907T130000Z/.test(ics));
console.log("has DTEND 30 min later ->", /DTEND:20260907T133000Z/.test(ics));
console.log("has attendee email ->", ics.includes("jane@example.com"));
console.log("has organizer email ->", ics.includes("agency@example.com"));
```

Run: `pnpm exec tsx verify-ics.ts`
Expected: `DTSTART`/`DTEND` checks print `true`, attendee/organizer checks print `true`. Fix `src/lib/ics.ts` if not.

- [ ] **Step 3: Delete the throwaway script**

```bash
rm verify-ics.ts
```

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: succeeds with no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ics.ts
git commit -m "Add ICS calendar event builder"
```

---

### Task 4: Meeting availability and booking API routes

**Files:**
- Create: `src/app/api/meetings/availability/route.ts`
- Create: `src/app/api/meetings/book/route.ts`

**Interfaces:**
- Consumes: `computeAvailableSlots`, `isSlotAvailable`, `AvailabilityConfig` from `@/lib/availability` (Task 2); `buildMeetingIcs` from `@/lib/ics` (Task 3); `sendMail` from `@/lib/email` (Task 1).
- Produces: `GET /api/meetings/availability` → `{ slots: string[] }` (ISO instants); `POST /api/meetings/book` → `201 { id, scheduledAt }` on success, `409 { error }` if the slot is no longer available or was just taken, `400 { error }` on invalid input, `503 { error }` if `SiteSettings` doesn't exist yet. Consumed by Task 6's `Scheduler` component.

- [ ] **Step 1: Write the availability route**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeAvailableSlots } from "@/lib/availability";

// Must stay dynamic: slot availability is `now`-dependent and per-request,
// and Next.js would otherwise be free to statically cache this GET route
// at build time (it has no cookies/headers usage to trigger dynamic
// rendering automatically).
export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await prisma.siteSettings.findFirst();
  if (!settings) {
    return NextResponse.json({ slots: [] });
  }

  const [rules, blackouts, meetings] = await Promise.all([
    prisma.availabilityRule.findMany({ where: { active: true } }),
    prisma.blackoutDate.findMany(),
    prisma.meeting.findMany({
      where: { status: "CONFIRMED" },
      select: { scheduledAt: true },
    }),
  ]);

  const slots = computeAvailableSlots({
    config: {
      businessTimezone: settings.businessTimezone,
      slotDurationMinutes: settings.slotDurationMinutes,
      minNoticeHours: settings.minNoticeHours,
      bookingWindowDays: settings.bookingWindowDays,
    },
    rules,
    blackoutDates: blackouts.map((b) => b.date),
    bookedSlots: meetings.map((m) => m.scheduledAt),
    now: new Date(),
  });

  return NextResponse.json({ slots: slots.map((s) => s.toISOString()) });
}
```

- [ ] **Step 2: Write the booking route**

```ts
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email";
import { isSlotAvailable } from "@/lib/availability";
import { buildMeetingIcs } from "@/lib/ics";

const bookSchema = z.object({
  scheduledAt: z.string().datetime(),
  name: z.string().min(1),
  email: z.string().email(),
  topic: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bookSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { name, email, topic } = parsed.data;
  const scheduledAt = new Date(parsed.data.scheduledAt);

  const settings = await prisma.siteSettings.findFirst();
  if (!settings) {
    return NextResponse.json({ error: "Scheduling is not configured" }, { status: 503 });
  }

  const [rules, blackouts] = await Promise.all([
    prisma.availabilityRule.findMany({ where: { active: true } }),
    prisma.blackoutDate.findMany(),
  ]);

  const legal = isSlotAvailable({
    scheduledAt,
    config: {
      businessTimezone: settings.businessTimezone,
      slotDurationMinutes: settings.slotDurationMinutes,
      minNoticeHours: settings.minNoticeHours,
      bookingWindowDays: settings.bookingWindowDays,
    },
    rules,
    blackoutDates: blackouts.map((b) => b.date),
    now: new Date(),
  });

  if (!legal) {
    return NextResponse.json(
      { error: "That slot is no longer available — please pick another." },
      { status: 409 }
    );
  }

  const icsUid = `${randomUUID()}@${new URL(request.url).hostname}`;

  let meeting;
  try {
    meeting = await prisma.meeting.create({
      data: {
        name,
        email,
        topic,
        scheduledAt,
        durationMinutes: settings.slotDurationMinutes,
        icsUid,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "That slot was just taken — please pick another." },
        { status: 409 }
      );
    }
    throw error;
  }

  try {
    const fromName = settings.smtpSenderName || settings.agencyName;
    const icsContent = buildMeetingIcs({
      uid: icsUid,
      title: `Meeting: ${topic}`,
      description: `Meeting with ${name} (${email})\nTopic: ${topic}`,
      scheduledAt,
      durationMinutes: settings.slotDurationMinutes,
      organizerEmail: settings.contactEmail,
      organizerName: settings.agencyName,
      attendeeEmail: email,
      attendeeName: name,
    });
    const attachments = [
      { filename: "meeting.ics", content: icsContent, contentType: "text/calendar" },
    ];

    await sendMail({
      to: email,
      subject: `Meeting confirmed: ${topic}`,
      text: `Hi ${name},\n\nYour meeting is confirmed for ${scheduledAt.toISOString()}.\n\nTopic: ${topic}\n\n${fromName}`,
      fromName,
      attachments,
    });

    await sendMail({
      to: settings.contactEmail,
      subject: `New meeting booked: ${topic}`,
      text: `${name} (${email}) booked a meeting.\n\nTopic: ${topic}\nWhen: ${scheduledAt.toISOString()}`,
      fromName,
      attachments,
    });
  } catch (error) {
    console.error("[meetings] failed to send confirmation emails", error);
  }

  return NextResponse.json({ id: meeting.id, scheduledAt: meeting.scheduledAt }, { status: 201 });
}
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: succeeds with no type errors.

- [ ] **Step 4: Manual verification against the running dev server**

Ensure `pnpm dev` is running (it already is, on port 3001 in this session). Confirm one active `AvailabilityRule` exists (Phase 5a left Monday 09:00-17:00 and Wednesday 09:00-18:00 active) and `SiteSettings.businessTimezone` is set (seed default `"UTC"`).

```bash
curl -s http://localhost:3001/api/meetings/availability | jq .
```

Expected: `{"slots":[...]}` with a non-empty array of ISO instants landing on Mondays/Wednesdays at the configured start times (in UTC, since seed `businessTimezone` is `"UTC"`).

Extract the first slot into a shell variable and book it:

```bash
SLOT=$(curl -s http://localhost:3001/api/meetings/availability | jq -r '.slots[0]')
echo "$SLOT"
curl -s -X POST http://localhost:3001/api/meetings/book \
  -H "Content-Type: application/json" \
  -d "{\"scheduledAt\":\"$SLOT\",\"name\":\"Test User\",\"email\":\"test@example.com\",\"topic\":\"Verification booking\"}"
```

Expected: `201` with `{"id":"...","scheduledAt":"..."}`. Check the dev server log shows two `[email] SMTP not configured, skipping send to ...` lines (SMTP is a placeholder in this project per the spec's clarifying answers).

Race-safety check — repeat the exact same POST:

```bash
curl -s -i -X POST http://localhost:3001/api/meetings/book \
  -H "Content-Type: application/json" \
  -d "{\"scheduledAt\":\"$SLOT\",\"name\":\"Test User 2\",\"email\":\"test2@example.com\",\"topic\":\"Race test\"}"
```

Expected: `409` — this exercises both the server-side `isSlotAvailable` re-check (the slot is now covered by a `CONFIRMED` meeting) and, if that check were ever bypassed, the `P2002` catch on the DB unique constraint.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/meetings
git commit -m "Add meeting availability and booking API routes"
```

---

### Task 5: Admin Meetings screen + dashboard update

**Files:**
- Create: `src/app/admin/(protected)/meetings/actions.ts`
- Create: `src/app/admin/(protected)/meetings/meeting-table.tsx`
- Create: `src/app/admin/(protected)/meetings/page.tsx`
- Modify: `src/app/admin/(protected)/layout.tsx` (nav link)
- Modify: `src/app/admin/(protected)/page.tsx` (dashboard recent-meetings section)

**Interfaces:**
- Consumes: `sendMail` from `@/lib/email` (Task 1).
- Produces: `cancelMeeting(id: string): Promise<void>` server action.

- [ ] **Step 1: Write the cancel action**

`src/app/admin/(protected)/meetings/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email";

export async function cancelMeeting(id: string) {
  const meeting = await prisma.meeting.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  const settings = await prisma.siteSettings.findFirst();
  const fromName = settings?.smtpSenderName || settings?.agencyName || "Agency";

  try {
    await sendMail({
      to: meeting.email,
      subject: `Meeting cancelled: ${meeting.topic}`,
      text: `Hi ${meeting.name},\n\nYour meeting scheduled for ${meeting.scheduledAt.toISOString()} has been cancelled. Please book a new time if you'd still like to meet.\n\n${fromName}`,
      fromName,
    });
  } catch (error) {
    console.error("[meetings] failed to send cancellation email", error);
  }

  revalidatePath("/admin/meetings");
  revalidatePath("/admin");
}
```

- [ ] **Step 2: Write the meeting table**

`src/app/admin/(protected)/meetings/meeting-table.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cancelMeeting } from "./actions";
import type { Meeting } from "@prisma/client";

const FILTERS = ["ALL", "CONFIRMED", "CANCELLED"] as const;

export function MeetingTable({
  meetings,
  businessTimezone,
}: {
  meetings: Meeting[];
  businessTimezone: string;
}) {
  const [filter, setFilter] = useState<string>("ALL");
  const formatter = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: businessTimezone,
  });

  const filtered = filter === "ALL" ? meetings : meetings.filter((m) => m.status === filter);

  return (
    <div className="space-y-4">
      <div className="w-40">
        <Select value={filter} onValueChange={(v) => v && setFilter(v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTERS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When ({businessTimezone})</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Topic</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((meeting) => (
            <TableRow key={meeting.id}>
              <TableCell>{formatter.format(meeting.scheduledAt)}</TableCell>
              <TableCell>{meeting.name}</TableCell>
              <TableCell>{meeting.email}</TableCell>
              <TableCell>{meeting.topic}</TableCell>
              <TableCell>
                <Badge variant={meeting.status === "CONFIRMED" ? "default" : "secondary"}>
                  {meeting.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {meeting.status === "CONFIRMED" && (
                  <AlertDialog>
                    <AlertDialogTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
                      Cancel
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel this meeting?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This frees the {formatter.format(meeting.scheduledAt)} slot and emails{" "}
                          {meeting.email} a cancellation notice.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Back</AlertDialogCancel>
                        <AlertDialogAction onClick={() => cancelMeeting(meeting.id)}>
                          Cancel meeting
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 3: Write the meetings page**

`src/app/admin/(protected)/meetings/page.tsx`:

```tsx
import { prisma } from "@/lib/prisma";
import { MeetingTable } from "./meeting-table";

export default async function MeetingsPage() {
  const [meetings, settings] = await Promise.all([
    prisma.meeting.findMany({ orderBy: { scheduledAt: "asc" } }),
    prisma.siteSettings.findFirst(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Meetings</h1>
      <MeetingTable meetings={meetings} businessTimezone={settings?.businessTimezone ?? "UTC"} />
    </div>
  );
}
```

- [ ] **Step 4: Add the nav link**

In `src/app/admin/(protected)/layout.tsx`, add a "Meetings" link after "Availability":

```tsx
        <a
          href="/admin/meetings"
          className="text-muted-foreground hover:text-foreground"
        >
          Meetings
        </a>
```

- [ ] **Step 5: Update the dashboard**

In `src/app/admin/(protected)/page.tsx`, replace the placeholder paragraph with a real recent-meetings section, mirroring the recent-leads section:

```tsx
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";

export default async function AdminDashboardPage() {
  const session = await auth();
  const [recentLeads, recentMeetings] = await Promise.all([
    prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.meeting.findMany({ orderBy: { scheduledAt: "desc" }, take: 5 }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Welcome, {session?.user?.name}</h1>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Recent leads</h2>
          <Link href="/admin/leads" className="text-sm text-muted-foreground hover:underline">
            View all
          </Link>
        </div>
        {recentLeads.length === 0 ? (
          <p className="text-muted-foreground">No leads yet.</p>
        ) : (
          <ul className="space-y-2">
            {recentLeads.map((lead) => (
              <li key={lead.id} className="flex items-center justify-between text-sm">
                <span>
                  {lead.name} — {lead.email}
                </span>
                <Badge variant="secondary">{lead.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Recent meetings</h2>
          <Link href="/admin/meetings" className="text-sm text-muted-foreground hover:underline">
            View all
          </Link>
        </div>
        {recentMeetings.length === 0 ? (
          <p className="text-muted-foreground">No meetings booked yet.</p>
        ) : (
          <ul className="space-y-2">
            {recentMeetings.map((meeting) => (
              <li key={meeting.id} className="flex items-center justify-between text-sm">
                <span>
                  {meeting.name} — {meeting.topic}
                </span>
                <Badge variant={meeting.status === "CONFIRMED" ? "default" : "secondary"}>
                  {meeting.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Verify build**

Run: `pnpm build`
Expected: succeeds with no type errors, no unused-import lint warnings.

- [ ] **Step 7: Browser verification**

Using claude-in-chrome: navigate to `http://localhost:3001/admin/meetings`, confirm the meeting booked via curl in Task 4 Step 4 appears with status `CONFIRMED`. Click "Cancel", confirm the dialog, confirm the row's status badge updates to `CANCELLED` and the "Cancel" action disappears from that row. Navigate to `/admin` and confirm the cancelled meeting shows in "Recent meetings" with the `CANCELLED` badge. Then re-run `curl -s http://localhost:3001/api/meetings/availability` and confirm the previously-booked slot is available again (cancellation frees it).

- [ ] **Step 8: Commit**

```bash
git add "src/app/admin/(protected)/meetings" "src/app/admin/(protected)/layout.tsx" "src/app/admin/(protected)/page.tsx"
git commit -m "Add admin Meetings screen and dashboard recent-meetings summary"
```

---

### Task 6: Public Scheduler component

**Files:**
- Create: `src/components/public/scheduler.tsx`
- Modify: `src/app/page.tsx` (temporary mount, alongside the existing `ContactForm`)

**Interfaces:**
- Consumes: `GET /api/meetings/availability`, `POST /api/meetings/book` (Task 4).
- Produces: `<Scheduler />` — no props, self-contained.

- [ ] **Step 1: Write the Scheduler component**

`src/components/public/scheduler.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Status = "loading" | "ready" | "booking" | "booked" | "error";

export function Scheduler() {
  const [slots, setSlots] = useState<Date[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);

  async function loadSlots() {
    setStatus("loading");
    setError(null);
    try {
      const response = await fetch("/api/meetings/availability");
      const data = await response.json();
      setSlots((data.slots as string[]).map((s) => new Date(s)));
      setStatus("ready");
    } catch {
      setError("Couldn't load availability. Please try again.");
      setStatus("error");
    }
  }

  useEffect(() => {
    loadSlots();
  }, []);

  const dayFormatter = useMemo(
    () => new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }),
    []
  );
  const timeFormatter = useMemo(
    () => new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }),
    []
  );

  const dayGroups = useMemo(() => {
    const groups = new Map<string, Date[]>();
    for (const slot of slots) {
      const key = slot.toDateString();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(slot);
    }
    return Array.from(groups.entries()).map(([key, daySlots]) => ({
      key,
      label: dayFormatter.format(daySlots[0]),
      slots: daySlots,
    }));
  }, [slots, dayFormatter]);

  const activeDay = dayGroups.find((d) => d.key === selectedDay) ?? dayGroups[0];

  async function handleBook(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSlot) return;
    setStatus("booking");
    setError(null);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/meetings/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduledAt: selectedSlot.toISOString(),
        name: formData.get("name"),
        email: formData.get("email"),
        topic: formData.get("topic"),
      }),
    });

    if (response.ok) {
      setStatus("booked");
      return;
    }

    const data = await response.json().catch(() => ({}));
    setError(data.error ?? "Something went wrong — please try again.");
    setSelectedSlot(null);
    await loadSlots();
  }

  if (status === "booked") {
    return (
      <p className="text-muted-foreground">
        Meeting confirmed — check your email for the calendar invite.
      </p>
    );
  }

  if (status === "loading") {
    return <p className="text-muted-foreground">Loading availability...</p>;
  }

  if (slots.length === 0) {
    return (
      <p className="text-muted-foreground">
        No open slots right now — please check back soon.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {dayGroups.map((day) => (
          <Button
            key={day.key}
            type="button"
            variant={activeDay?.key === day.key ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setSelectedDay(day.key);
              setSelectedSlot(null);
            }}
          >
            {day.label}
          </Button>
        ))}
      </div>
      {activeDay && (
        <div className="flex flex-wrap gap-2">
          {activeDay.slots.map((slot) => (
            <Button
              key={slot.toISOString()}
              type="button"
              variant={selectedSlot?.getTime() === slot.getTime() ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedSlot(slot)}
            >
              {timeFormatter.format(slot)}
            </Button>
          ))}
        </div>
      )}
      {selectedSlot && (
        <form onSubmit={handleBook} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meeting-name">Name</Label>
            <Input id="meeting-name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meeting-email">Email</Label>
            <Input id="meeting-email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meeting-topic">Topic</Label>
            <Textarea id="meeting-topic" name="topic" required />
          </div>
          <Button type="submit" className="w-full" disabled={status === "booking"}>
            {status === "booking" ? "Booking..." : `Book ${timeFormatter.format(selectedSlot)}`}
          </Button>
        </form>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Temporarily mount on the homepage**

Edit `src/app/page.tsx` to add the Scheduler below the ContactForm:

```tsx
import { prisma } from "@/lib/prisma";
import { ContactForm } from "@/components/public/contact-form";
import { Scheduler } from "@/components/public/scheduler";

export default async function Home() {
  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    select: { id: true, title: true },
  });

  return (
    <div className="mx-auto max-w-md space-y-12 p-8">
      <div>
        <h1 className="mb-6 text-2xl font-semibold">Contact us</h1>
        <ContactForm services={services} />
      </div>
      <div>
        <h1 className="mb-6 text-2xl font-semibold">Book a meeting</h1>
        <Scheduler />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: succeeds with no type errors.

- [ ] **Step 4: Browser verification**

Using claude-in-chrome: navigate to `http://localhost:3001`, scroll to "Book a meeting". Confirm day buttons render (Monday/Wednesday dates within the booking window). Click a day, confirm its time slots render in the browser's own local time (the dev browser's system timezone — note whatever it displays, since `businessTimezone` is `"UTC"` in seed data, the displayed local time will be offset from the raw UTC slot value, which is expected/correct behavior to verify, not a bug). Click a slot, fill in name/email/topic, submit. Confirm the "Meeting confirmed" message appears. Navigate to `/admin/meetings` and confirm the new booking appears with the correct topic/email.

- [ ] **Step 5: Commit**

```bash
git add src/components/public/scheduler.tsx src/app/page.tsx
git commit -m "Add public Scheduler component (temporarily mounted on homepage until Phase 6)"
```

---

## Phase 5b completion

After Task 6's commit, Phase 5 (the meeting scheduler) is complete: availability admin (5a) + booking engine (5b). Proceed to Phase 6 (replace the temporary homepage with the full designed single-page site) per the standing "complete all the phases" instruction — write Phase 6's plan next.
