# Phase 3b: File Uploads + Portfolio Admin CRUD — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Local-disk image uploads (needed by Portfolio images here, and reused by Testimonials/Team photos in 3c/3d), plus full CRUD for `PortfolioItem` under `/admin/portfolio` — list (ordered), create, edit, delete, featured toggle, up/down reorder, multiple images per item, comma-separated tags.

**Architecture:** `POST /api/upload` (admin-only) validates an image file and writes it to `<project root>/uploads/<uuid>.<ext>` — a plain filesystem directory, not under `public/`, so it isn't bundled into the build and can be a persistent volume in production. `GET /uploads/[filename]` streams it back with the right content type; production replaces this route with an Nginx `location /uploads/` block (Phase 8), but the route handler is also what dev uses. `ImageUpload` (single) and `MultiImageUpload` (array) are client components that call the upload endpoint and hand the resulting path(s) to the parent form via a hidden input, following the same create/edit-dialog + Server Action + up/down-reorder pattern established in Phase 3a for Services.

**Tech Stack:** Same as Phase 3a. No new dependencies — uses Node's built-in `fs/promises` for file I/O and Next.js's built-in `Image` component.

**Spec:** `docs/superpowers/specs/2026-08-25-agency-website-design.md`

## Global Constraints

- Prisma pinned to 6.19.3; always `pnpm exec prisma`, never `pnpm dlx prisma`.
- shadcn's Base UI-based `DialogTrigger`/`AlertDialogTrigger` must render their own native element via `className={buttonVariants(...)}` — never nest a `<Button>` (a separate Base UI primitive) inside them via the `render` prop. Doing so causes a client/server id hydration mismatch (found and fixed in Phase 3a).
- Any dialog form component holding an uncontrolled field pre-filled from a database row (`defaultValue={row.field}`) must be keyed by `` `${row.id}-${row.updatedAt.toISOString()}` `` at its call site, so it remounts — and re-initializes those fields — whenever the underlying row actually changes. Otherwise the field goes stale after an edit (found and fixed in Phase 3a).
- Ordering uses a plain integer `order` field with up/down controls — no drag-and-drop.
- Uploads: only `image/png`, `image/jpeg`, `image/webp`, `image/gif` accepted (no SVG — it can carry scripts); 5MB max; filenames are server-generated UUIDs, never derived from user input.
- No test suite in v1 — verification is `pnpm build` plus an actual browser walkthrough (UI-facing work).
- Working directly on `main`, committing per task.

---

### Task 1: File upload API and shared upload components

**Files:**
- Create: `src/app/api/upload/route.ts`
- Create: `src/app/uploads/[filename]/route.ts`
- Create: `src/components/admin/image-upload.tsx`
- Modify: `.gitignore` (ignore the `uploads/` data directory)

**Interfaces:**
- Produces: `POST /api/upload` (multipart `file` field → `{ path: string }` JSON, or `{ error: string }` with a 4xx status), `GET /uploads/:filename` (streams the file), `ImageUpload` (single-value) and `MultiImageUpload` (array-value) components — Task 3 uses both; Phase 3c/3d reuse `ImageUpload` for photo fields.

- [ ] **Step 1: Write the upload API route**

Create `src/app/api/upload/route.ts`:

```ts
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { auth } from "@/auth";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};
const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  const filename = `${randomUUID()}.${extension}`;
  await mkdir(UPLOADS_DIR, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOADS_DIR, filename), buffer);

  return NextResponse.json({ path: `/uploads/${filename}` });
}
```

- [ ] **Step 2: Write the serving route**

Create `src/app/uploads/[filename]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  if (filename.includes("/") || filename.includes("..")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const extension = filename.split(".").pop() ?? "";
  const contentType = CONTENT_TYPES[extension];
  if (!contentType) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const buffer = await readFile(path.join(UPLOADS_DIR, filename));
    return new NextResponse(new Uint8Array(buffer), {
      headers: { "Content-Type": contentType },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
```

- [ ] **Step 3: Ignore the uploads data directory**

Add to `.gitignore`:

```
# user-uploaded files (local disk storage, not part of the build)
/uploads/
```

- [ ] **Step 4: Write the upload components**

Create `src/components/admin/image-upload.tsx`:

```tsx
"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

async function uploadFile(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch("/api/upload", { method: "POST", body: formData });
  if (!response.ok) return null;
  const data = (await response.json()) as { path: string };
  return data.path;
}

export function ImageUpload({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (path: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = await uploadFile(file);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    if (path) onChange(path);
  }

  return (
    <div className="flex items-center gap-3">
      {value && (
        <div className="relative h-16 w-16 overflow-hidden rounded-md border">
          <Image src={value} alt="" fill className="object-cover" />
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="mr-2 h-4 w-4" />
        {uploading ? "Uploading..." : value ? "Replace" : "Upload"}
      </Button>
      {value && (
        <Button type="button" variant="ghost" size="icon" onClick={() => onChange(null)}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export function MultiImageUpload({
  value,
  onChange,
}: {
  value: string[];
  onChange: (paths: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = await uploadFile(file);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    if (path) onChange([...value, path]);
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {value.map((src, index) => (
            <div key={src} className="relative h-16 w-16 overflow-hidden rounded-md border">
              <Image src={src} alt="" fill className="object-cover" />
              <button
                type="button"
                onClick={() => removeAt(index)}
                className="absolute top-0 right-0 rounded-bl bg-background/80 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="mr-2 h-4 w-4" />
        {uploading ? "Uploading..." : "Add image"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 5: Verify the build passes**

```bash
pnpm build
```

Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add local-disk image upload API and shared upload components"
```

