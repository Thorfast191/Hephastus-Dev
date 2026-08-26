# Phase 3a: Services Admin CRUD — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full CRUD for `Service` under `/admin/services` — list (ordered), create, edit, delete, active toggle, up/down reorder. This establishes the pattern the rest of Phase 3 (Portfolio, Testimonials, Team) follows.

**Architecture:** A Server Component page fetches and renders the list; a client `ServiceTable` handles row actions (edit dialog, delete confirm, reorder, active toggle) by calling Server Actions directly (not only via `<form>` — Next.js supports invoking a Server Action as a plain async function from a client event handler); a shared `ServiceFormDialog` client component handles both create and edit via one form, binding the `id` into `updateService` with `.bind()` for edits. Reordering is an adjacent-swap of the `order` field in a transaction, not a full renumbering.

**Tech Stack:** Adds `zod` (input validation) and shadcn/ui `table`, `dialog`, `switch`, `textarea`, `select`, `alert-dialog`, `badge` components.

**Spec:** `docs/superpowers/specs/2026-08-25-agency-website-design.md`

## Global Constraints

- Prisma pinned to 6.19.3; always `pnpm exec prisma`, never `pnpm dlx prisma`.
- Ordering uses a plain integer `order` field with up/down controls — no drag-and-drop (spec decision).
- Descriptions are plain textareas, not rich text (spec decision).
- Icons come from a fixed lucide-react name list via a picker, not free text (spec decision) — this phase introduces the shared `IconPicker` component other phases don't need, but future admin screens with icon fields would reuse it.
- Zod validates every Server Action's input — this is the "correctness net" the spec relies on in place of a test suite.
- No test suite in v1 — verification is `pnpm build` plus an actual browser walkthrough (this is UI-facing work).
- Working directly on `main`, committing per task.

---

### Task 1: Dependencies and shared admin components

**Files:**
- Modify: `package.json` (add `zod`)
- Create: `src/components/ui/table.tsx`, `dialog.tsx`, `switch.tsx`, `textarea.tsx`, `select.tsx`, `alert-dialog.tsx`, `badge.tsx` (via shadcn CLI)
- Create: `src/components/admin/icon-picker.tsx`

**Interfaces:**
- Produces: `IconPicker` component (`value: string`, `onChange: (value: string) => void` props) and its exported `ICON_OPTIONS` list, reused by any future admin form with an icon field. All the shadcn components above, reused by every subsequent Phase 3 sub-plan.

- [ ] **Step 1: Install zod**

```bash
pnpm add zod
```

- [ ] **Step 2: Add the shadcn components**

```bash
pnpm dlx shadcn@latest add table dialog switch textarea select alert-dialog badge -y
```

- [ ] **Step 3: Write the icon picker**

Create `src/components/admin/icon-picker.tsx`:

```tsx
"use client";

import * as Icons from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const ICON_OPTIONS = [
  "Globe",
  "Monitor",
  "Smartphone",
  "Cpu",
  "Network",
  "Sparkles",
  "Eye",
  "Code2",
  "Database",
  "Cloud",
  "Server",
  "Shield",
  "Zap",
  "Rocket",
  "Settings",
  "Layers",
  "Terminal",
  "GitBranch",
  "LineChart",
  "MessageSquare",
  "Camera",
  "Bot",
  "Brain",
  "Palette",
  "PenTool",
  "Wrench",
] as const;

export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const SelectedIcon = Icons[value as keyof typeof Icons] as Icons.LucideIcon | undefined;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <div className="flex items-center gap-2">
          {SelectedIcon && <SelectedIcon className="h-4 w-4" />}
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {ICON_OPTIONS.map((name) => {
          const OptionIcon = Icons[name] as Icons.LucideIcon;
          return (
            <SelectItem key={name} value={name}>
              <div className="flex items-center gap-2">
                <OptionIcon className="h-4 w-4" />
                {name}
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 4: Verify the build passes**

```bash
pnpm build
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add zod, CRUD-related shadcn components, and the shared icon picker"
```

---

### Task 2: Service Server Actions

**Files:**
- Create: `src/app/admin/(protected)/services/actions.ts`

**Interfaces:**
- Consumes: `Service` model (Phase 1), `prisma` singleton (Phase 0).
- Produces: `createService`, `updateService(id, formData)`, `deleteService(id)`, `toggleServiceActive(id, active)`, `moveServiceUp(id)`, `moveServiceDown(id)` — Task 3's UI calls these directly.

- [ ] **Step 1: Write the actions**

Create `src/app/admin/(protected)/services/actions.ts`:

```ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const serviceSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  icon: z.string().min(1, "Icon is required"),
});

