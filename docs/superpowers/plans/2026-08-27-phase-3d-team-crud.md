# Phase 3d: Team Admin CRUD — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full CRUD for `TeamMember` under `/admin/team` — list (ordered), create, edit, delete, active toggle, up/down reorder, single photo upload. Combines the active-toggle pattern from Phase 3a (Services) with the photo-upload pattern from Phase 3c (Testimonials) — no new UI concepts.

**Architecture:** Identical pattern to the prior Phase 3 sub-plans.

**Tech Stack:** No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-25-agency-website-design.md`

## Global Constraints

- Prisma pinned to 6.19.3; always `pnpm exec prisma`, never `pnpm dlx prisma`.
- `DialogTrigger`/`AlertDialogTrigger` render their own native element via `className={buttonVariants(...)}` — never nest a `<Button>` inside them via `render`.
- Any create/edit dialog holding uncontrolled fields pre-filled from a row must be keyed by `` `${row.id}-${row.updatedAt.toISOString()}` `` at its call site.
- Ordering uses a plain integer `order` field with up/down controls — no drag-and-drop.
- No test suite in v1 — verification is `pnpm build` plus a browser walkthrough.
- Working directly on `main`, committing per task.

---

### Task 1: TeamMember Server Actions

**Files:**
- Create: `src/app/admin/(protected)/team/actions.ts`

**Interfaces:**
- Consumes: `TeamMember` model (Phase 1), `prisma` singleton.
- Produces: `createTeamMember`, `updateTeamMember(id, formData)`, `deleteTeamMember(id)`, `toggleTeamMemberActive(id, active)`, `moveTeamMemberUp(id)`, `moveTeamMemberDown(id)` — Task 2's UI calls these.

- [ ] **Step 1: Write the actions**

Create `src/app/admin/(protected)/team/actions.ts`:

```ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const teamMemberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Role is required"),
  bio: z.string().min(1, "Bio is required"),
  photo: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v)),
});

function readForm(formData: FormData) {
  return teamMemberSchema.parse({
    name: formData.get("name"),
    role: formData.get("role"),
    bio: formData.get("bio"),
    photo: formData.get("photo"),
  });
}

export async function createTeamMember(formData: FormData) {
  const parsed = readForm(formData);
  const maxOrder = await prisma.teamMember.aggregate({ _max: { order: true } });

  await prisma.teamMember.create({
    data: { ...parsed, order: (maxOrder._max.order ?? -1) + 1 },
  });

  revalidatePath("/admin/team");
}

export async function updateTeamMember(id: string, formData: FormData) {
  const parsed = readForm(formData);
  await prisma.teamMember.update({ where: { id }, data: parsed });
  revalidatePath("/admin/team");
}

export async function deleteTeamMember(id: string) {
  await prisma.teamMember.delete({ where: { id } });
  revalidatePath("/admin/team");
}

export async function toggleTeamMemberActive(id: string, active: boolean) {
  await prisma.teamMember.update({ where: { id }, data: { active } });
  revalidatePath("/admin/team");
}

export async function moveTeamMemberUp(id: string) {
  const member = await prisma.teamMember.findUniqueOrThrow({ where: { id } });
  const prev = await prisma.teamMember.findFirst({
    where: { order: { lt: member.order } },
    orderBy: { order: "desc" },
  });
  if (!prev) return;

  await prisma.$transaction([
    prisma.teamMember.update({ where: { id: member.id }, data: { order: prev.order } }),
    prisma.teamMember.update({ where: { id: prev.id }, data: { order: member.order } }),
  ]);
  revalidatePath("/admin/team");
}

