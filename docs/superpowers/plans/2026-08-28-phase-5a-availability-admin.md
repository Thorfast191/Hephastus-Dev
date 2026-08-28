# Phase 5a: Availability Rules + Blackout Dates Admin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin CRUD for `AvailabilityRule` (recurring weekly windows, e.g. "Mon–Fri 09:00–17:00") and `BlackoutDate` (specific fully-blocked dates) at `/admin/availability`. This is the config data Phase 5b's booking engine reads — no booking logic here, just the two small admin screens.

**Architecture:** Same Dialog + Server Action pattern as Phase 3, simplified: neither model has an `order` field (rules sort naturally by day-of-week, blackout dates by date), so there's no up/down reorder UI. Both sections live on one page since they're conceptually paired scheduling config, each with its own table and create/edit dialog (rules only — blackout dates are create/delete only, since editing a blackout date is just "delete the wrong one, add the right one").

**Tech Stack:** No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-25-agency-website-design.md`

## Global Constraints

- Prisma pinned to 6.19.3; always `pnpm exec prisma`, never `pnpm dlx prisma`.
- `DialogTrigger`/`AlertDialogTrigger` render their own native element via `className={buttonVariants(...)}` — never nest a `<Button>` inside them via `render`.
- Any dialog whose fields are initialized from a row (`defaultValue` or `useState(row.field)`) must remount when that row's data changes, or it displays stale values after a save. The usual fix is keying on `` `${row.id}-${row.updatedAt.toISOString()}` ``, but `AvailabilityRule` has no `updatedAt` column — keying by `id` alone would NOT work here, since `id` never changes on edit. Key `RuleFormDialog` by the editable fields themselves instead: `` `${rule.id}-${rule.dayOfWeek}-${rule.startTime}-${rule.endTime}` `` — this changes exactly when a save actually changes something, forcing the needed remount without a schema change.
- A Base UI `Select` whose item `value` differs from its display label must resolve the label explicitly via `<SelectValue>{...}</SelectValue>` children — passing a bare `placeholder` prop alone silently shows the raw value instead (found in Phase 4).
- No test suite in v1 — verification is `pnpm build` plus a browser walkthrough.
- Working directly on `main`, committing per task.

---

### Task 1: Availability Server Actions

**Files:**
- Create: `src/app/admin/(protected)/availability/actions.ts`

**Interfaces:**
- Consumes: `AvailabilityRule`, `BlackoutDate` models (Phase 1), `prisma` singleton.
- Produces: `createRule`, `updateRule(id, formData)`, `deleteRule(id)`, `toggleRuleActive(id, active)`, `createBlackout(formData)`, `deleteBlackout(id)` — Task 2's UI calls these. Phase 5b's availability engine reads these two tables directly via Prisma, not through these actions.

- [ ] **Step 1: Write the actions**

Create `src/app/admin/(protected)/availability/actions.ts`:

```ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const ruleSchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startTime: z.string().regex(TIME_REGEX, "Use HH:MM, e.g. 09:00"),
    endTime: z.string().regex(TIME_REGEX, "Use HH:MM, e.g. 17:00"),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "Start time must be before end time",
    path: ["endTime"],
  });

function readRuleForm(formData: FormData) {
  return ruleSchema.parse({
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });
}

export async function createRule(formData: FormData) {
  const parsed = readRuleForm(formData);
  await prisma.availabilityRule.create({ data: parsed });
  revalidatePath("/admin/availability");
}

export async function updateRule(id: string, formData: FormData) {
  const parsed = readRuleForm(formData);
  await prisma.availabilityRule.update({ where: { id }, data: parsed });
  revalidatePath("/admin/availability");
}

export async function deleteRule(id: string) {
  await prisma.availabilityRule.delete({ where: { id } });
  revalidatePath("/admin/availability");
}

export async function toggleRuleActive(id: string, active: boolean) {
  await prisma.availabilityRule.update({ where: { id }, data: { active } });
  revalidatePath("/admin/availability");
}

const blackoutSchema = z.object({
  date: z.string().min(1),
  reason: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v)),
});