export async function createService(formData: FormData) {
  const parsed = serviceSchema.parse({
    title: formData.get("title"),
    description: formData.get("description"),
    icon: formData.get("icon"),
  });

  const maxOrder = await prisma.service.aggregate({ _max: { order: true } });

  await prisma.service.create({
    data: {
      ...parsed,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  revalidatePath("/admin/services");
}

export async function updateService(id: string, formData: FormData) {
  const parsed = serviceSchema.parse({
    title: formData.get("title"),
    description: formData.get("description"),
    icon: formData.get("icon"),
  });

  await prisma.service.update({ where: { id }, data: parsed });
  revalidatePath("/admin/services");
}

export async function deleteService(id: string) {
  await prisma.service.delete({ where: { id } });
  revalidatePath("/admin/services");
}

export async function toggleServiceActive(id: string, active: boolean) {
  await prisma.service.update({ where: { id }, data: { active } });
  revalidatePath("/admin/services");
}

export async function moveServiceUp(id: string) {
  const service = await prisma.service.findUniqueOrThrow({ where: { id } });
  const prev = await prisma.service.findFirst({
    where: { order: { lt: service.order } },
    orderBy: { order: "desc" },
  });
  if (!prev) return;

  await prisma.$transaction([
    prisma.service.update({
      where: { id: service.id },
      data: { order: prev.order },
    }),
    prisma.service.update({
      where: { id: prev.id },
      data: { order: service.order },
    }),
  ]);
  revalidatePath("/admin/services");
}

export async function moveServiceDown(id: string) {
  const service = await prisma.service.findUniqueOrThrow({ where: { id } });
  const next = await prisma.service.findFirst({
    where: { order: { gt: service.order } },
    orderBy: { order: "asc" },
  });
  if (!next) return;

  await prisma.$transaction([
    prisma.service.update({
      where: { id: service.id },
      data: { order: next.order },
    }),
    prisma.service.update({
      where: { id: next.id },
      data: { order: service.order },
    }),
  ]);
  revalidatePath("/admin/services");
}
```

- [ ] **Step 2: Verify the build passes**

```bash
pnpm build
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add "src/app/admin/(protected)/services/actions.ts"
git commit -m "Add Service Server Actions (CRUD, toggle, reorder)"
```

---

### Task 3: Services admin UI

**Files:**
- Create: `src/app/admin/(protected)/services/page.tsx`
- Create: `src/app/admin/(protected)/services/service-form-dialog.tsx`
- Create: `src/app/admin/(protected)/services/service-table.tsx`
- Modify: `src/app/admin/(protected)/layout.tsx` (add a nav link to Services)

**Interfaces:**
- Consumes: Task 2's actions; `IconPicker` from Task 1; shadcn `Table`/`Dialog`/`Switch`/`Textarea`/`AlertDialog`/`Button`/`Input`/`Label`.
- Produces: the `/admin/services` route.

- [ ] **Step 1: Write the form dialog**

Create `src/app/admin/(protected)/services/service-form-dialog.tsx`:

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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IconPicker } from "@/components/admin/icon-picker";
import { createService, updateService } from "./actions";
import type { Service } from "@prisma/client";

export function ServiceFormDialog({
  service,
  trigger,
}: {
  service?: Service;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [icon, setIcon] = useState(service?.icon ?? "Globe");

  const action = service ? updateService.bind(null, service.id) : createService;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{service ? "Edit service" : "Add service"}</DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            await action(formData);
            setOpen(false);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" defaultValue={service?.title} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={service?.description}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Icon</Label>
            <input type="hidden" name="icon" value={icon} />
            <IconPicker value={icon} onChange={setIcon} />
          </div>
          <Button type="submit" className="w-full">
            {service ? "Save changes" : "Add service"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Write the table**

Create `src/app/admin/(protected)/services/service-table.tsx`:

```tsx
"use client";

import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { ServiceFormDialog } from "./service-form-dialog";
import {
  deleteService,
  moveServiceDown,
  moveServiceUp,
  toggleServiceActive,
} from "./actions";
import type { Service } from "@prisma/client";

export function ServiceTable({ services }: { services: Service[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Icon</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Active</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {services.map((service, index) => {
          const ServiceIcon = Icons[
            service.icon as keyof typeof Icons
          ] as Icons.LucideIcon | undefined;

          return (
            <TableRow key={service.id}>
              <TableCell className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={index === 0}
                  onClick={() => moveServiceUp(service.id)}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={index === services.length - 1}
                  onClick={() => moveServiceDown(service.id)}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </TableCell>
              <TableCell>{ServiceIcon && <ServiceIcon className="h-5 w-5" />}</TableCell>
              <TableCell>{service.title}</TableCell>
              <TableCell>
                <Switch
                  checked={service.active}
                  onCheckedChange={(checked) => toggleServiceActive(service.id, checked)}
                />
              </TableCell>
              <TableCell className="flex justify-end gap-2">
                <ServiceFormDialog
                  service={service}
                  trigger={
                    <Button variant="outline" size="icon">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  }
                />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this service?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This removes &quot;{service.title}&quot; permanently. Any
                        leads referencing it keep their history — the service
                        reference is just cleared.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteService(service.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 3: Write the page**

Create `src/app/admin/(protected)/services/page.tsx`:

```tsx
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { ServiceFormDialog } from "./service-form-dialog";
import { ServiceTable } from "./service-table";

export default async function ServicesPage() {
  const services = await prisma.service.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Services</h1>
        <ServiceFormDialog
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add service
            </Button>
          }
        />
      </div>
      <ServiceTable services={services} />
    </div>
  );
}
```

- [ ] **Step 4: Add a nav link in the protected layout**

In `src/app/admin/(protected)/layout.tsx`, add a `<nav>` between the header and `<main>`:

```tsx
      <nav className="flex gap-4 border-b bg-background px-6 py-2 text-sm">
        <a href="/admin" className="text-muted-foreground hover:text-foreground">
          Dashboard
        </a>
        <a
          href="/admin/services"
          className="text-muted-foreground hover:text-foreground"
        >
          Services
        </a>
      </nav>
```

(Place it as a sibling right after the closing `</header>` tag, before `<main>`.)

- [ ] **Step 5: Verify the build passes**

```bash
pnpm build
```

Expected: exits 0, route list includes `/admin/services`.

- [ ] **Step 6: Browser walkthrough**

Start `pnpm dev`, sign in at `/admin/login` with the Phase 1 seeded admin, then in the browser:

1. Go to `/admin/services`. Expected: 7 seeded placeholder services listed in order, each with an icon, title, active toggle (on), and up/down/edit/delete buttons (top row's "up" and bottom row's "down" disabled).
2. Click "Add service", fill in a title/description, pick an icon, submit. Expected: dialog closes, new row appears at the bottom (order 7).
3. Click the new row's "up" arrow twice. Expected: it moves up two positions, other rows shift accordingly.
4. Click "edit" on it, change the title, save. Expected: title updates in the table.
5. Toggle its active switch off. Expected: switch reflects off state (survives a page refresh).
6. Delete it via the trash icon + confirm. Expected: row disappears, count back to 7.

Fix anything that doesn't match before proceeding.

- [ ] **Step 7: Commit**

```bash
git add "src/app/admin/(protected)/services" "src/app/admin/(protected)/layout.tsx"
git commit -m "Add Services admin CRUD UI"
```
