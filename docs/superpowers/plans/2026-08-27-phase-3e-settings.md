# Phase 3e: Site Settings Admin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A single-page edit form at `/admin/settings` for the singleton `SiteSettings` row — agency name, tagline, contact email/phone, social links (Twitter/LinkedIn/GitHub), SMTP sender name, and the scheduler defaults (business timezone, slot duration, min notice, booking window). This completes Phase 3 (all five admin CRUD screens from the spec: Services, Portfolio, Testimonials, Team, Settings).

**Architecture:** Unlike the other Phase 3 screens, there's no list/create/delete — one row, one form, submitted directly to a single Server Action (`action={updateSettings}`, no client-side dialog wrapper needed). `socialLinks` (a `Json` column) is presented as three plain URL inputs (Twitter/LinkedIn/GitHub) and assembled into an object on submit, dropping empty ones. The action `upsert`s the singleton row (`id: "singleton"`, matching Phase 1's seed) so the page works even if the seed script was never run. The same key-on-`updatedAt` remount pattern from Phase 3a applies — otherwise the form's uncontrolled fields would go stale after a save.

**Tech Stack:** No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-25-agency-website-design.md`

## Global Constraints

- Prisma pinned to 6.19.3; always `pnpm exec prisma`, never `pnpm dlx prisma`.
- The `SiteSettings` row's id is always `"singleton"` — established in Phase 1's seed script; this is the only place besides the seed that reads/writes it.
- Any form holding uncontrolled fields pre-filled from a row must be keyed by something that changes when the row updates — here, `` settings?.updatedAt.toISOString() ?? "new" `` on the page's `<SettingsForm key={...}>`.
- No test suite in v1 — verification is `pnpm build` plus a browser walkthrough.
- Working directly on `main`, committing per task.

---

### Task 1: Settings Server Action

**Files:**
- Create: `src/app/admin/(protected)/settings/actions.ts`

**Interfaces:**
- Consumes: `SiteSettings` model (Phase 1), `prisma` singleton.
- Produces: `updateSettings(formData)` — Task 2's form calls this directly as its `action`.

- [ ] **Step 1: Write the action**

Create `src/app/admin/(protected)/settings/actions.ts`:

```ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const settingsSchema = z.object({
  agencyName: z.string().min(1),
  tagline: z.string().min(1),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(1),
  smtpSenderName: z.string().min(1),
  businessTimezone: z.string().min(1),
  slotDurationMinutes: z.coerce.number().int().positive(),
  minNoticeHours: z.coerce.number().int().min(0),
  bookingWindowDays: z.coerce.number().int().positive(),
  twitter: z.string().trim(),
  linkedin: z.string().trim(),
  github: z.string().trim(),
});

export async function updateSettings(formData: FormData) {
  const parsed = settingsSchema.parse({
    agencyName: formData.get("agencyName"),
    tagline: formData.get("tagline"),
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone"),
    smtpSenderName: formData.get("smtpSenderName"),
    businessTimezone: formData.get("businessTimezone"),
    slotDurationMinutes: formData.get("slotDurationMinutes"),
    minNoticeHours: formData.get("minNoticeHours"),
    bookingWindowDays: formData.get("bookingWindowDays"),
    twitter: formData.get("twitter"),
    linkedin: formData.get("linkedin"),
    github: formData.get("github"),
  });

  const socialLinks: Record<string, string> = {};
  if (parsed.twitter) socialLinks.twitter = parsed.twitter;
  if (parsed.linkedin) socialLinks.linkedin = parsed.linkedin;
  if (parsed.github) socialLinks.github = parsed.github;

  const data = {
    agencyName: parsed.agencyName,
    tagline: parsed.tagline,
    contactEmail: parsed.contactEmail,
    contactPhone: parsed.contactPhone,
    smtpSenderName: parsed.smtpSenderName,
    businessTimezone: parsed.businessTimezone,
    slotDurationMinutes: parsed.slotDurationMinutes,
    minNoticeHours: parsed.minNoticeHours,
    bookingWindowDays: parsed.bookingWindowDays,
    socialLinks,
  };

  await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });

  revalidatePath("/admin/settings");
}
```

- [ ] **Step 2: Verify the build passes**

```bash
pnpm build
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add "src/app/admin/(protected)/settings/actions.ts"
git commit -m "Add SiteSettings Server Action (upsert singleton row)"
```

---

### Task 2: Settings admin UI

**Files:**
- Create: `src/app/admin/(protected)/settings/page.tsx`
- Create: `src/app/admin/(protected)/settings/settings-form.tsx`
- Modify: `src/app/admin/(protected)/layout.tsx` (add a nav link)

**Interfaces:**
- Consumes: Task 1's `updateSettings` action.
- Produces: the `/admin/settings` route.

- [ ] **Step 1: Write the form**

Create `src/app/admin/(protected)/settings/settings-form.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSettings } from "./actions";
import type { SiteSettings } from "@prisma/client";