export async function createBlackout(formData: FormData) {
  const parsed = blackoutSchema.parse({
    date: formData.get("date"),
    reason: formData.get("reason"),
  });
  await prisma.blackoutDate.create({
    data: { date: new Date(parsed.date), reason: parsed.reason },
  });
  revalidatePath("/admin/availability");
}

export async function deleteBlackout(id: string) {
  await prisma.blackoutDate.delete({ where: { id } });
  revalidatePath("/admin/availability");
}
```

- [ ] **Step 2: Verify the build passes**

```bash
pnpm build
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add "src/app/admin/(protected)/availability/actions.ts"
git commit -m "Add AvailabilityRule/BlackoutDate Server Actions"
```

---

### Task 2: Availability admin UI

**Files:**
- Create: `src/app/admin/(protected)/availability/page.tsx`
- Create: `src/app/admin/(protected)/availability/rule-form-dialog.tsx`
- Create: `src/app/admin/(protected)/availability/rule-table.tsx`
- Create: `src/app/admin/(protected)/availability/blackout-form-dialog.tsx`
- Create: `src/app/admin/(protected)/availability/blackout-table.tsx`
- Modify: `src/app/admin/(protected)/layout.tsx` (add a nav link)

**Interfaces:**
- Consumes: Task 1's actions.
- Produces: the `/admin/availability` route.

- [ ] **Step 1: Write the rule form dialog**

Create `src/app/admin/(protected)/availability/rule-form-dialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { VariantProps } from "class-variance-authority";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createRule, updateRule } from "./actions";
import type { AvailabilityRule } from "@prisma/client";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function RuleFormDialog({
  rule,
  variant = "default",
  size = "default",
  children,
}: {
  rule?: AvailabilityRule;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState(String(rule?.dayOfWeek ?? 1));

  const action = rule ? updateRule.bind(null, rule.id) : createRule;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant, size })}>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{rule ? "Edit availability rule" : "Add availability rule"}</DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            await action(formData);
            setOpen(false);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>Day of week</Label>
            <input type="hidden" name="dayOfWeek" value={dayOfWeek} />
            <Select value={dayOfWeek} onValueChange={(v) => v && setDayOfWeek(v)}>
              <SelectTrigger className="w-full">
                <SelectValue>{DAY_NAMES[Number(dayOfWeek)]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {DAY_NAMES.map((name, index) => (
                  <SelectItem key={name} value={String(index)}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start time</Label>
              <Input
                id="startTime"
                name="startTime"
                type="time"
                defaultValue={rule?.startTime ?? "09:00"}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End time</Label>
              <Input
                id="endTime"
                name="endTime"
                type="time"
                defaultValue={rule?.endTime ?? "17:00"}
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full">
            {rule ? "Save changes" : "Add rule"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Write the rule table**

Create `src/app/admin/(protected)/availability/rule-table.tsx`:

```tsx
"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
import { RuleFormDialog } from "./rule-form-dialog";
import { deleteRule, toggleRuleActive } from "./actions";
import type { AvailabilityRule } from "@prisma/client";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function RuleTable({ rules }: { rules: AvailabilityRule[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Day</TableHead>
          <TableHead>Start</TableHead>
          <TableHead>End</TableHead>
          <TableHead>Active</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rules.map((rule) => (
          <TableRow key={rule.id}>
            <TableCell>{DAY_NAMES[rule.dayOfWeek]}</TableCell>
            <TableCell>{rule.startTime}</TableCell>
            <TableCell>{rule.endTime}</TableCell>
            <TableCell>
              <Switch
                checked={rule.active}
                onCheckedChange={(checked) => toggleRuleActive(rule.id, checked)}
              />
            </TableCell>
            <TableCell className="flex justify-end gap-2">
              <RuleFormDialog
                key={`${rule.id}-${rule.dayOfWeek}-${rule.startTime}-${rule.endTime}`}
                rule={rule}
                variant="outline"
                size="icon"
              >
                <Pencil className="h-4 w-4" />
              </RuleFormDialog>
              <AlertDialog>
                <AlertDialogTrigger
                  className={buttonVariants({ variant: "outline", size: "icon" })}
                >
                  <Trash2 className="h-4 w-4" />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this rule?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes the {DAY_NAMES[rule.dayOfWeek]} {rule.startTime}–
                      {rule.endTime} window permanently.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteRule(rule.id)}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 3: Write the blackout form dialog**

Create `src/app/admin/(protected)/availability/blackout-form-dialog.tsx`:

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBlackout } from "./actions";

export function BlackoutFormDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant: "default", size: "default" })}>
        Add blackout date
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add blackout date</DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            await createBlackout(formData);
            setOpen(false);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" name="date" type="date" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Input id="reason" name="reason" placeholder="e.g. Holiday" />
          </div>
          <Button type="submit" className="w-full">
            Add blackout date
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Write the blackout table**

Create `src/app/admin/(protected)/availability/blackout-table.tsx`:

```tsx
"use client";

import { Trash2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
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
import { deleteBlackout } from "./actions";
import type { BlackoutDate } from "@prisma/client";

export function BlackoutTable({ blackouts }: { blackouts: BlackoutDate[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {blackouts.map((blackout) => (
          <TableRow key={blackout.id}>
            <TableCell>{blackout.date.toISOString().slice(0, 10)}</TableCell>
            <TableCell>{blackout.reason ?? "—"}</TableCell>
            <TableCell className="text-right">
              <AlertDialog>
                <AlertDialogTrigger
                  className={buttonVariants({ variant: "outline", size: "icon" })}
                >
                  <Trash2 className="h-4 w-4" />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove this blackout date?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {blackout.date.toISOString().slice(0, 10)} will become bookable again.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteBlackout(blackout.id)}>
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 5: Write the page**

Create `src/app/admin/(protected)/availability/page.tsx`:

```tsx
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { RuleFormDialog } from "./rule-form-dialog";
import { RuleTable } from "./rule-table";
import { BlackoutFormDialog } from "./blackout-form-dialog";
import { BlackoutTable } from "./blackout-table";

export default async function AvailabilityPage() {
  const [rules, blackouts] = await Promise.all([
    prisma.availabilityRule.findMany({ orderBy: { dayOfWeek: "asc" } }),
    prisma.blackoutDate.findMany({ orderBy: { date: "asc" } }),
  ]);

  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Weekly availability</h1>
          <RuleFormDialog>
            <Plus className="mr-2 h-4 w-4" />
            Add rule
          </RuleFormDialog>
        </div>
        <RuleTable rules={rules} />
      </div>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Blackout dates</h2>
          <BlackoutFormDialog />
        </div>
        <BlackoutTable blackouts={blackouts} />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Add the nav link**

In `src/app/admin/(protected)/layout.tsx`, add after the Leads link:

```tsx
        <a
          href="/admin/availability"
          className="text-muted-foreground hover:text-foreground"
        >
          Availability
        </a>
```

- [ ] **Step 7: Verify the build passes**

```bash
pnpm build
```

Expected: exits 0, route list includes `/admin/availability`.

- [ ] **Step 8: Browser walkthrough**

Start `pnpm dev`, sign in, then:

1. Go to `/admin/availability`. Expected: both sections empty (no rules or blackout dates seeded yet).
2. Add a rule: Monday, 09:00–17:00. Expected: row appears showing "Monday", "09:00", "17:00", active on.
3. Add rules for Tuesday–Friday the same way (or just Monday and one more, to prove the day-of-week Select genuinely records different days — check both rows show correct, distinct days, not the same one).
4. Edit one rule's end time to 18:00, save. Expected: table reflects the change, confirmed via a re-open (fresh, not stale) of the edit dialog.
5. Toggle a rule inactive, refresh, confirm it persisted.
6. Add a blackout date for a date about a week out with reason "Test holiday". Expected: row appears.
7. Delete the blackout date via confirm dialog. Expected: row disappears.
8. Delete one availability rule via confirm dialog. Expected: row disappears; leave at least one active rule in place for Phase 5b to use.

Fix anything that doesn't match before proceeding.

- [ ] **Step 9: Commit**

```bash
git add "src/app/admin/(protected)/availability" "src/app/admin/(protected)/layout.tsx"
git commit -m "Add Availability Rules and Blackout Dates admin UI"
```
