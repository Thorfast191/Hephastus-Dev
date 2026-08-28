# Phase 4: Leads, Contact Form, and Email — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working contact form (`POST /api/leads`) that saves a `Lead` and emails both the agency and the visitor, an admin Leads screen (view detail, change status, edit notes, filter by status), and a dashboard update showing the 5 most recent leads. The email utility gracefully no-ops (logs instead of sending) when SMTP isn't configured, since this project only has placeholder SMTP env vars per Phase 0's decision.

**Architecture:** `src/lib/email.ts` wraps Nodemailer behind a `sendMail()` helper that returns early if `SMTP_HOST` isn't set. `POST /api/leads` is a Route Handler (not a Server Action — it's called from a public, unauthenticated client component): it validates with Zod, **saves the Lead first**, then attempts both emails inside a try/catch that can never roll back the save (a flaky SMTP server must not lose a lead). The admin Leads screen follows the view-dialog pattern (not the create/edit-dialog pattern from Phase 3 — leads aren't created or deleted from the admin, only viewed and updated). The public `ContactForm` component is built now and temporarily mounted on the still-default homepage so it's actually testable; Phase 6 moves it into the real designed page without changing the component itself.

**Tech Stack:** Adds `nodemailer` + `@types/nodemailer`.

**Spec:** `docs/superpowers/specs/2026-08-25-agency-website-design.md`

## Global Constraints

- Prisma pinned to 6.19.3; always `pnpm exec prisma`, never `pnpm dlx prisma`.
- `DialogTrigger`/`AlertDialogTrigger` render their own native element via `className={buttonVariants(...)}` — never nest a `<Button>` inside them via `render`.
- Any dialog whose fields are initialized from a row — whether via `defaultValue` (uncontrolled) or `useState(row.field)` (state seeded from props) — must be keyed by `` `${row.id}-${row.updatedAt.toISOString()}` `` at its call site. Neither pattern re-initializes on a prop change; only a remount does.
- `POST /api/leads` must save the `Lead` before attempting to send any email, and a send failure must never surface as a failed request or lost lead.
- SMTP is optional in this environment — `sendMail()` must no-op with a console log, not throw, when `SMTP_HOST` is unset.
- No test suite in v1 — verification is `pnpm build`, one direct `curl` against the route handler, and a browser walkthrough of the actual form.
- Working directly on `main`, committing per task.

---

### Task 1: Email utility

**Files:**
- Create: `src/lib/email.ts`
- Modify: `package.json` (add `nodemailer`, `@types/nodemailer`)
- Modify: `.env.example` (document the SMTP contract)

**Interfaces:**
- Produces: `sendMail({ to, subject, text, fromName? })` — Task 2's route handler calls this twice per submission.

- [ ] **Step 1: Install nodemailer**

```bash
pnpm add nodemailer
pnpm add -D @types/nodemailer
```

- [ ] **Step 2: Write the email utility**

Create `src/lib/email.ts`:

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
  });
}
```

- [ ] **Step 3: Document the SMTP contract in `.env.example`**

Add to `.env.example`:

```
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM=""
```

- [ ] **Step 4: Verify the build passes**

```bash
pnpm build
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/email.ts package.json pnpm-lock.yaml .env.example
git commit -m "Add email utility (no-ops without SMTP configured)"
```

---

### Task 2: Contact form API route

**Files:**
- Create: `src/app/api/leads/route.ts`

**Interfaces:**
- Consumes: `Lead`, `Service`, `SiteSettings` models; `sendMail` from Task 1.
- Produces: `POST /api/leads` — Task 4's `ContactForm` calls this.

- [ ] **Step 1: Write the route handler**

Create `src/app/api/leads/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email";

const leadSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  company: z.string().trim().optional(),
  message: z.string().min(1),
  serviceId: z.string().optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = leadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { name, email, company, message, serviceId } = parsed.data;

  const lead = await prisma.lead.create({
    data: {
      name,
      email,
      company: company || null,
      message,
      serviceId: serviceId || null,
    },
  });

  try {
    const settings = await prisma.siteSettings.findFirst();
    const fromName = settings?.smtpSenderName ?? settings?.agencyName ?? "Agency";

    if (settings?.contactEmail) {
      await sendMail({
        to: settings.contactEmail,
        subject: `New lead: ${name}`,
        text: `Name: ${name}\nEmail: ${email}\nCompany: ${company ?? "-"}\n\n${message}`,
        fromName,
      });
    }

    await sendMail({
      to: email,
      subject: "Thanks for reaching out",
      text: `Hi ${name},\n\nThanks for your message — we'll get back to you soon.\n\n${fromName}`,
      fromName,
    });
  } catch (error) {
    console.error("[leads] failed to send notification emails", error);
  }

  return NextResponse.json({ id: lead.id }, { status: 201 });
}
```

- [ ] **Step 2: Verify the build passes**

```bash
pnpm build
```

Expected: exits 0.

- [ ] **Step 3: Verify the route directly**

Start the dev server (`pnpm dev`), then:

```bash
curl -s -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{"name":"Curl Test","email":"curltest@example.com","message":"Testing the leads endpoint."}'
```

Expected: `{"id":"..."}` with HTTP 201. Then check the dev server's terminal output for two `[email] SMTP not configured, skipping send to ...` lines (one to the seeded `contactEmail`, one to `curltest@example.com`) — this proves the no-SMTP path works without throwing. Then verify the row landed in the database:

```bash
psql "$DATABASE_URL" -c 'SELECT name, email, status FROM "Lead";'
```

Expected: one row, `Curl Test` / `curltest@example.com` / `NEW`. Stop the dev server when done.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/leads
git commit -m "Add POST /api/leads route handler"
```

