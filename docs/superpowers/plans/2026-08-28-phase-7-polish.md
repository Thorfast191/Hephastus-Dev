# Phase 7: Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the pieces Phase 6 deliberately deferred: a distinct color/typography identity (not default shadcn gray), dark mode, scroll-in animations, and the remaining SEO surface (OG image, `sitemap.xml`, `robots.txt`).

**Architecture:** The color/typography identity is a token-level change in `globals.css` + one new Google Font, so every component built in Phases 1-6 (admin and public alike) picks it up automatically through the existing shadcn CSS-variable system — no per-component rewrites needed for color. Dark mode is `next-themes`'s standard `class`-strategy toggle over the `.dark` block already defined in `globals.css`. Scroll-in animation is one small reusable Framer Motion wrapper (`Reveal`) that public section components opt into individually. SEO extras use Next.js's built-in file conventions (`opengraph-image.tsx`, `sitemap.ts`, `robots.ts`) rather than hand-rolled meta tags.

**Tech Stack:** `next-themes` 0.4.6, `framer-motion` 13.1.1, Next.js 15's `next/og` (`ImageResponse`, built in, no install), existing Google Fonts via `next/font/google`.

**Spec:** `docs/superpowers/specs/2026-08-25-agency-website-design.md` (see "Public site" section)

## Global Constraints

- Package manager: `pnpm`. Always `pnpm exec prisma`, never `pnpm dlx prisma`.
- `pnpm build` and `pnpm dev` must not run concurrently against the same `.next` directory (established in Phase 6 — corrupts the dev server's build manifest). Stop the dev server before `pnpm build`; `rm -rf .next` and restart `pnpm dev` before any browser verification step.
- `lucide-react` 1.34.0 has no brand/logo icons (confirmed in Phase 6) — this phase's `ThemeToggle` uses the generic `Sun`/`Moon` icons, which do exist.
- **Scope decision, made in this plan:** the new color palette is applied at the global CSS-variable level (`:root`/`.dark` in `globals.css`), which every shadcn-based component reads from — including the admin CMS, not only the public site. This is deliberate: maintaining two parallel token systems (one for `/admin`, one for `/`) would be real extra complexity for no benefit the spec asks for, and a consistent brand color between a product and its own admin tool is normal. Likewise, `next-themes`'s `ThemeProvider` wraps the whole app in `layout.tsx`, so a visitor's OS-level dark-mode preference (`defaultTheme="system"`) will also apply to `/admin/*` pages automatically, even though this plan only adds a visible toggle *button* to the public `SiteNav` — that's an accepted side effect, not a bug.
- The root layout's static fallback `metadata` (`title: "Create Next App"`) is left untouched — it only ever surfaces on `/admin/*` routes (which have no `generateMetadata` of their own and aren't a public/indexed surface), and fixing it isn't part of this or any other phase's spec.
- `next/og`'s `ImageResponse` needs the Node.js runtime (not the default Edge runtime) wherever the route reads from Prisma, since Prisma's query engine isn't Edge-compatible — set `export const runtime = "nodejs"` on `opengraph-image.tsx`.

---

### Task 1: Color palette and typography identity

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Modify: `src/components/public/site-nav.tsx`
- Modify: `src/components/public/hero.tsx`
- Modify: `src/components/public/services-section.tsx`
- Modify: `src/components/public/portfolio-section.tsx`
- Modify: `src/components/public/process-section.tsx`
- Modify: `src/components/public/testimonials-section.tsx`
- Modify: `src/components/public/team-section.tsx`
- Modify: `src/components/public/contact-section.tsx`

**Interfaces:**
- Consumes: nothing from earlier phases beyond what's already in each file.
- Produces: a `--font-heading` CSS variable (already referenced by the existing `@theme inline` block, now pointed at a real distinct font instead of aliasing `--font-sans`) and a `font-heading` Tailwind utility class, both consumed by Task 2's `ThemeToggle` placement inside `SiteNav` (no dependency, just shares the file) and available to Task 3/4 if needed.

- [ ] **Step 1: Replace the color tokens and wire the heading font variable**