export async function moveTeamMemberDown(id: string) {
  const member = await prisma.teamMember.findUniqueOrThrow({ where: { id } });
  const next = await prisma.teamMember.findFirst({
    where: { order: { gt: member.order } },
    orderBy: { order: "asc" },
  });
  if (!next) return;

  await prisma.$transaction([
    prisma.teamMember.update({ where: { id: member.id }, data: { order: next.order } }),
    prisma.teamMember.update({ where: { id: next.id }, data: { order: member.order } }),
  ]);
  revalidatePath("/admin/team");
}
```

- [ ] **Step 2: Verify the build passes**

```bash
pnpm build
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add "src/app/admin/(protected)/team/actions.ts"
git commit -m "Add TeamMember Server Actions (CRUD, toggle, reorder)"
```

---

### Task 2: Team admin UI

**Files:**
- Create: `src/app/admin/(protected)/team/page.tsx`
- Create: `src/app/admin/(protected)/team/team-member-form-dialog.tsx`
- Create: `src/app/admin/(protected)/team/team-member-table.tsx`
- Modify: `src/app/admin/(protected)/layout.tsx` (add a nav link)

**Interfaces:**
- Consumes: Task 1's actions; `ImageUpload` from `@/components/admin/image-upload` (Phase 3b).
- Produces: the `/admin/team` route.

- [ ] **Step 1: Write the form dialog**

Create `src/app/admin/(protected)/team/team-member-form-dialog.tsx`:

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
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/admin/image-upload";
import { createTeamMember, updateTeamMember } from "./actions";
import type { TeamMember } from "@prisma/client";

export function TeamMemberFormDialog({
  member,
  variant = "default",
  size = "default",
  children,
}: {
  member?: TeamMember;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(member?.photo ?? null);

  const action = member ? updateTeamMember.bind(null, member.id) : createTeamMember;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant, size })}>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{member ? "Edit team member" : "Add team member"}</DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            await action(formData);
            setOpen(false);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={member?.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Input id="role" name="role" defaultValue={member?.role} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" name="bio" defaultValue={member?.bio} required />
          </div>
          <div className="space-y-2">
            <Label>Photo</Label>
            <input type="hidden" name="photo" value={photo ?? ""} />
            <ImageUpload value={photo} onChange={setPhoto} />
          </div>
          <Button type="submit" className="w-full">
            {member ? "Save changes" : "Add team member"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Write the table**

Create `src/app/admin/(protected)/team/team-member-table.tsx`:

```tsx
"use client";

import Image from "next/image";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
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
import { TeamMemberFormDialog } from "./team-member-form-dialog";
import {
  deleteTeamMember,
  moveTeamMemberDown,
  moveTeamMemberUp,
  toggleTeamMemberActive,
} from "./actions";
import type { TeamMember } from "@prisma/client";

export function TeamMemberTable({ members }: { members: TeamMember[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Photo</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Active</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member, index) => (
          <TableRow key={member.id}>
            <TableCell className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                disabled={index === 0}
                onClick={() => moveTeamMemberUp(member.id)}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={index === members.length - 1}
                onClick={() => moveTeamMemberDown(member.id)}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </TableCell>
            <TableCell>
              {member.photo && (
                <div className="relative h-10 w-10 overflow-hidden rounded-full border">
                  <Image src={member.photo} alt="" fill className="object-cover" />
                </div>
              )}
            </TableCell>
            <TableCell>{member.name}</TableCell>
            <TableCell>{member.role}</TableCell>
            <TableCell>
              <Switch
                checked={member.active}
                onCheckedChange={(checked) => toggleTeamMemberActive(member.id, checked)}
              />
            </TableCell>
            <TableCell className="flex justify-end gap-2">
              <TeamMemberFormDialog
                key={`${member.id}-${member.updatedAt.toISOString()}`}
                member={member}
                variant="outline"
                size="icon"
              >
                <Pencil className="h-4 w-4" />
              </TeamMemberFormDialog>
              <AlertDialog>
                <AlertDialogTrigger
                  className={buttonVariants({ variant: "outline", size: "icon" })}
                >
                  <Trash2 className="h-4 w-4" />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this team member?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes &quot;{member.name}&quot; permanently.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteTeamMember(member.id)}>
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

- [ ] **Step 3: Write the page**

Create `src/app/admin/(protected)/team/page.tsx`:

```tsx
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { TeamMemberFormDialog } from "./team-member-form-dialog";
import { TeamMemberTable } from "./team-member-table";

export default async function TeamPage() {
  const members = await prisma.teamMember.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Team</h1>
        <TeamMemberFormDialog>
          <Plus className="mr-2 h-4 w-4" />
          Add team member
        </TeamMemberFormDialog>
      </div>
      <TeamMemberTable members={members} />
    </div>
  );
}
```

- [ ] **Step 4: Add the nav link**

In `src/app/admin/(protected)/layout.tsx`, add after the Testimonials link:

```tsx
        <a
          href="/admin/team"
          className="text-muted-foreground hover:text-foreground"
        >
          Team
        </a>
```

- [ ] **Step 5: Verify the build passes**

```bash
pnpm build
```

Expected: exits 0, route list includes `/admin/team`.

- [ ] **Step 6: Browser walkthrough**

Start `pnpm dev`, sign in, then:

1. Go to `/admin/team`. Expected: the 2 seeded placeholder team members ("Placeholder Name" / Founder, "Placeholder Name Two" / Lead Engineer) listed, both active.
2. Add a team member with a photo, submit.
3. Toggle active off/on, refresh, confirm it persisted.
4. Edit it (confirm pre-fill including photo), reorder if more than one exists, delete it.

Fix anything that doesn't match before proceeding.

- [ ] **Step 7: Commit**

```bash
git add "src/app/admin/(protected)/team" "src/app/admin/(protected)/layout.tsx"
git commit -m "Add Team admin CRUD UI"
```