---

### Task 3: Admin Leads screen and dashboard update

**Files:**
- Create: `src/app/admin/(protected)/leads/actions.ts`
- Create: `src/app/admin/(protected)/leads/page.tsx`
- Create: `src/app/admin/(protected)/leads/lead-table.tsx`
- Create: `src/app/admin/(protected)/leads/lead-detail-dialog.tsx`
- Modify: `src/app/admin/(protected)/page.tsx` (show the 5 most recent leads)
- Modify: `src/app/admin/(protected)/layout.tsx` (add a nav link)

**Interfaces:**
- Consumes: `Lead`/`Service` models, `prisma` singleton.
- Produces: `updateLead(id, { status, notes })` Server Action; the `/admin/leads` route.

- [ ] **Step 1: Write the action**

Create `src/app/admin/(protected)/leads/actions.ts`:

```ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const updateLeadSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "WON", "LOST"]),
  notes: z.string(),
});

export async function updateLead(
  id: string,
  data: { status: string; notes: string }
) {
  const parsed = updateLeadSchema.parse(data);
  await prisma.lead.update({ where: { id }, data: parsed });
  revalidatePath("/admin/leads");
  revalidatePath("/admin");
}
```

- [ ] **Step 2: Write the detail dialog**

Create `src/app/admin/(protected)/leads/lead-detail-dialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateLead } from "./actions";
import type { Lead, Service } from "@prisma/client";

const STATUS_OPTIONS = ["NEW", "CONTACTED", "WON", "LOST"] as const;

export function LeadDetailDialog({
  lead,
}: {
  lead: Lead & { service: Service | null };
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string>(lead.status);
  const [notes, setNotes] = useState(lead.notes);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
        View
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{lead.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p>
            <span className="text-muted-foreground">Email: </span>
            {lead.email}
          </p>
          {lead.company && (
            <p>
              <span className="text-muted-foreground">Company: </span>
              {lead.company}
            </p>
          )}
          {lead.service && (
            <p>
              <span className="text-muted-foreground">Service: </span>
              {lead.service.title}
            </p>
          )}
          <p className="whitespace-pre-wrap rounded-md bg-muted p-3">{lead.message}</p>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => v && setStatus(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <Button
            className="w-full"
            onClick={async () => {
              await updateLead(lead.id, { status, notes });
              setOpen(false);
            }}
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Write the table**

Create `src/app/admin/(protected)/leads/lead-table.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import { LeadDetailDialog } from "./lead-detail-dialog";
import type { Lead, Service } from "@prisma/client";

type LeadWithService = Lead & { service: Service | null };

const FILTERS = ["ALL", "NEW", "CONTACTED", "WON", "LOST"] as const;

