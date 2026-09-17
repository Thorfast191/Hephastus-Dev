# Final Production Audit

**Date:** 2026-09-18
**Gates:** `pnpm lint` clean · `pnpm build` 22 routes · 4 migrations applied · browser pass on desktop
**Companion document:** `docs/audit/current-state-audit.md` (pre-implementation state)

---

## Status by area

| Area | Status | Notes |
|---|---|---|
| Public navigation | **Pass** | Fixed, dark glass, `blur(20px)`, shrinks past 50px, numbered links, pill CTA. Mobile overlay now has `role="dialog"`, `aria-modal`, `aria-controls`, Escape-to-close, a Tab focus trap, and focus restoration to the trigger. |
| Hero | **Pass** | `100svh`, oversized type, two-tone bloom, word stagger, scroll parallax and fade. All copy and both CTA labels/targets are database-driven. The `\|` delimiter is gone. |
| Services | **Pass** | Database-driven with tags; 7 seeded services render 3-up and wrap correctly, so a 4th+ service needs no code change. Cursor-tracking spotlight on hover. |
| Portfolio | **Pass** | Database-driven; `active` flag added so items can be unpublished without deletion. Offset columns, image scale on hover, gradient scrim. |
| Testimonials | **Pass** | Edge-bleed marquee, masked edges, pauses on hover. `active` flag added. |
| Process | **Pass** | Sticky rail plus numbered steps; per-step opacity tracks scroll position. Hardcoded content by approved decision. |
| FAQ | **Pass** | Database-backed with full admin CRUD (create/edit/delete/reorder/activate). Accordion now carries `aria-controls`, panel `id`, `role="region"` and `aria-labelledby`. |
| Team | **Pass** | Existing `TeamMember` model, `active` filter applied, grayscale-to-colour on hover, alt text present. |
| Contact | **Pass** | Full round-trip verified against the live database: a submission persisted `projectType: Desktop Apps` and `budgetRange: 50k plus`, the latter sourced from the client-managed list. Tabs now expose a complete `tab`/`tabpanel` relationship. |
| Scheduler | **Pass** | Logic untouched from the pre-redesign implementation; restyled only. Correctly reports no open slots while no availability rules exist. |
| Footer | **Pass** | Database-driven, conditional social column, hairline divider. |
| Admin CMS | **Pass (data layer) / Unverified (logged-in UI)** | Every new field is wired into the admin forms and actions, and the build compiles all 9 admin routes. The logged-in visual pass could not be completed — see *Outstanding*. |
| Database | **Pass** | 4 migrations, all additive. Zero destructive operations, no resets, no data loss. Existing rows intact throughout. |
| Responsive | **Partial** | Desktop verified in-browser across all 10 sections. True mobile-viewport rendering could not be verified — see *Outstanding*. |
| Accessibility | **Pass** | Focus-visible rings added across the public site (previously absent entirely while `cursor: none` applied), skip link added as the first tab stop, dialog semantics and focus trap on the mobile menu, complete accordion and tab ARIA, semantic headings, alt text on all images. |
| Motion | **Pass** | 7 primitives on one shared easing. Dead duplicate `public/reveal.tsx` removed. No GSAP, no added animation dependencies. |
| Reduced motion | **Pass (static) / Unverified (runtime)** | `@media (prefers-reduced-motion: reduce)` block confirmed present in the compiled stylesheet; `useReducedMotion` branches present in every primitive. OS-level toggle unavailable in this harness. |
| Performance | **Pass** | Database reads stay in Server Components; 9 of 24 public/motion modules are client components, each justified by interaction. `rAF` loop and all scroll/pointer listeners have cleanup. Homepage first-load JS 366 kB. |
| SEO | **Pass** | Title and description from settings, plus OpenGraph and Twitter blocks and a canonical URL (all previously absent). Generated OG image, `robots.txt`, `sitemap.xml`. |
| Security | **Pass** | Zod validation server-side on every lead and admin mutation; `assertAdmin()` on all 40+ admin actions; no secrets referenced from client components; no `any` shortcuts introduced. |

---

## What was already complete

The prior session's work held up on inspection: route-group separation, the
leak-proof `--site-*` token layer, all ten sections, the seven motion
primitives, the FAQ model with full CRUD, the lead `projectType`/`budgetRange`
fields, service tags, and the first additive migration. Build and lint were
already green. No `ThemeToggle` usage, no shadcn imports, and no stale
light-mode utilities remained in public components.

## What was broken