---

### Task 2: PortfolioItem Server Actions

**Files:**
- Create: `src/app/admin/(protected)/portfolio/actions.ts`

**Interfaces:**
- Consumes: `PortfolioItem` model (Phase 1), `prisma` singleton.
- Produces: `createPortfolioItem`, `updatePortfolioItem(id, formData)`, `deletePortfolioItem(id)`, `toggleFeatured(id, featured)`, `movePortfolioItemUp(id)`, `movePortfolioItemDown(id)` — Task 3's UI calls these.

- [ ] **Step 1: Write the actions**

Create `src/app/admin/(protected)/portfolio/actions.ts`:

```ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const portfolioSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  externalLink: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v)),
  tags: z.string().transform((v) =>
    v
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
  ),
  images: z.string().transform((v) => JSON.parse(v) as string[]),
});

function readForm(formData: FormData) {
  return portfolioSchema.parse({
    title: formData.get("title"),
    description: formData.get("description"),
    externalLink: formData.get("externalLink"),
    tags: formData.get("tags"),
    images: formData.get("images"),
  });
}

export async function createPortfolioItem(formData: FormData) {
  const parsed = readForm(formData);
  const maxOrder = await prisma.portfolioItem.aggregate({ _max: { order: true } });

  await prisma.portfolioItem.create({
    data: { ...parsed, order: (maxOrder._max.order ?? -1) + 1 },
  });

  revalidatePath("/admin/portfolio");
}

export async function updatePortfolioItem(id: string, formData: FormData) {
  const parsed = readForm(formData);
  await prisma.portfolioItem.update({ where: { id }, data: parsed });
  revalidatePath("/admin/portfolio");
}

export async function deletePortfolioItem(id: string) {
  await prisma.portfolioItem.delete({ where: { id } });
  revalidatePath("/admin/portfolio");
}

export async function toggleFeatured(id: string, featured: boolean) {
  await prisma.portfolioItem.update({ where: { id }, data: { featured } });
  revalidatePath("/admin/portfolio");
}

export async function movePortfolioItemUp(id: string) {
  const item = await prisma.portfolioItem.findUniqueOrThrow({ where: { id } });
  const prev = await prisma.portfolioItem.findFirst({
    where: { order: { lt: item.order } },
    orderBy: { order: "desc" },
  });
  if (!prev) return;

  await prisma.$transaction([
    prisma.portfolioItem.update({ where: { id: item.id }, data: { order: prev.order } }),
    prisma.portfolioItem.update({ where: { id: prev.id }, data: { order: item.order } }),
  ]);
  revalidatePath("/admin/portfolio");
}

export async function movePortfolioItemDown(id: string) {
  const item = await prisma.portfolioItem.findUniqueOrThrow({ where: { id } });
  const next = await prisma.portfolioItem.findFirst({
    where: { order: { gt: item.order } },
    orderBy: { order: "asc" },
  });
  if (!next) return;

  await prisma.$transaction([
    prisma.portfolioItem.update({ where: { id: item.id }, data: { order: next.order } }),
    prisma.portfolioItem.update({ where: { id: next.id }, data: { order: item.order } }),
  ]);
  revalidatePath("/admin/portfolio");
}
```

- [ ] **Step 2: Verify the build passes**

```bash
pnpm build
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add "src/app/admin/(protected)/portfolio/actions.ts"
git commit -m "Add PortfolioItem Server Actions (CRUD, toggle, reorder)"
```

---

### Task 3: Portfolio admin UI

**Files:**
- Create: `src/app/admin/(protected)/portfolio/page.tsx`
- Create: `src/app/admin/(protected)/portfolio/portfolio-form-dialog.tsx`
- Create: `src/app/admin/(protected)/portfolio/portfolio-table.tsx`
- Modify: `src/app/admin/(protected)/layout.tsx` (add a nav link to Portfolio)

**Interfaces:**
- Consumes: Task 2's actions; `MultiImageUpload` from Task 1; shadcn `Table`/`Dialog`/`Switch`/`Textarea`/`AlertDialog`/`Button`/`Input`/`Label`/`Badge`.
- Produces: the `/admin/portfolio` route.

- [ ] **Step 1: Write the form dialog**

Create `src/app/admin/(protected)/portfolio/portfolio-form-dialog.tsx`:

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
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MultiImageUpload } from "@/components/admin/image-upload";
import { createPortfolioItem, updatePortfolioItem } from "./actions";
import type { PortfolioItem } from "@prisma/client";