In `src/app/globals.css`, change the `--font-heading` line inside `@theme inline`:

```css
  --font-heading: var(--font-heading);
```

Replace the entire `:root { ... }` block with:

```css
:root {
  --background: oklch(0.99 0.004 285);
  --foreground: oklch(0.16 0.02 285);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.16 0.02 285);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.16 0.02 285);
  --primary: oklch(0.5 0.21 285);
  --primary-foreground: oklch(0.98 0.01 285);
  --secondary: oklch(0.95 0.015 285);
  --secondary-foreground: oklch(0.25 0.03 285);
  --muted: oklch(0.96 0.01 285);
  --muted-foreground: oklch(0.5 0.02 285);
  --accent: oklch(0.94 0.03 285);
  --accent-foreground: oklch(0.25 0.03 285);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.9 0.015 285);
  --input: oklch(0.9 0.015 285);
  --ring: oklch(0.6 0.18 285);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --radius: 0.5rem;
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}
```

Replace the entire `.dark { ... }` block with:

```css
.dark {
  --background: oklch(0.145 0.01 285);
  --foreground: oklch(0.97 0.006 285);
  --card: oklch(0.19 0.015 285);
  --card-foreground: oklch(0.97 0.006 285);
  --popover: oklch(0.19 0.015 285);
  --popover-foreground: oklch(0.97 0.006 285);
  --primary: oklch(0.72 0.17 285);
  --primary-foreground: oklch(0.15 0.02 285);
  --secondary: oklch(0.26 0.02 285);
  --secondary-foreground: oklch(0.95 0.01 285);
  --muted: oklch(0.24 0.015 285);
  --muted-foreground: oklch(0.68 0.02 285);
  --accent: oklch(0.28 0.03 285);
  --accent-foreground: oklch(0.95 0.01 285);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.65 0.16 285);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}
```

- [ ] **Step 2: Load the heading font**

In `src/app/layout.tsx`, add a `Space_Grotesk` import and variable, and add its class to `<body>`:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
```

(This step names the font's CSS variable `--font-heading` directly, which is why Step 1 only needed `--font-heading: var(--font-heading);` inside `@theme inline` — Tailwind v4's `@theme` block re-exposes whatever custom property already carries that name as a `font-heading` utility class.)

- [ ] **Step 3: Apply the heading font across public sections**

In `src/components/public/site-nav.tsx`, add `font-heading` to the brand link's className:

```tsx
        <a href="#top" className="font-heading text-lg font-semibold">
          {agencyName}
        </a>
```

In `src/components/public/hero.tsx`, add `font-heading` to the `<h1>`:

```tsx
      <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">{agencyName}</h1>
```

In `src/components/public/services-section.tsx`, add `font-heading` to the `<h2>` and to `CardTitle`:

```tsx
      <h2 className="font-heading text-3xl font-semibold">Services</h2>
```

```tsx
                <CardTitle className="font-heading mt-2">{service.title}</CardTitle>
```

In `src/components/public/portfolio-section.tsx`, add `font-heading` to the `<h2>` and to `CardTitle`:

```tsx
        <h2 className="font-heading text-3xl font-semibold">Portfolio</h2>
```

```tsx
                <CardTitle className="font-heading">{item.title}</CardTitle>
```

In `src/components/public/process-section.tsx`, add `font-heading` to the `<h2>` and the step `<h3>`:

```tsx
      <h2 className="font-heading text-3xl font-semibold">How we work</h2>
```

```tsx
            <h3 className="font-heading mt-2 text-lg font-semibold">{step.title}</h3>
```

In `src/components/public/testimonials-section.tsx`, add `font-heading` to the `<h2>`:

```tsx
        <h2 className="font-heading text-3xl font-semibold">What clients say</h2>
```

In `src/components/public/team-section.tsx`, add `font-heading` to the `<h2>` and to `CardTitle`:

```tsx
      <h2 className="font-heading text-3xl font-semibold">Team</h2>
```

```tsx
              <CardTitle className="font-heading">{member.name}</CardTitle>
