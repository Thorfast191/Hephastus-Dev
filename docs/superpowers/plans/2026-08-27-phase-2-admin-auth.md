# Phase 2: Admin Auth Flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working login page at `/admin/login`, a protected `/admin` section that redirects unauthenticated visitors to it, and a sign-out control — using the Auth.js v5 Credentials wiring from Phase 0 and the `AdminUser` seeded in Phase 1.

**Architecture:** `/admin/login` is a sibling route, not wrapped by the protected layout (avoids a redirect loop). Everything else under `/admin` lives in an `(protected)` route group whose `layout.tsx` calls `auth()` server-side and redirects to `/admin/login` if there's no session — route groups don't add a path segment, so `src/app/admin/(protected)/page.tsx` still serves `/admin`. Login uses the documented Next.js + Auth.js v5 pattern: a client form bound to a server action via `useActionState`, so there's no client-side fetch/redirect juggling.

**Tech Stack:** Same as Phase 0/1, plus three more shadcn/ui components (`input`, `label`, `card`).

**Spec:** `docs/superpowers/specs/2026-08-25-agency-website-design.md`

## Global Constraints

- Prisma pinned to 6.19.3; always `pnpm exec prisma`, never `pnpm dlx prisma` (established Phase 0).
- No public registration route exists anywhere in the app, ever — the only admin account is the one seeded via `pnpm seed:admin` (Phase 1).
- Auth.js v5 (`next-auth@beta`), Credentials provider, JWT sessions (established Phase 0) — `auth()`, `signIn`, `signOut`, `handlers` all exported from `src/auth.ts`.
- No test suite in v1 — verification here is `pnpm build` plus an actual browser walkthrough of the login → dashboard → logout flow (this phase is UI-facing, so a browser check is required, not optional).
- Working directly on `main`, committing per task.

---

### Task 1: Add the remaining shadcn/ui components

**Files:**
- Create: `src/components/ui/input.tsx`, `src/components/ui/label.tsx`, `src/components/ui/card.tsx` (and whatever shared files the shadcn CLI updates, e.g. `src/app/globals.css` if it adds new theme tokens)

**Interfaces:**
- Consumes: the shadcn/ui setup from Phase 0 (`components.json`, `cn()` in `src/lib/utils.ts`).
- Produces: `Input`, `Label`, `Card`/`CardHeader`/`CardTitle`/`CardDescription`/`CardContent` components under `@/components/ui/*`, used by Task 2's login form.

- [ ] **Step 1: Add the components**

```bash
pnpm dlx shadcn@latest add input label card -y
```

- [ ] **Step 2: Verify the build still passes**

```bash
pnpm build
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "Add input, label, and card shadcn/ui components"
```

---

### Task 2: Login page and authenticate server action

**Files:**
- Create: `src/app/admin/login/page.tsx`
- Create: `src/app/admin/login/login-form.tsx`
- Create: `src/app/admin/login/actions.ts`

**Interfaces:**
- Consumes: `signIn` from `@/auth` (Phase 0); `Input`, `Label`, `Card*`, `Button` from `@/components/ui/*`.
- Produces: the `/admin/login` route. Task 3's protected layout redirects here on no session.

- [ ] **Step 1: Write the server action**

Create `src/app/admin/login/actions.ts`:

```ts
"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export async function authenticate(
  _prevState: string | undefined,
  formData: FormData
) {
  try {
    await signIn("credentials", formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid email or password.";
        default:
          return "Something went wrong.";
      }
    }
    throw error;
  }
}
```

- [ ] **Step 2: Write the login form client component**

Create `src/app/admin/login/login-form.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authenticate } from "./actions";

export function LoginForm() {
  const [errorMessage, formAction, isPending] = useActionState(
    authenticate,
    undefined
  );

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Admin sign in</CardTitle>
        <CardDescription>Sign in to manage site content.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="redirectTo" value="/admin" />
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          {errorMessage && (
            <p className="text-sm text-destructive">{errorMessage}</p>
          )}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Write the page**

Create `src/app/admin/login/page.tsx`:

```tsx
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <LoginForm />
    </div>
  );
}
```

- [ ] **Step 4: Verify the build passes**

```bash
pnpm build
```

Expected: exits 0, and the route list includes `/admin/login`.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/login
git commit -m "Add admin login page and authenticate server action"
```

---

### Task 3: Protected layout, sign-out, and dashboard placeholder

**Files:**
- Create: `src/app/admin/(protected)/layout.tsx`
- Create: `src/app/admin/(protected)/page.tsx`

**Interfaces:**
- Consumes: `auth`, `signOut` from `@/auth` (Phase 0); `Button` from `@/components/ui/button`; the `/admin/login` route from Task 2.
- Produces: the protected `/admin` route tree that every later admin-CRUD phase (3+) adds pages into, as siblings of this `page.tsx` inside the same `(protected)` route group.

- [ ] **Step 1: Write the protected layout**

Create `src/app/admin/(protected)/layout.tsx`:

```tsx
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="flex items-center justify-between border-b bg-background px-6 py-4">
        <span className="font-medium">Admin</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {session.user?.email}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/admin/login" });
            }}
          >
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Write the dashboard placeholder page**

Create `src/app/admin/(protected)/page.tsx`:

```tsx
import { auth } from "@/auth";

export default async function AdminDashboardPage() {
  const session = await auth();

  return (
    <div>
      <h1 className="text-2xl font-semibold">
        Welcome, {session?.user?.name}
      </h1>
      <p className="mt-2 text-muted-foreground">
        The dashboard will show recent leads and meetings once those
        features are built.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Verify the build passes**

```bash
pnpm build
```

Expected: exits 0, and the route list includes `/admin` alongside `/admin/login`.

- [ ] **Step 4: Browser walkthrough of the full flow**

Start the dev server (`pnpm dev`) and, using an actual browser (not curl — this is UI behavior):

1. Visit `/admin` while logged out. Expected: redirected to `/admin/login`.
2. Submit the login form with a wrong password (use the admin email seeded in Phase 1, any wrong password). Expected: "Invalid email or password." shown, still on `/admin/login`.
3. Submit the login form with the correct seeded admin credentials. Expected: redirected to `/admin`, showing "Welcome, Test Admin" (or whatever `--name` was used in Phase 1's seed) and the admin's email in the header.
4. Click "Sign out". Expected: redirected to `/admin/login`.
5. Visit `/admin` again. Expected: redirected to `/admin/login` again (session actually cleared, not just UI-hidden).

Fix anything that doesn't match before proceeding — this is the actual feature working, not just a type-checked build.

- [ ] **Step 5: Commit**

```bash
git add "src/app/admin/(protected)"
git commit -m "Add protected admin layout with sign-out and dashboard placeholder"
```
