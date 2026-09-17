# Public Site Redesign — Design

**Date:** 2026-09-08
**Status:** Approved, implementing

## Problem

The client rejected the current public site. It is light-mode shadcn cards in a
`max-w-5xl` column with a single 0.5s fade on each section — structurally sound,
visually generic. The client supplied `https://logirexion.com/` as the target.

## Goal

Rebuild the public site in the target's design language, section for section,
including its motion system. Content stays database-driven and admin-editable.
The admin panel is untouched.

## Non-goals

- Copying the target's copy, imagery, or project names. Content comes from
  Postgres, as it does today.
- Restyling the admin panel. It keeps its shadcn tokens and light/dark toggle.
- Standing up test infrastructure. The repo has none; adding it is out of scope
  for a visual redesign. Verification is build + manual browser checks.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Fidelity | Section-for-section match | Client picked the target explicitly |
| Theming | Public site dark-only, toggle removed | Glass/glow/gradient text require a near-black ground; a light variant is a different design |
| Motion library | `framer-motion` (already a dependency) | Covers reveals, stagger, scroll-linked parallax; GSAP adds ~50kb for no capability gain |
| Data | Full schema + admin CRUD | Keeps FAQ and lead qualification editable without a redeploy |

## Token architecture

Public tokens live on a `.site-root` class, **not** on `.dark`. `next-themes`
writes `.dark` to `<html>`; scoping this way makes it structurally impossible
for the admin's toggle to leak into the public palette.

```
--site-bg #050505          --site-text #ffffff
--site-surface rgb(255 255 255 / .03)   --site-muted #94a3b8
--site-border rgb(255 255 255 / .08)    --site-accent #6366f1
--site-border-strong rgb(255 255 255 / .14)  --site-accent-2 #a855f7
--site-glow rgb(99 102 241 / .3)
--site-ease cubic-bezier(.16, 1, .3, 1)
```

Exposed to Tailwind via `@theme inline` as `--color-site-*`.

The public page moves into a route group `src/app/(site)/` whose layout applies
`.site-root`.

**Type:** headings become Plus Jakarta Sans 800 at `-0.04em` tracking (the
target's display face is a commercial geometric grotesque; this is the nearest
free match). Body stays Inter. Hero `clamp(3.5rem, 9vw, 8rem)`; section headings
`clamp(2.5rem, 5vw, 4.5rem)`; eyebrows `0.8rem / 700 / .2em / uppercase / accent`.

## Motion layer — `src/components/motion/`

All primitives share `cubic-bezier(.16, 1, .3, 1)` at 0.6–0.8s.

| Primitive | Behavior | Mechanism |
|---|---|---|
| `Reveal` | Scroll-triggered entry, configurable distance/delay | `whileInView`, `once`, `-10%` margin |
| `Stagger` | Grid children cascade at 80ms | `variants` + `staggerChildren` |
| `Blobs` | Two 60vw gradient circles, `blur(120px)`, `opacity .12`, drifting | CSS keyframes, ~28s |
| `Cursor` | 12px dot, lerped trail, scales 4x over interactives | `rAF` + `mousemove` |
| `Magnetic` | Buttons pull toward cursor, max 8px | `useSpring` |
| `Marquee` | Edge-bleed loop, pauses on hover, masked edges | CSS `translateX(-50%)` on duplicated list |
| `ScrollProgress` | Hairline accent bar under nav | `useScroll` -> `scaleX` |

**Reduced motion is designed in, not bolted on.** Under
`prefers-reduced-motion: reduce`: reveals become instant opacity, blobs freeze,
the cursor never mounts, the marquee degrades to an `overflow-x-auto` snap row.
The cursor also never mounts on `(pointer: coarse)`, and `cursor: none` is never
set globally — keyboard and touch users keep a real pointer.

## Sections

1. **Nav** — fixed, `blur(20px)` over `rgba(5,5,5,.8)`, numbered center links
   (`01 SERVICES` … `04 CONTACT`), white pill CTA. Shrinks past 50px of scroll.
   Mobile gets a full-screen overlay menu with staggered links.
2. **Hero** — `100svh`. Eyebrow, two-tone headline (white with bloom, then
   violet with accent bloom), sub-paragraph, two magnetic pill CTAs. Words
   stagger up on mount; block parallaxes and fades on scroll.
3. **`01` Services** — 3-col glass cards, numeric index, accent icon tile, tag
   pills. Hover lifts 8px and runs a cursor-tracking radial spotlight.
4. **`02` Portfolio** — 2-col image cards, `aspect-[4/3]`, image scales 1.08
   under a gradient scrim. Second column offset ~60px for editorial rhythm.
5. **Testimonials** — full-bleed marquee of `min-w-[520px]` glass cards, masked
   at both edges, ~40s loop, pauses on hover.
6. **`03` Process** — sticky left column against widely-spaced numbered steps;
   each step's number brightens to accent near viewport center. Steps stay
   hardcoded.
7. **FAQ** — new. Hairline rows, `+` rotating to `x`, height via
   `AnimatePresence`. Database-backed.
8. **Team** — 3-col glass cards, portraits grayscale until hover.
9. **`04` Contact** — one `rounded-[2rem]` glass card with two tabs, *Send a
   message* and *Book a call*, so the scheduler does not push the card past
   2000px. Form: 2-col name/email, project-type select, budget pill radio group,
   vision textarea, full-width white pill submit.
10. **Footer** — logo and line left, link columns right, hairline divider,
    copyright row.

## Schema — one migration

```prisma
model Faq {
  id, question, answer, order Int @default(0), active Boolean @default(true), timestamps
}

Lead          + projectType String?  + budgetRange String?
Service       + tags String[] @default([])
SiteSettings  + heroEyebrow String?  + heroHeadline String?  + heroSubtitle String?
```

Every new column is nullable or defaulted, so the migration is non-destructive
and existing rows keep working. Hero fields fall back to `agencyName` /
`tagline` when null, which makes the largest text on the page client-editable
rather than hardcoded.

Admin work: `/admin/faqs` CRUD mirroring the testimonials screens; budget and
project type surfaced in the leads table and detail dialog; three hero fields in
the settings form; tags in the service form. `POST /api/leads` zod schema and
the notification email pick up the new fields.

## Verification

- `pnpm build` passes (typecheck + lint) — the hard gate
- Migration applies cleanly against local Postgres on port 5434
- Browser pass: every section screenshotted at desktop and mobile; reveals fire;
  marquee loops seamlessly; accordion animates; a form submission writes a
  `Lead` carrying the new fields; the scheduler still books
- `prefers-reduced-motion` emulated and degraded paths confirmed
- `/admin` still renders correctly in both light and dark

## Risks

- Framer Motion 13 + React 19 + Next 15: motion primitives must be client
  components. Sections that read Prisma stay server components and wrap client
  primitives around server-rendered children.
- The custom cursor must not break touch or keyboard interaction.
- Hero must use `100svh`, not `100vh`, to survive mobile browser chrome.