export function PortfolioFormDialog({
  item,
  variant = "default",
  size = "default",
  children,
}: {
  item?: PortfolioItem;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<string[]>(item?.images ?? []);

  const action = item ? updatePortfolioItem.bind(null, item.id) : createPortfolioItem;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant, size })}>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? "Edit project" : "Add project"}</DialogTitle>
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
            <Input id="title" name="title" defaultValue={item?.title} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={item?.description}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input id="tags" name="tags" defaultValue={item?.tags.join(", ")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="externalLink">External link</Label>
            <Input
              id="externalLink"
              name="externalLink"
              type="url"
              defaultValue={item?.externalLink ?? ""}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label>Images</Label>
            <input type="hidden" name="images" value={JSON.stringify(images)} />
            <MultiImageUpload value={images} onChange={setImages} />
          </div>
          <Button type="submit" className="w-full">
            {item ? "Save changes" : "Add project"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Write the table**

Create `src/app/admin/(protected)/portfolio/portfolio-table.tsx`:

```tsx
"use client";

import Image from "next/image";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { PortfolioFormDialog } from "./portfolio-form-dialog";
import {
  deletePortfolioItem,
  movePortfolioItemDown,
  movePortfolioItemUp,
  toggleFeatured,
} from "./actions";
import type { PortfolioItem } from "@prisma/client";

export function PortfolioTable({ items }: { items: PortfolioItem[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Image</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Tags</TableHead>
          <TableHead>Featured</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item, index) => (
          <TableRow key={item.id}>
            <TableCell className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                disabled={index === 0}
                onClick={() => movePortfolioItemUp(item.id)}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={index === items.length - 1}
                onClick={() => movePortfolioItemDown(item.id)}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </TableCell>
            <TableCell>
              {item.images[0] && (
                <div className="relative h-10 w-10 overflow-hidden rounded-md border">
                  <Image src={item.images[0]} alt="" fill className="object-cover" />
                </div>
              )}
            </TableCell>
            <TableCell>{item.title}</TableCell>
            <TableCell className="flex flex-wrap gap-1">
              {item.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </TableCell>
            <TableCell>
              <Switch
                checked={item.featured}
                onCheckedChange={(checked) => toggleFeatured(item.id, checked)}
              />
            </TableCell>
            <TableCell className="flex justify-end gap-2">
              <PortfolioFormDialog
                key={`${item.id}-${item.updatedAt.toISOString()}`}
                item={item}
                variant="outline"
                size="icon"
              >
                <Pencil className="h-4 w-4" />
              </PortfolioFormDialog>
              <AlertDialog>
                <AlertDialogTrigger
                  className={buttonVariants({ variant: "outline", size: "icon" })}
                >
                  <Trash2 className="h-4 w-4" />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this project?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes &quot;{item.title}&quot; permanently.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deletePortfolioItem(item.id)}>
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

Create `src/app/admin/(protected)/portfolio/page.tsx`:

```tsx
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PortfolioFormDialog } from "./portfolio-form-dialog";
import { PortfolioTable } from "./portfolio-table";

export default async function PortfolioPage() {
  const items = await prisma.portfolioItem.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Portfolio</h1>
        <PortfolioFormDialog>
          <Plus className="mr-2 h-4 w-4" />
          Add project
        </PortfolioFormDialog>
      </div>
      <PortfolioTable items={items} />
    </div>
  );
}
```

- [ ] **Step 4: Add the nav link**

In `src/app/admin/(protected)/layout.tsx`, add after the Services link:

```tsx
        <a
          href="/admin/portfolio"
          className="text-muted-foreground hover:text-foreground"
        >
          Portfolio
        </a>
```

- [ ] **Step 5: Verify the build passes**

```bash
pnpm build
```

Expected: exits 0, route list includes `/admin/portfolio`.

- [ ] **Step 6: Browser walkthrough**

Start `pnpm dev`, sign in, then:

1. Go to `/admin/portfolio`. Expected: the 2 seeded placeholder projects listed, each with tags as badges, featured toggle matching seed data (first one on, second off).
2. Click "Add project", fill in title/description/tags, upload an image (any small PNG/JPEG you have, or skip and submit without one), submit. Expected: dialog closes, new row appears with the uploaded image thumbnail (if provided) and tags as badges.
3. Reorder it up, confirm the swap.
4. Edit it — confirm current values (including uploaded image and tags) are pre-filled correctly, change the title, save.
5. Toggle featured off/on, refresh the page, confirm it persisted.
6. Delete it via confirm dialog.
7. Check the browser's dev-tools Network tab or just view-source the image thumbnail's `src` — confirm it loads from `/uploads/...` with a 200 (not broken).

Fix anything that doesn't match before proceeding.

- [ ] **Step 7: Commit**

```bash
git add "src/app/admin/(protected)/portfolio" "src/app/admin/(protected)/layout.tsx"
git commit -m "Add Portfolio admin CRUD UI"
```