```

In `src/components/public/contact-section.tsx`, add `font-heading` to the `<h2>` and both `<h3>`s:

```tsx
      <h2 className="font-heading text-3xl font-semibold">Get in touch</h2>
```

```tsx
          <h3 className="font-heading text-lg font-medium">Send a message</h3>
```

```tsx
          <h3 className="font-heading text-lg font-medium">Book a meeting</h3>
```

`Footer` is deliberately left on the body font — footers read calmer in a plain sans, and it's a stylistic choice, not an oversight.

- [ ] **Step 4: Verify build**

Stop the dev server if running (see Global Constraints), then:

Run: `pnpm build`
Expected: succeeds with no type errors.

- [ ] **Step 5: Browser verification**

Restart the dev server (`rm -rf .next` then `pnpm dev`, wait for ready). Navigate to `http://localhost:3001/`. Confirm: the page no longer looks like default grayscale shadcn — buttons, the active nav-day highlight in the scheduler, and card borders should show the new indigo-violet primary color; headings (`h1`/`h2`/`h3`/card titles) render in the distinct Space Grotesk font, visibly different from the body copy. Navigate to `/admin` and confirm the admin CMS picked up the same primary color (expected per this plan's Global Constraints, not a bug).

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx src/components/public/site-nav.tsx src/components/public/hero.tsx src/components/public/services-section.tsx src/components/public/portfolio-section.tsx src/components/public/process-section.tsx src/components/public/testimonials-section.tsx src/components/public/team-section.tsx src/components/public/contact-section.tsx
git commit -m "Replace default shadcn palette with a distinct color and typography identity"
```

---

### Task 2: Dark mode

**Files:**
- Create: `src/components/theme-provider.tsx`
- Create: `src/components/public/theme-toggle.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/components/public/site-nav.tsx`

**Interfaces:**
- Consumes: the `.dark` CSS block from Task 1 (already present in `globals.css` from the original scaffold, repainted with new tokens in Task 1).
- Produces: `<ThemeProvider>` (wraps `RootLayout`'s children), `<ThemeToggle />` (mounted in `SiteNav`, no props).

- [ ] **Step 1: Install next-themes**

```bash
pnpm add next-themes
```

- [ ] **Step 2: Write the theme provider wrapper**

`src/components/theme-provider.tsx`:

```tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

- [ ] **Step 3: Wire it into the root layout**

Edit `src/app/layout.tsx`: add the import, add `suppressHydrationWarning` to `<html>` (required by next-themes — it sets `class`/`style` on `<html>` before hydration, and this prop is the documented way to suppress the resulting benign mismatch warning), and wrap `children`:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Write the theme toggle**

`src/components/public/theme-toggle.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <Button variant="ghost" size="icon" aria-label="Toggle theme" />;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
```

(The `mounted` guard is required: the server can't know the client's stored/system theme preference, so rendering the sun/moon icon before mount would itself cause a hydration mismatch — this pattern avoids that rather than relying on `suppressHydrationWarning` a second time.)

- [ ] **Step 5: Mount the toggle in the nav**

Edit `src/components/public/site-nav.tsx` to import and render `ThemeToggle` alongside the links:

```tsx
import { ThemeToggle } from "./theme-toggle";

const LINKS = [
  { href: "#services", label: "Services" },
  { href: "#portfolio", label: "Portfolio" },
  { href: "#team", label: "Team" },
  { href: "#contact", label: "Contact" },
];

export function SiteNav({ agencyName }: { agencyName: string }) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <a href="#top" className="font-heading text-lg font-semibold">
          {agencyName}
        </a>
        <div className="flex flex-wrap items-center gap-6 text-sm">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
```

- [ ] **Step 6: Verify build**

Stop the dev server if running, then:

Run: `pnpm build`
Expected: succeeds with no type errors.

- [ ] **Step 7: Browser verification**

Restart the dev server. Navigate to `http://localhost:3001/`. Click the theme toggle icon in the nav; confirm the whole page (background, cards, text) switches to the dark palette from Task 1 and the icon swaps from moon to sun. Reload the page and confirm the chosen theme persists (next-themes stores it in `localStorage`).

