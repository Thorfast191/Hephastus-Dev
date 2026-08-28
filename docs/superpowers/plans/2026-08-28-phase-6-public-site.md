# Phase 6: Public Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the temporary homepage (a bare `ContactForm` + `Scheduler` used for testability in Phases 4-5b) with the full single-page public site — Hero, Services, Portfolio, Process, Testimonials, Team, Contact, Footer — reading live data from the database.

**Architecture:** `src/app/page.tsx` becomes a Server Component that fetches `SiteSettings`, `Service`, `PortfolioItem`, `Testimonial`, and `TeamMember` in parallel via Prisma and renders one presentational section component per spec section, in the spec's fixed order. Each section component is a plain (mostly server-rendered) component that takes its slice of data as props — no client-side data fetching except inside the already-existing `ContactForm`/`Scheduler` client components, which this phase wraps unchanged inside a new `ContactSection`.

**Tech Stack:** Next.js 15 Server Components, Prisma 6.19.3, shadcn/ui (Base UI) `Card`/`Badge` components, `next/image` for local `/uploads` photos, lucide-react icons.

**Spec:** `docs/superpowers/specs/2026-08-25-agency-website-design.md` (see "Public site" section)

## Global Constraints

- Package manager: `pnpm`. Always `pnpm exec prisma`, never `pnpm dlx prisma`.
- shadcn/ui components in this project are built on **Base UI**, not Radix (relevant if this plan's execution touches any `Select`/`Dialog` — it doesn't; this phase is read-only presentational components).
- **Phase split decision, made in this plan:** the design spec's "Public site" bullet list mentions dark mode (`next-themes`), scroll-in animations (Framer Motion), and a "distinct color/type system, not default shadcn styling" in the same breath — but the *same spec document* also says the visual identity is "finalized during the polish phase, not blocking the schema or backend work," and the original build order names phases "6-Public site pulling live data" vs. "7-Polish (animations/SEO)" as two distinct steps. This plan resolves that in favor of the phase split: Phase 6 delivers every section, wired to live data, structurally complete and reasonably responsive, using the existing default shadcn/Tailwind styling (no custom palette, no dark mode toggle, no Framer Motion). Phase 7 delivers the distinct visual identity, dark mode, scroll-in animations, OG image, and `sitemap.xml`/`robots.txt`. Smooth-scroll anchor navigation and a basic `generateMetadata` sourced from `SiteSettings` are included in this phase (Task 4) since they cost almost nothing once the page's section structure exists and are near-inseparable from building `page.tsx` correctly.
- `PortfolioItem` has no `active` boolean field (only `Service` and `TeamMember` do) — the portfolio query is not filtered by an active flag, only ordered.
- Local `/uploads/<file>` image paths (from `ImageUpload`/`MultiImageUpload`, stored on `PortfolioItem.images`, `Testimonial.photo`, `TeamMember.photo`) are rendered via `next/image` with `fill` and no `sizes` prop, matching the existing pattern already used in `src/components/admin/image-upload.tsx` — no `next.config.ts` changes needed since these are same-origin relative paths, not external domains.
- Icon rendering for `Service.icon` reuses the exact lookup pattern from `src/components/admin/icon-picker.tsx`: `Icons[value as keyof typeof Icons] as Icons.LucideIcon`, with a fallback icon if the stored string somehow isn't a valid export (defensive, since the value originates from a fixed admin picker but the DB doesn't enforce the enum).
- `pnpm build` (production build) and `pnpm dev` must not run concurrently against the same `.next` directory — doing so mid-session corrupted the dev server's build manifest (`ENOENT` on `_buildManifest.js.tmp.*`) and required killing the dev process, deleting `.next`, and restarting. Going forward in this project: stop the dev server before `pnpm build`, then `rm -rf .next` and restart `pnpm dev` before any browser verification step.

---

### Task 1: Page chrome — nav, hero, footer

