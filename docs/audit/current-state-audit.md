# Current State Audit

**Date:** 2026-09-18
**Scope:** Public-site redesign per `docs/superpowers/specs/2026-09-08-public-site-redesign-design.md`
**Method:** Repository inspection, `pnpm build`, `pnpm lint`, Postgres inspection, browser verification

The repository — not the specification — is treated as the source of truth for what
currently exists. Findings below are what the code actually does.

---

## Architecture

### Route structure

| Concern | State |
|---|---|
| Public | `src/app/(site)/` route group — `layout.tsx` + `page.tsx`, serves `/` |
| Admin | `src/app/admin/(protected)/*` (9 sections) + `src/app/admin/login` |
| API | `leads`, `meetings/availability`, `meetings/book`, `upload`, `auth/[...nextauth]`, `uploads/[filename]` |
| SEO | `robots.ts`, `sitemap.ts`, `opengraph-image.tsx` at app root |
| Errors | `error.tsx`, `global-error.tsx`, `not-found.tsx` root; `admin/(protected)/error.tsx` |

Public/admin separation is clean. The route group carries the dark palette without
affecting `/admin`.

### Styling architecture

Two independent token layers in one stylesheet:

- **Admin:** existing shadcn `--background`/`--foreground`/etc., with `.dark` overrides driven by `next-themes`.
- **Public:** `--site-*` namespace defined at `:root` and *never* redefined under `.dark`. `.site-root` applies the ground colour.

This is leak-proof by construction: the admin toggle writes `.dark`, which no
`--site-*` token responds to. Verified in-browser — admin renders light while the
public site stays `rgb(5, 5, 5)`.

### Server/client boundaries

Server Components: `page.tsx`, `layout.tsx`, `footer`, `section-heading`,
`services-section`, `portfolio-section`, `team-section`, `testimonials-section`, `blobs`.

Client Components: `hero`, `site-nav`, `contact-section`, `contact-form`,
`faq-section`, `process-section`, `service-card`, `scheduler`, and all six
interactive motion primitives.

All Prisma reads happen in Server Components. Client components receive plain
props. No database access from the client.

### Motion architecture

`src/components/motion/` — `ease.ts` (shared curve), `reveal`, `stagger`, `blobs`,
`cursor`, `magnetic`, `marquee`, `scroll-progress`. Single easing
`cubic-bezier(.16, 1, .3, 1)`. Framer Motion for scroll/spring work, CSS keyframes
for blobs and marquee, one `rAF` loop for the cursor. No GSAP.

### Database

PostgreSQL via Docker on host port **5434**. 13 models. Migration
`20260908082058_redesign_faq_hero_lead_fields` is additive only — four
`ADD COLUMN` (all nullable or defaulted) plus one `CREATE TABLE`. No destructive
operations. Existing rows verified intact after apply.

---

## Implementation status

| Requirement | Status | Evidence |
|---|---|---|
| Route-group separation, dark-only public | **COMPLETE** | `.site-root` verified `rgb(5,5,5)`; admin unaffected |
| Public theme toggle removed | **COMPLETE** | `theme-toggle.tsx` deleted; zero `ThemeToggle` references in `src/` |
| Admin theming intact | **COMPLETE** | `theme-provider.tsx` still wired in root layout; admin renders light |
| Navigation (fixed, glass, shrink, numbered, CTA) | **COMPLETE** | Verified in browser at 2 scroll positions |
| Mobile full-screen menu + scroll lock | **PARTIAL** | Opens/closes, locks body, staggers links — but no `role="dialog"`, no focus trap, no Escape key |
| Hero visual treatment | **COMPLETE** | `100svh`, two-tone bloom, word stagger, parallax all verified |
| Hero content DB-driven | **PARTIAL** | eyebrow/headline/subtitle editable; **CTA labels and hrefs hardcoded** |
| Hero headline authoring model | **CONFLICTING** | Uses a `\|` delimiter — leaks implementation detail to a non-technical client |
| Services DB-driven + CRUD + tags | **COMPLETE** | 7 services render 3-up and wrap correctly; tags field added to admin |
| Portfolio DB-driven | **PARTIAL** | Renders from DB, but **no `active` flag** — client cannot unpublish a project |
| Testimonials marquee + CRUD | **PARTIAL** | Marquee and CRUD work, but **no `active` flag** on the model |
| Process section | **COMPLETE** | Sticky rail + numbered steps verified; hardcoded by approved decision |
| FAQ DB-backed + full CRUD | **PARTIAL** | CRUD complete (create/edit/delete/reorder/activate); accordion **missing `aria-controls`/`id` linkage** |
| Team DB-driven | **COMPLETE** | Uses existing `TeamMember` model, `active` filter applied |
| Contact form + new lead fields | **COMPLETE** | End-to-end submission wrote `projectType` + `budgetRange`; surfaced in admin |
| Budget ranges | **CONFLICTING** | Hardcoded `BUDGET_OPTIONS` array — spec designates these client-controlled |
| Scheduler preserved | **COMPLETE** | Logic untouched, restyled only; correctly reports no slots with no rules seeded |
| Contact tabs | **PARTIAL** | Tab switching works; **incomplete ARIA** — no `tabpanel`, no `aria-controls` |
| Footer | **COMPLETE** | DB-driven, conditional social column |
| Motion primitives | **COMPLETE** | All 7 present, shared easing |
| Reduced motion | **COMPLETE** | CSS block confirmed in compiled output; JS branches in every primitive |
| Coarse-pointer cursor suppression | **COMPLETE** | `(pointer: fine)` gate in `cursor.tsx` |
| Focus-visible states | **BROKEN** | **Zero `focus-visible` rules in the public site** while `cursor: none` is applied |
| Metadata / SEO | **PARTIAL** | title + description only; no OpenGraph block, no canonical |
| Build + lint | **COMPLETE** | `pnpm build` 22 routes, `pnpm lint` clean |

