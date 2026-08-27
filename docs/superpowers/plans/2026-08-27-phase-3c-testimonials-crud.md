# Phase 3c: Testimonials Admin CRUD — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full CRUD for `Testimonial` under `/admin/testimonials` — list (ordered), create, edit, delete, up/down reorder, single photo upload. No boolean toggle field exists on this model (unlike Service/PortfolioItem), so the table has no switch column.

**Architecture:** Identical pattern to Phase 3a/3b: Server Component list page, client table with row actions calling Server Actions directly, a shared create/edit dialog keyed by `` `${id}-${updatedAt.toISOString()}` ``, adjacent-swap reordering. Reuses `ImageUpload` (single-file) from Phase 3b for the photo field — no new upload code needed.

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

### Task 1: Testimonial Server Actions

**Files:**
- Create: `src/app/admin/(protected)/testimonials/actions.ts`

**Interfaces:**
- Consumes: `Testimonial` model (Phase 1), `prisma` singleton.
- Produces: `createTestimonial`, `updateTestimonial(id, formData)`, `deleteTestimonial(id)`, `moveTestimonialUp(id)`, `moveTestimonialDown(id)` — Task 2's UI calls these.

- [ ] **Step 1: Write the actions**

Create `src/app/admin/(protected)/testimonials/actions.ts`:

```ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const testimonialSchema = z.object({
  quote: z.string().min(1, "Quote is required"),
  authorName: z.string().min(1, "Author name is required"),
  company: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v)),
  photo: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v)),
});

function readForm(formData: FormData) {
  return testimonialSchema.parse({
    quote: formData.get("quote"),
    authorName: formData.get("authorName"),
    company: formData.get("company"),
    photo: formData.get("photo"),
  });
}

export async function createTestimonial(formData: FormData) {
  const parsed = readForm(formData);
  const maxOrder = await prisma.testimonial.aggregate({ _max: { order: true } });

  await prisma.testimonial.create({
    data: { ...parsed, order: (maxOrder._max.order ?? -1) + 1 },
  });

  revalidatePath("/admin/testimonials");
}

export async function updateTestimonial(id: string, formData: FormData) {
  const parsed = readForm(formData);
  await prisma.testimonial.update({ where: { id }, data: parsed });
  revalidatePath("/admin/testimonials");
}

export async function deleteTestimonial(id: string) {
  await prisma.testimonial.delete({ where: { id } });
  revalidatePath("/admin/testimonials");
}

export async function moveTestimonialUp(id: string) {
  const testimonial = await prisma.testimonial.findUniqueOrThrow({ where: { id } });
  const prev = await prisma.testimonial.findFirst({
    where: { order: { lt: testimonial.order } },
    orderBy: { order: "desc" },
  });
  if (!prev) return;

  await prisma.$transaction([
    prisma.testimonial.update({
      where: { id: testimonial.id },
      data: { order: prev.order },
    }),
    prisma.testimonial.update({
      where: { id: prev.id },
      data: { order: testimonial.order },
    }),
  ]);
  revalidatePath("/admin/testimonials");
}

export async function moveTestimonialDown(id: string) {
  const testimonial = await prisma.testimonial.findUniqueOrThrow({ where: { id } });
  const next = await prisma.testimonial.findFirst({
    where: { order: { gt: testimonial.order } },
    orderBy: { order: "asc" },
  });
  if (!next) return;

  await prisma.$transaction([
    prisma.testimonial.update({
      where: { id: testimonial.id },
      data: { order: next.order },
    }),
    prisma.testimonial.update({
      where: { id: next.id },
      data: { order: testimonial.order },
    }),
  ]);
  revalidatePath("/admin/testimonials");
}
```

- [ ] **Step 2: Verify the build passes**

```bash
pnpm build
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add "src/app/admin/(protected)/testimonials/actions.ts"
git commit -m "Add Testimonial Server Actions (CRUD, reorder)"
```

---

### Task 2: Testimonials admin UI

**Files:**
- Create: `src/app/admin/(protected)/testimonials/page.tsx`
- Create: `src/app/admin/(protected)/testimonials/testimonial-form-dialog.tsx`
- Create: `src/app/admin/(protected)/testimonials/testimonial-table.tsx`
- Modify: `src/app/admin/(protected)/layout.tsx` (add a nav link)

**Interfaces:**
- Consumes: Task 1's actions; `ImageUpload` from `@/components/admin/image-upload` (Phase 3b).
- Produces: the `/admin/testimonials` route.

- [ ] **Step 1: Write the form dialog**

Create `src/app/admin/(protected)/testimonials/testimonial-form-dialog.tsx`:

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
import { createTestimonial, updateTestimonial } from "./actions";
import type { Testimonial } from "@prisma/client";