export function SettingsForm({ settings }: { settings: SiteSettings | null }) {
  const socialLinks = (settings?.socialLinks as Record<string, string> | null) ?? {};

  return (
    <form action={updateSettings} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="agencyName">Agency name</Label>
        <Input id="agencyName" name="agencyName" defaultValue={settings?.agencyName} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tagline">Tagline</Label>
        <Input id="tagline" name="tagline" defaultValue={settings?.tagline} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contactEmail">Contact email</Label>
        <Input
          id="contactEmail"
          name="contactEmail"
          type="email"
          defaultValue={settings?.contactEmail}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contactPhone">Contact phone</Label>
        <Input id="contactPhone" name="contactPhone" defaultValue={settings?.contactPhone} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="twitter">Twitter/X URL</Label>
        <Input id="twitter" name="twitter" defaultValue={socialLinks.twitter ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="linkedin">LinkedIn URL</Label>
        <Input id="linkedin" name="linkedin" defaultValue={socialLinks.linkedin ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="github">GitHub URL</Label>
        <Input id="github" name="github" defaultValue={socialLinks.github ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="smtpSenderName">SMTP sender name</Label>
        <Input
          id="smtpSenderName"
          name="smtpSenderName"
          defaultValue={settings?.smtpSenderName}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="businessTimezone">Business timezone (IANA name)</Label>
        <Input
          id="businessTimezone"
          name="businessTimezone"
          defaultValue={settings?.businessTimezone}
          placeholder="e.g. America/New_York"
          required
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="slotDurationMinutes">Slot duration (min)</Label>
          <Input
            id="slotDurationMinutes"
            name="slotDurationMinutes"
            type="number"
            min={5}
            defaultValue={settings?.slotDurationMinutes ?? 30}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="minNoticeHours">Min notice (hrs)</Label>
          <Input
            id="minNoticeHours"
            name="minNoticeHours"
            type="number"
            min={0}
            defaultValue={settings?.minNoticeHours ?? 24}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bookingWindowDays">Booking window (days)</Label>
          <Input
            id="bookingWindowDays"
            name="bookingWindowDays"
            type="number"
            min={1}
            defaultValue={settings?.bookingWindowDays ?? 30}
            required
          />
        </div>
      </div>
      <Button type="submit">Save changes</Button>
    </form>
  );
}
```

- [ ] **Step 2: Write the page**

Create `src/app/admin/(protected)/settings/page.tsx`:

```tsx
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const settings = await prisma.siteSettings.findFirst();

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Site Settings</h1>
      <SettingsForm key={settings?.updatedAt.toISOString() ?? "new"} settings={settings} />
    </div>
  );
}
```

- [ ] **Step 3: Add the nav link**

In `src/app/admin/(protected)/layout.tsx`, add after the Team link:

```tsx
        <a
          href="/admin/settings"
          className="text-muted-foreground hover:text-foreground"
        >
          Settings
        </a>
```

- [ ] **Step 4: Verify the build passes**

```bash
pnpm build
```

Expected: exits 0, route list includes `/admin/settings`.

- [ ] **Step 5: Browser walkthrough**

Start `pnpm dev`, sign in, then:

1. Go to `/admin/settings`. Expected: the form is pre-filled with the Phase 1 seed values (`[Placeholder Agency Name]`, `hello@example.com`, `UTC`, `30`/`24`/`30`, empty social link fields).
2. Change the agency name and one social link (e.g. Twitter), save.
3. Expected: after the page reloads, the form still shows the new agency name and Twitter URL (proves the upsert persisted and the remount picked up fresh data, not stale values).
4. Refresh the page directly (full reload). Expected: same values persist.

Fix anything that doesn't match before proceeding.

- [ ] **Step 6: Commit**

```bash
git add "src/app/admin/(protected)/settings" "src/app/admin/(protected)/layout.tsx"
git commit -m "Add Site Settings admin form"
```