---

## Technical defects

### Critical

1. **No focus-visible styling on the public site.** `cursor.tsx` injects
   `.site-root, .site-root * { cursor: none }`. Combined with zero focus indicators,
   a keyboard user has *no* visible cursor and *no* visible focus ring — the site
   becomes unnavigable without a mouse. The cursor scoping itself is correct (not
   global), but the missing focus styles make it an accessibility failure.

### High

2. **Dead duplicate motion implementation.** `src/components/public/reveal.tsx`
   still exists with the old `0.5s / easeOut` easing, superseded by
   `motion/reveal.tsx`. Confirmed zero importers.
3. **Testimonials have no `active` field.** Client can only delete a testimonial,
   not temporarily unpublish it.
4. **Portfolio has no `active` field.** Same problem; `featured` exists but is a
   different concept and is not used by the public query.
5. **Budget ranges hardcoded in `contact-form.tsx`.** Changing a price band
   requires a developer.
6. **Hero headline uses a `|` delimiter.** A non-technical client must learn
   private syntax to control the accent colour.
7. **Hero CTA labels and targets hardcoded.** Button copy is normal business content.
8. **Mobile menu lacks dialog semantics.** No `role="dialog"`, no `aria-modal`,
   no focus trap, no Escape-to-close. Focus can escape to content behind the overlay.

### Medium

9. **FAQ accordion ARIA incomplete.** `aria-expanded` is present but there is no
   `aria-controls` pointing at a panel `id`.
10. **Contact tabs ARIA incomplete.** `role="tab"`/`aria-selected` present, but the
    panel has no `role="tabpanel"` or `aria-controls` relationship.
11. **Metadata lacks OpenGraph/canonical.** The generated OG *image* exists but no
    `openGraph` metadata block references it.

### Low

12. `process-section.tsx` is a Client Component for a mostly-static section. The
    per-step scroll opacity justifies it, but the content itself could be server-rendered.
13. Sitemap contains only the homepage. Correct for a single-page site; noted for future routes.

### Checked and clean

- No hydration warnings in console during the browser pass.
- No shadcn `@/components/ui/*` imports remain in public components.
- No stale light-mode utility classes (`bg-muted`, `text-muted-foreground`) in public components.
- No duplicate navigation or hero markup.
- No duplicate section `id`s; all nav anchors resolve to real targets.
- Image `alt` text present on portfolio, team, and testimonial images.
- `rAF` loop and both scroll/pointer listeners have cleanup in `cursor.tsx`.
- Zod validation server-side on all lead and admin mutations; `assertAdmin()` on every admin action.
- No secrets referenced from client components.

---

## CMS / Admin audit

Can the client run the site without a developer?

| Content | Editable today | Gap |
|---|---|---|
| Agency name, tagline | Yes | — |
| Contact email / phone | Yes | — |
| Social links | Yes | — |
| Hero eyebrow / headline / subtitle | Yes | `\|` syntax is opaque |
| Hero CTA labels + links | **No** | Hardcoded |
| Services (CRUD, order, active, icon, tags) | Yes | — |
| Portfolio (CRUD, order, images, tags, link) | Partial | Cannot unpublish |
| Testimonials (CRUD, order) | Partial | Cannot unpublish |
| FAQ (CRUD, order, active) | Yes | — |
| Team (CRUD, order, active, portrait) | Yes | — |
| Budget ranges | **No** | Hardcoded |
| Leads (view, status, notes, new fields) | Yes | — |
| Availability / meetings | Yes | — |
| Process steps | No | Hardcoded by approved decision — acceptable |
| Nav labels / section anchors | No | Structural, developer-controlled — acceptable |

**Verdict:** four genuine client-editability gaps — hero CTAs, budget ranges,
testimonial active, portfolio active — plus the hero delimiter usability problem.

---

## Remediation plan

1. Delete dead `public/reveal.tsx`.
2. Additive migration: `Testimonial.active`, `PortfolioItem.active`,
   `SiteSettings.budgetRanges`, structured hero headline fields, hero CTA fields.
3. Backfill the `|` headline into the structured fields; drop the delimiter.
4. Add public focus-visible styling.
5. Complete FAQ, tab, and mobile-menu ARIA; add Escape + focus trap.
6. Add OpenGraph/canonical metadata.
7. Wire every new field into the admin forms and public queries.
8. Re-verify: build, migration, browser desktop + mobile, reduced motion, admin, lead round-trip.