- [ ] **Step 8: Commit**

```bash
git add src/components/theme-provider.tsx src/components/public/theme-toggle.tsx src/app/layout.tsx src/components/public/site-nav.tsx package.json pnpm-lock.yaml
git commit -m "Add dark mode via next-themes"
```

---

### Task 3: Scroll-in animations

**Files:**
- Create: `src/components/public/reveal.tsx`
- Modify: `src/components/public/hero.tsx`
- Modify: `src/components/public/services-section.tsx`
- Modify: `src/components/public/portfolio-section.tsx`
- Modify: `src/components/public/process-section.tsx`
- Modify: `src/components/public/testimonials-section.tsx`
- Modify: `src/components/public/team-section.tsx`
- Modify: `src/components/public/contact-section.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `<Reveal>{children}</Reveal>` — a client-only fade/slide-up wrapper, used by every public section.

- [ ] **Step 1: Install framer-motion**

```bash
pnpm add framer-motion
```

- [ ] **Step 2: Write the reveal wrapper**

`src/components/public/reveal.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function Reveal({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
```

A Server Component may still render this Client Component and pass server-rendered JSX as its `children` — that's standard Next.js App Router composition, not a client/server boundary violation, so every section below stays a Server Component itself.

- [ ] **Step 3: Wrap each section's content**

In `src/components/public/hero.tsx`, wrap the inner content in `Reveal` (keep the `<section>` element itself outside, since it carries the `id="top"` scroll anchor):

```tsx
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "./reveal";

export function Hero({
  agencyName,
  tagline,
}: {
  agencyName: string;
  tagline: string;
}) {
  return (
    <section id="top" className="mx-auto max-w-4xl px-6 py-24 text-center">
      <Reveal>
        <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">
          {agencyName}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{tagline}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <a href="#portfolio" className={buttonVariants({ size: "lg" })}>
            View our work
          </a>
          <a href="#contact" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Get in touch
          </a>
        </div>
      </Reveal>
    </section>
  );
}
```

Apply the same pattern to the remaining five section components — import `Reveal` from `./reveal` and wrap everything currently inside the outer `<section>`/wrapper `<div>` (keep the `id`-bearing element itself outside `Reveal`, since Framer Motion's `initial={{ opacity: 0 }}` would otherwise hide the scroll-anchor target itself before it animates in, which is harmless functionally but looks odd if a nav click lands on a still-fading-in section):

- `services-section.tsx`: keep `<section id="services">` outside, wrap the `<h2>` + grid `<div>` in `Reveal`.
- `portfolio-section.tsx`: keep the outer `<section id="portfolio">` outside, wrap the inner `<div className="mx-auto max-w-5xl px-6">` in `Reveal`.
- `process-section.tsx`: keep `<section id="process">` outside, wrap the `<h2>` + grid `<div>` in `Reveal`.
- `testimonials-section.tsx`: keep the outer `<section id="testimonials">` outside, wrap the inner `<div className="mx-auto max-w-5xl px-6">` in `Reveal`.
- `team-section.tsx`: keep `<section id="team">` outside, wrap the `<h2>` + grid `<div>` in `Reveal`.
- `contact-section.tsx`: keep `<section id="contact">` outside, wrap the `<h2>` + grid `<div>` in `Reveal`.

- [ ] **Step 4: Verify build**

Stop the dev server if running, then:

Run: `pnpm build`
Expected: succeeds with no type errors.

- [ ] **Step 5: Browser verification**

Restart the dev server. Navigate to `http://localhost:3001/` and scroll slowly from top to bottom. Confirm each section fades and slides up into place the first time it enters the viewport, and does not re-animate when scrolling back up and down again past an already-revealed section (`viewport={{ once: true }}`).

- [ ] **Step 6: Commit**

```bash
git add src/components/public/reveal.tsx src/components/public/hero.tsx src/components/public/services-section.tsx src/components/public/portfolio-section.tsx src/components/public/process-section.tsx src/components/public/testimonials-section.tsx src/components/public/team-section.tsx src/components/public/contact-section.tsx package.json pnpm-lock.yaml
git commit -m "Add scroll-in reveal animations to public sections"
```

---

### Task 4: SEO — OG image, sitemap, robots.txt

**Files:**
- Create: `src/app/opengraph-image.tsx`
- Create: `src/app/sitemap.ts`
- Create: `src/app/robots.ts`
- Modify: `src/app/layout.tsx`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `prisma` from `@/lib/prisma`.
- Produces: `GET /opengraph-image` (PNG), `GET /sitemap.xml`, `GET /robots.txt` — all Next.js file-convention routes, nothing else in the app calls these directly.

- [ ] **Step 1: Add a SITE_URL env var**

Add to `.env.example` (after the existing `SMTP_*` lines):

```
SITE_URL="http://localhost:3000"
```

- [ ] **Step 2: Set metadataBase in the root layout**

Edit `src/app/layout.tsx` to add `metadataBase` to the `metadata` export, so relative OG image URLs resolve to absolute ones instead of Next.js falling back to a warning-triggering default:

```tsx
export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: "Create Next App",
  description: "Generated by create next app",
};
```

- [ ] **Step 3: Write the OG image route**

`src/app/opengraph-image.tsx`:

```tsx
import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const alt = "Agency";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const settings = await prisma.siteSettings.findFirst();
  const agencyName = settings?.agencyName ?? "Agency";
  const tagline = settings?.tagline ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1a1530",
          color: "#f5f3ff",
          padding: "80px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 700, display: "flex" }}>{agencyName}</div>
        {tagline && (
          <div style={{ fontSize: 32, marginTop: 24, color: "#c4b5fd", display: "flex" }}>
            {tagline}
          </div>
        )}
      </div>
    ),
    { ...size }
  );
}
```

`runtime = "nodejs"` is required here specifically because this route queries Prisma — `next/og`'s `ImageResponse` defaults to the Edge runtime, and Prisma's query engine is not Edge-compatible.

- [ ] **Step 4: Write the sitemap**

`src/app/sitemap.ts`:

```tsx
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.SITE_URL ?? "http://localhost:3000";
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
```

- [ ] **Step 5: Write robots.txt**

`src/app/robots.ts`:

```tsx
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.SITE_URL ?? "http://localhost:3000";
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
```

- [ ] **Step 6: Add SITE_URL to the local .env**

Check whether `.env` already defines `SITE_URL`; if not, append `SITE_URL="http://localhost:3001"` (matching this project's actual dev port) so `metadataBase` resolves correctly for local browser verification in Step 8.

- [ ] **Step 7: Verify build**

Stop the dev server if running, then:

Run: `pnpm build`
Expected: succeeds with no type errors. Confirm the route list includes `/opengraph-image`, `/sitemap.xml`, and `/robots.txt`.

- [ ] **Step 8: Browser verification**

Restart the dev server. Fetch each new route directly:

```bash
curl -s -o /tmp/og-check.png -w "%{http_code} %{content_type}\n" http://localhost:3001/opengraph-image
curl -s http://localhost:3001/sitemap.xml
curl -s http://localhost:3001/robots.txt
```

Expected: the OG image request returns `200 image/png` (open `/tmp/og-check.png` to visually confirm it shows the seeded agency name and tagline on the dark violet background); the sitemap XML contains one `<url>` entry for the site root; robots.txt allows all user agents and references the sitemap URL.

- [ ] **Step 9: Commit**

```bash
git add src/app/opengraph-image.tsx src/app/sitemap.ts src/app/robots.ts src/app/layout.tsx .env.example .env
git commit -m "Add OG image, sitemap.xml, and robots.txt"
```

---

## Phase 7 completion

After Task 4's commit, the public site has its own visual identity, dark mode, scroll-in motion, and a complete SEO surface. Per the standing "complete all the phases" instruction, proceed to Phase 8 (deployment docs: `DEPLOY.md`, `docker-compose.yml`, PM2 `ecosystem.config.js`, Nginx config, backup cron) — write Phase 8's plan next. This is also the final phase, so Phase 8's plan should note that its own completion is the project's completion.