export function LeadTable({ leads }: { leads: LeadWithService[] }) {
  const [filter, setFilter] = useState<string>("ALL");

  const filtered = filter === "ALL" ? leads : leads.filter((l) => l.status === filter);

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
            <TableHead>Date</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell>{lead.createdAt.toLocaleDateString()}</TableCell>
              <TableCell>{lead.name}</TableCell>
              <TableCell>{lead.email}</TableCell>
              <TableCell>{lead.service?.title ?? "—"}</TableCell>
              <TableCell>
                <Badge variant="secondary">{lead.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <LeadDetailDialog
                  key={`${lead.id}-${lead.updatedAt.toISOString()}`}
                  lead={lead}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 4: Write the page**

Create `src/app/admin/(protected)/leads/page.tsx`:

```tsx
import { prisma } from "@/lib/prisma";
import { LeadTable } from "./lead-table";

export default async function LeadsPage() {
  const leads = await prisma.lead.findMany({
    include: { service: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Leads</h1>
      <LeadTable leads={leads} />
    </div>
  );
}
```

- [ ] **Step 5: Update the dashboard**

Replace `src/app/admin/(protected)/page.tsx` with:

```tsx
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";

export default async function AdminDashboardPage() {
  const session = await auth();
  const recentLeads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });

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
      <p className="text-muted-foreground">
        Recent meetings will show here once the scheduler is built.
      </p>
    </div>
  );
}
```

- [ ] **Step 6: Add the nav link**

In `src/app/admin/(protected)/layout.tsx`, add after the Settings link:

```tsx
        <a
          href="/admin/leads"
          className="text-muted-foreground hover:text-foreground"
        >
          Leads
        </a>
```

- [ ] **Step 7: Verify the build passes**

```bash
pnpm build
```

Expected: exits 0, route list includes `/admin/leads`.

- [ ] **Step 8: Browser walkthrough**

Start `pnpm dev`, sign in, then:

1. Go to `/admin`. Expected: "Recent leads" section shows the "Curl Test" lead from Task 2's verification.
2. Go to `/admin/leads`. Expected: the same lead listed with status `NEW`.
3. Click "View", change status to `CONTACTED`, add a note, save. Expected: dialog closes, table row shows the updated status badge.
4. Use the status filter dropdown to filter by `CONTACTED`. Expected: the lead still shows; filtering by `NEW` shows an empty table.
5. Reopen "View" on the lead. Expected: the status and notes reflect what was saved (not stale).

Fix anything that doesn't match before proceeding.

- [ ] **Step 9: Commit**

```bash
git add "src/app/admin/(protected)/leads" "src/app/admin/(protected)/page.tsx" "src/app/admin/(protected)/layout.tsx"
git commit -m "Add admin Leads screen and dashboard recent-leads summary"
```

---

### Task 4: Public contact form

**Files:**
- Create: `src/components/public/contact-form.tsx`
- Modify: `src/app/page.tsx` (temporarily mount the form so it's testable — Phase 6 replaces this whole file)

**Interfaces:**
- Consumes: `POST /api/leads` (Task 2).
- Produces: `ContactForm` component, reused as-is by Phase 6's full page layout.

- [ ] **Step 1: Write the contact form component**

Create `src/components/public/contact-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ContactForm({
  services,
}: {
  services: { id: string; title: string }[];
}) {
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">(
    "idle"
  );
  const [serviceId, setServiceId] = useState<string>("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      company: formData.get("company"),
      message: formData.get("message"),
      serviceId: serviceId || undefined,
    };

    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      setStatus("sent");
      event.currentTarget.reset();
      setServiceId("");
    } else {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return <p className="text-muted-foreground">Thanks — we&apos;ll be in touch soon.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="company">Company (optional)</Label>
        <Input id="company" name="company" />
      </div>
      <div className="space-y-2">
        <Label>Service interested in</Label>
        <Select value={serviceId} onValueChange={(v) => v && setServiceId(v)}>
          <SelectTrigger className="w-full">
            <SelectValue>
              {services.find((s) => s.id === serviceId)?.title ??
                "Select a service (optional)"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {services.map((service) => (
              <SelectItem key={service.id} value={service.id}>
                {service.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" name="message" required />
      </div>
      {status === "error" && (
        <p className="text-sm text-destructive">
          Something went wrong — please try again.
        </p>
      )}
      <Button type="submit" className="w-full" disabled={status === "submitting"}>
        {status === "submitting" ? "Sending..." : "Send message"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Temporarily mount it on the homepage**

Replace the contents of `src/app/page.tsx` with:

```tsx
import { prisma } from "@/lib/prisma";
import { ContactForm } from "@/components/public/contact-form";

export default async function Home() {
  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    select: { id: true, title: true },
  });

  return (
    <div className="mx-auto max-w-md p-8">
      <h1 className="mb-6 text-2xl font-semibold">Contact us</h1>
      <ContactForm services={services} />
    </div>
  );
}
```

(This whole file is replaced in Phase 6 by the real designed single-page site — Hero, Services, Portfolio, etc. — which renders `<ContactForm services={...} />` as one section among many, unchanged.)

- [ ] **Step 3: Verify the build passes**

```bash
pnpm build
```

Expected: exits 0.

- [ ] **Step 4: Browser walkthrough**

Start `pnpm dev`, then in a browser (not curl — this is the actual public-facing UI):

1. Visit `/`. Expected: a contact form with Name/Email/Company/Service dropdown (listing the 7 seeded active services)/Message.
2. Submit with a valid name/email/message, optionally picking a service. Expected: the form is replaced with "Thanks — we'll be in touch soon."
3. Sign in to `/admin/leads`. Expected: the new lead appears, with the correct service if one was picked.
4. Submit again with an invalid email (e.g., omit the `@` — browser HTML5 validation should block this before it ever reaches the server; confirm the browser shows its native validation message and no request is sent).

Fix anything that doesn't match before proceeding.

- [ ] **Step 5: Commit**

```bash
git add src/components/public/contact-form.tsx src/app/page.tsx
git commit -m "Add public contact form (temporarily mounted on homepage until Phase 6)"
```