export function TestimonialFormDialog({
  testimonial,
  variant = "default",
  size = "default",
  children,
}: {
  testimonial?: Testimonial;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(testimonial?.photo ?? null);

  const action = testimonial
    ? updateTestimonial.bind(null, testimonial.id)
    : createTestimonial;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant, size })}>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {testimonial ? "Edit testimonial" : "Add testimonial"}
          </DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            await action(formData);
            setOpen(false);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="quote">Quote</Label>
            <Textarea
              id="quote"
              name="quote"
              defaultValue={testimonial?.quote}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="authorName">Author name</Label>
            <Input
              id="authorName"
              name="authorName"
              defaultValue={testimonial?.authorName}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input id="company" name="company" defaultValue={testimonial?.company ?? ""} />
          </div>
          <div className="space-y-2">
            <Label>Photo</Label>
            <input type="hidden" name="photo" value={photo ?? ""} />
            <ImageUpload value={photo} onChange={setPhoto} />
          </div>
          <Button type="submit" className="w-full">
            {testimonial ? "Save changes" : "Add testimonial"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Write the table**

Create `src/app/admin/(protected)/testimonials/testimonial-table.tsx`:

```tsx
"use client";

import Image from "next/image";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { TestimonialFormDialog } from "./testimonial-form-dialog";
import {
  deleteTestimonial,
  moveTestimonialDown,
  moveTestimonialUp,
} from "./actions";
import type { Testimonial } from "@prisma/client";

export function TestimonialTable({ testimonials }: { testimonials: Testimonial[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Photo</TableHead>
          <TableHead>Author</TableHead>
          <TableHead>Quote</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {testimonials.map((testimonial, index) => (
          <TableRow key={testimonial.id}>
            <TableCell className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                disabled={index === 0}
                onClick={() => moveTestimonialUp(testimonial.id)}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={index === testimonials.length - 1}
                onClick={() => moveTestimonialDown(testimonial.id)}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </TableCell>
            <TableCell>
              {testimonial.photo && (
                <div className="relative h-10 w-10 overflow-hidden rounded-full border">
                  <Image src={testimonial.photo} alt="" fill className="object-cover" />
                </div>
              )}
            </TableCell>
            <TableCell>
              {testimonial.authorName}
              {testimonial.company && (
                <span className="text-muted-foreground"> — {testimonial.company}</span>
              )}
            </TableCell>
            <TableCell className="max-w-xs truncate">{testimonial.quote}</TableCell>
            <TableCell className="flex justify-end gap-2">
              <TestimonialFormDialog
                key={`${testimonial.id}-${testimonial.updatedAt.toISOString()}`}
                testimonial={testimonial}
                variant="outline"
                size="icon"
              >
                <Pencil className="h-4 w-4" />
              </TestimonialFormDialog>
              <AlertDialog>
                <AlertDialogTrigger
                  className={buttonVariants({ variant: "outline", size: "icon" })}
                >
                  <Trash2 className="h-4 w-4" />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this testimonial?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes the quote from &quot;{testimonial.authorName}&quot;
                      permanently.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteTestimonial(testimonial.id)}>
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

Create `src/app/admin/(protected)/testimonials/page.tsx`:

```tsx
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { TestimonialFormDialog } from "./testimonial-form-dialog";
import { TestimonialTable } from "./testimonial-table";

export default async function TestimonialsPage() {
  const testimonials = await prisma.testimonial.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Testimonials</h1>
        <TestimonialFormDialog>
          <Plus className="mr-2 h-4 w-4" />
          Add testimonial
        </TestimonialFormDialog>
      </div>
      <TestimonialTable testimonials={testimonials} />
    </div>
  );
}
```

- [ ] **Step 4: Add the nav link**

In `src/app/admin/(protected)/layout.tsx`, add after the Portfolio link:

```tsx
        <a
          href="/admin/testimonials"
          className="text-muted-foreground hover:text-foreground"
        >
          Testimonials
        </a>
```

- [ ] **Step 5: Verify the build passes**

```bash
pnpm build
```

Expected: exits 0, route list includes `/admin/testimonials`.

- [ ] **Step 6: Browser walkthrough**

Start `pnpm dev`, sign in, then:

1. Go to `/admin/testimonials`. Expected: the 2 seeded placeholder testimonials listed with author/company and a truncated quote.
2. Add a new testimonial with a photo upload, submit. Expected: new row with photo thumbnail.
3. Reorder it, edit it (confirm pre-fill including photo), delete it via confirm dialog.

Fix anything that doesn't match before proceeding.

- [ ] **Step 7: Commit**

```bash
git add "src/app/admin/(protected)/testimonials" "src/app/admin/(protected)/layout.tsx"
git commit -m "Add Testimonials admin CRUD UI"
```