**Files:**
- Create: `src/components/public/site-nav.tsx`
- Create: `src/components/public/hero.tsx`
- Create: `src/components/public/footer.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `<SiteNav agencyName: string />`, `<Hero agencyName: string tagline: string />`, `<Footer settings: SiteSettings />` — all consumed by Task 4's `page.tsx` assembly.

- [ ] **Step 1: Write the site nav**

`src/components/public/site-nav.tsx`:

```tsx
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
        <a href="#top" className="font-semibold">
          {agencyName}
        </a>
        <div className="flex flex-wrap gap-6 text-sm">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>
      </nav>
    </header>
  );
}
```

- [ ] **Step 2: Write the hero**

`src/components/public/hero.tsx`:

```tsx
import { buttonVariants } from "@/components/ui/button";

export function Hero({
  agencyName,
  tagline,
}: {
  agencyName: string;
  tagline: string;
}) {
  return (
    <section id="top" className="mx-auto max-w-4xl px-6 py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{agencyName}</h1>
      <p className="mt-4 text-lg text-muted-foreground">{tagline}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <a href="#portfolio" className={buttonVariants({ size: "lg" })}>
          View our work
        </a>
        <a href="#contact" className={buttonVariants({ variant: "outline", size: "lg" })}>
          Get in touch
        </a>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Write the footer**

`src/components/public/footer.tsx`:

```tsx
import { Github, Linkedin, Twitter } from "lucide-react";
import type { SiteSettings } from "@prisma/client";

export function Footer({ settings }: { settings: SiteSettings }) {
  const socialLinks = (settings.socialLinks ?? {}) as {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };

  return (
    <footer id="footer" className="border-t">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="font-medium text-foreground">{settings.agencyName}</p>
          <p>
            <a href={`mailto:${settings.contactEmail}`} className="hover:text-foreground">
              {settings.contactEmail}
            </a>
            {" · "}
            <a href={`tel:${settings.contactPhone}`} className="hover:text-foreground">
              {settings.contactPhone}
            </a>
          </p>
        </div>
        <div className="flex items-center gap-4">
          {socialLinks.twitter && (
            <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" aria-label="Twitter">
              <Twitter className="h-4 w-4 hover:text-foreground" />
            </a>
          )}
          {socialLinks.linkedin && (
            <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <Linkedin className="h-4 w-4 hover:text-foreground" />
            </a>
          )}
          {socialLinks.github && (
            <a href={socialLinks.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub">
              <Github className="h-4 w-4 hover:text-foreground" />
            </a>
          )}
        </div>
      </div>
      <p className="border-t px-6 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {settings.agencyName}. All rights reserved.
      </p>
    </footer>
  );
}
```

- [ ] **Step 4: Add smooth-scroll for anchor navigation**

In `src/app/globals.css`, find the `@layer base { ... html { @apply font-sans; } }` block near the end of the file and add `scroll-behavior: smooth` alongside it:

```css
  html {
    @apply font-sans;
    scroll-behavior: smooth;
  }
```

- [ ] **Step 5: Verify build**

Run: `pnpm build`
Expected: succeeds with no type errors. (These components aren't imported anywhere yet, so this only checks they typecheck/lint in isolation — full rendering is verified in Task 4.)

- [ ] **Step 6: Commit**

```bash
git add src/components/public/site-nav.tsx src/components/public/hero.tsx src/components/public/footer.tsx src/app/globals.css
git commit -m "Add public site nav, hero, and footer components"
```

---

### Task 2: Services and Portfolio sections

**Files:**
- Create: `src/components/public/services-section.tsx`
- Create: `src/components/public/portfolio-section.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `<ServicesSection services: Service[] />`, `<PortfolioSection items: PortfolioItem[] />` — consumed by Task 4's `page.tsx` assembly.

- [ ] **Step 1: Write the services section**

`src/components/public/services-section.tsx`:

```tsx
import * as Icons from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Service } from "@prisma/client";

export function ServicesSection({ services }: { services: Service[] }) {
  if (services.length === 0) return null;

  return (
    <section id="services" className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="text-3xl font-semibold">Services</h2>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => {
          const Icon =
            (Icons[service.icon as keyof typeof Icons] as Icons.LucideIcon | undefined) ??
            Icons.Sparkles;
          return (
            <Card key={service.id}>
              <CardHeader>
                <Icon className="h-6 w-6 text-primary" />
                <CardTitle className="mt-2">{service.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {service.description}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Write the portfolio section**

`src/components/public/portfolio-section.tsx`:

```tsx
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PortfolioItem } from "@prisma/client";

export function PortfolioSection({ items }: { items: PortfolioItem[] }) {
  if (items.length === 0) return null;

  return (
    <section id="portfolio" className="bg-muted/30 py-16">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-3xl font-semibold">Portfolio</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id}>
              {item.images[0] && (
                <div className="relative h-48 w-full">
                  <Image src={item.images[0]} alt={item.title} fill className="object-cover" />
                </div>
              )}
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>{item.description}</p>
                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                {item.externalLink && (
                  <a
                    href={item.externalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-foreground hover:underline"
                  >
                    View project <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: succeeds with no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/public/services-section.tsx src/components/public/portfolio-section.tsx
git commit -m "Add public Services and Portfolio sections"
```

---

### Task 3: Process, Testimonials, and Team sections

**Files:**
- Create: `src/components/public/process-section.tsx`
- Create: `src/components/public/testimonials-section.tsx`
- Create: `src/components/public/team-section.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `<ProcessSection />` (no props — static content), `<TestimonialsSection testimonials: Testimonial[] />`, `<TeamSection members: TeamMember[] />` — consumed by Task 4's `page.tsx` assembly.

- [ ] **Step 1: Write the process section**

`src/components/public/process-section.tsx`:

```tsx
const STEPS = [
  {
    title: "Discover",
    description: "Understand your goals, constraints, and users before writing a line of code.",
  },
  {
    title: "Design",
    description: "Architect the solution and validate the approach with you before building.",
  },
  {
    title: "Build",
    description: "Iterative development with regular check-ins, not a black box until launch.",
  },
  {
    title: "Deliver",
    description: "Ship, support, and iterate based on how the product performs in the real world.",
  },
];

export function ProcessSection() {
  return (
    <section id="process" className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="text-3xl font-semibold">How we work</h2>
      <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, index) => (
          <div key={step.title}>
            <span className="text-sm font-medium text-muted-foreground">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Write the testimonials section**

`src/components/public/testimonials-section.tsx`:

```tsx
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import type { Testimonial } from "@prisma/client";

export function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  if (testimonials.length === 0) return null;

  return (
    <section id="testimonials" className="bg-muted/30 py-16">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-3xl font-semibold">What clients say</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.id}>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">&ldquo;{testimonial.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  {testimonial.photo && (
                    <div className="relative h-10 w-10 overflow-hidden rounded-full">
                      <Image
                        src={testimonial.photo}
                        alt={testimonial.authorName}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">{testimonial.authorName}</p>
                    {testimonial.company && (
                      <p className="text-xs text-muted-foreground">{testimonial.company}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Write the team section**

`src/components/public/team-section.tsx`:

```tsx
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TeamMember } from "@prisma/client";

export function TeamSection({ members }: { members: TeamMember[] }) {
  if (members.length === 0) return null;

  return (
    <section id="team" className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="text-3xl font-semibold">Team</h2>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => (
          <Card key={member.id}>
            {member.photo && (
              <div className="relative h-48 w-full">
                <Image src={member.photo} alt={member.name} fill className="object-cover" />
              </div>
            )}
            <CardHeader>
              <CardTitle>{member.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{member.role}</p>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{member.bio}</CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: succeeds with no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/public/process-section.tsx src/components/public/testimonials-section.tsx src/components/public/team-section.tsx
git commit -m "Add public Process, Testimonials, and Team sections"
```

---

### Task 4: Contact section, page assembly, and metadata

**Files:**
- Create: `src/components/public/contact-section.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `ContactForm` from `./contact-form` (existing), `Scheduler` from `./scheduler` (existing); all section components from Tasks 1-3.
- Produces: the final assembled `Home` page + `generateMetadata`. Nothing downstream consumes this — it's the last task.

- [ ] **Step 1: Write the contact section**

`src/components/public/contact-section.tsx`:

```tsx
import { ContactForm } from "./contact-form";
import { Scheduler } from "./scheduler";

export function ContactSection({
  services,
}: {
  services: { id: string; title: string }[];
}) {
  return (
    <section id="contact" className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="text-3xl font-semibold">Get in touch</h2>
      <div className="mt-8 grid gap-12 lg:grid-cols-2">
        <div>
          <h3 className="text-lg font-medium">Send a message</h3>
          <div className="mt-4">
            <ContactForm services={services} />
          </div>
        </div>
        <div>
          <h3 className="text-lg font-medium">Book a meeting</h3>
          <div className="mt-4">
            <Scheduler />
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Rewrite the homepage**

Replace `src/app/page.tsx` entirely:

```tsx
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { SiteNav } from "@/components/public/site-nav";
import { Hero } from "@/components/public/hero";
import { ServicesSection } from "@/components/public/services-section";
import { PortfolioSection } from "@/components/public/portfolio-section";
import { ProcessSection } from "@/components/public/process-section";
import { TestimonialsSection } from "@/components/public/testimonials-section";
import { TeamSection } from "@/components/public/team-section";
import { ContactSection } from "@/components/public/contact-section";
import { Footer } from "@/components/public/footer";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await prisma.siteSettings.findFirst();
  return {
    title: settings?.agencyName ?? "Agency",
    description: settings?.tagline ?? undefined,
  };
}

export default async function Home() {
  const [settings, services, portfolioItems, testimonials, teamMembers] = await Promise.all([
    prisma.siteSettings.findFirst(),
    prisma.service.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
    prisma.portfolioItem.findMany({ orderBy: { order: "asc" } }),
    prisma.testimonial.findMany({ orderBy: { order: "asc" } }),
    prisma.teamMember.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
  ]);

  if (!settings) {
    return (
      <div className="mx-auto max-w-md p-8">
        <p className="text-muted-foreground">
          Site settings have not been configured yet. Sign in to /admin/settings to get started.
        </p>
      </div>
    );
  }

  return (
    <>
      <SiteNav agencyName={settings.agencyName} />
      <main>
        <Hero agencyName={settings.agencyName} tagline={settings.tagline} />
        <ServicesSection services={services} />
        <PortfolioSection items={portfolioItems} />
        <ProcessSection />
        <TestimonialsSection testimonials={testimonials} />
        <TeamSection members={teamMembers} />
        <ContactSection services={services.map((s) => ({ id: s.id, title: s.title }))} />
      </main>
      <Footer settings={settings} />
    </>
  );
}
```

- [ ] **Step 3: Verify build**

Stop the running dev server first (`ps aux | grep "next dev" | grep "software agency"`, then `kill` the PID — see this plan's Global Constraints on why `pnpm build` and `pnpm dev` must not run concurrently against the same `.next` directory).

Run: `pnpm build`
Expected: succeeds with no type errors, no unused-import lint warnings. Confirm the route list shows `/` as `○ (Static)` or prerendered with `revalidate: 60` (ISR), not fully dynamic.

- [ ] **Step 4: Restart the dev server**

```bash
rm -rf .next
```

Then start `pnpm dev` in the background and wait for it to report ready on port 3001 before browser verification.

- [ ] **Step 5: Browser verification**

Using claude-in-chrome: navigate to `http://localhost:3001/`. Confirm, in order top to bottom: sticky nav with agency name and Services/Portfolio/Team/Contact links; Hero with agency name, tagline, and two CTA buttons; Services grid showing the 7 seeded services with icons; Portfolio grid showing the 2 seeded placeholder projects with their tags; a 4-step "How we work" process section; Testimonials showing the 2 seeded quotes; Team showing the 2 seeded members; a Contact section with both the message form and the meeting scheduler (both should still work exactly as they did when temporarily mounted in Phases 4/5b); a Footer with agency name and contact email/phone (social icons should be absent, since seed `socialLinks` is `{}`).

Click a nav link (e.g. "Portfolio") and confirm the page smooth-scrolls to that section. Check the browser tab title reflects the seeded `agencyName` (`"[Placeholder Agency Name]"`), confirming `generateMetadata` is wired to `SiteSettings` and no longer shows the default "Create Next App" title.

- [ ] **Step 6: Commit**

```bash
git add src/components/public/contact-section.tsx src/app/page.tsx
git commit -m "Assemble the full public single-page site from live data"
```

---

## Phase 6 completion

After Task 4's commit, the public site is structurally complete and reads live data end-to-end, replacing every temporary homepage mounting from Phases 4-5b. Per the standing "complete all the phases" instruction, proceed to Phase 7 (polish: distinct visual identity, dark mode, scroll-in animations, SEO metadata extras — OG image, `sitemap.xml`, `robots.txt`) — write Phase 7's plan next.