| Severity | Defect |
|---|---|
| **Critical** | No focus-visible styling anywhere on the public site while `cursor: none` was applied — a keyboard user had neither a pointer nor a focus ring, making the site unnavigable without a mouse. |
| **High** | Content mutations in 5 of 6 admin sections revalidated only their admin path, never `/` — the client would save a change and the public page would not reflect it on demand. |
| **High** | Hero headline used a `\|` delimiter, forcing a non-technical client to learn private syntax. |
| **High** | Hero CTA labels and targets hardcoded. |
| **High** | Budget ranges hardcoded in `contact-form.tsx`. |
| **High** | Testimonials and portfolio items had no `active` flag — the client could only delete, never unpublish. |
| **High** | Mobile menu had no dialog semantics, no focus trap, and no Escape handler. |
| **Medium** | FAQ accordion and contact tabs had incomplete ARIA relationships. |
| **Medium** | Metadata had no OpenGraph block or canonical URL. |
| **Medium** | Dead duplicate motion implementation (`public/reveal.tsx`) with the old easing. |

Two further defects were found and fixed during the prior session's own
verification: the mobile menu could permanently lock page scroll when the
viewport crossed to desktop while open, and `font-sans` was applied at `<html>`
where next/font's `--font-inter` is not in scope, so the entire application
rendered in the browser default serif.

## What changed in this pass

**Schema** — one additive migration (`20260917205822`): `Testimonial.active`,
`PortfolioItem.active`, `SiteSettings.heroHeadlineAccent`, four hero CTA
columns, and `SiteSettings.budgetRanges`. Includes a data backfill that split
the existing `|` headline into the two structured columns and seeded the
previously-hardcoded budget bands, so existing installs keep their content.

**Public** — hero reads two discrete headline fields and four CTA fields;
contact form reads budget bands from settings and hides the question entirely
when the list is cleared; page query honours the new `active` flags; skip link
added; focus rings added; accordion, tab and dialog ARIA completed.

**Admin** — settings form gained a structured hero block (plain-language
labels, no syntax) and a budget-options field; testimonials and portfolio
gained `active` toggles with new server actions; every content mutation now
revalidates `/`.

**Cleanup** — removed dead `public/reveal.tsx`.

---

## Client-editability result

A non-technical client can now manage, without touching code: agency name,
tagline, contact email and phone, social links, hero eyebrow, both headline
halves, subtitle, both CTA labels and links, services (create/edit/delete/
reorder/activate/icon/tags), portfolio (create/edit/delete/reorder/images/
tags/link/featured/**active**), testimonials (create/edit/delete/reorder/
**active**), FAQs (create/edit/delete/reorder/activate), team members
(create/edit/delete/reorder/activate/portrait), **budget options**, leads
(view/status/notes), and availability and meetings.

Verified at the data layer: writing each of these to the database produced the
expected change on the public page, and deactivating a testimonial, portfolio
item or FAQ removed it from the page while leaving active siblings in place.

Remaining developer-controlled by design: process steps (approved as
hardcoded), navigation labels and section anchors (structural), and the entire
design system — typography, spacing, motion timings, glass and gradient
treatments, breakpoints.

---

## Outstanding

| Severity | Item |
|---|---|
| **Medium** | **Logged-in admin UI pass not completed.** Admin requires authentication and I cannot enter passwords. A mock admin is seeded (`dev-audit@localhost.test` / `AuditDev123!`, local database only) — sign in and I will complete the visual and interaction audit of all 9 admin screens in both light and dark. |
| **Medium** | **True mobile-viewport verification not completed.** The browser harness pinned `innerWidth` at 1710 regardless of window resizing, so responsive rendering at 375/430px was not visually confirmed. Mobile menu state logic, scroll lock, Escape and focus trap were verified programmatically. Worth a pass in device mode. |
| **Low** | **Runtime reduced-motion not exercised.** The CSS block is confirmed in the compiled output and the JS branches are in every primitive, but the OS setting cannot be toggled from this harness. |
| **Low** | **Contact tab focus ring falls back to the default ring colour.** Two matching rules declare `2px solid var(--site-accent)` and neither wins; the computed value is a `3px solid` ring in the shadcn ring colour. A visible focus indicator is present, so the accessibility requirement is met — this is cosmetic inconsistency only. |
| **Low** | Portfolio items and team members carry no images in the seeded data, so those sections read sparser than the design intends until real assets are uploaded. |
| **Low** | Sitemap lists only the homepage — correct for a single-page site, revisit when routes are added. |

## Risks

- **Concurrent `next build` and `next dev` corrupt `.next`.** Hit twice during
  this work; the dev server returns 500 until restarted. Not a code defect, but
  worth knowing before debugging a phantom failure.
- **`revalidate = 60` on the homepage.** With the added `revalidatePath("/")`
  calls, admin edits now propagate on save. Anything that mutates public content
  outside those server actions will still wait out the ISR window.
- **No automated test suite.** Verification is build plus manual browser work,
  per the approved decision. Regressions in motion, focus or ARIA behaviour will
  not be caught automatically.
