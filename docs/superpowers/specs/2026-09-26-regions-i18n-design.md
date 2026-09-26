# Regions & Languages — Design

**Date:** 2026-09-26
**Status:** Implemented on `feature/regions-i18n`, awaiting client review

## Problem

The agency serves two markets — European clients and local Bangladeshi
clients — from one site and one admin. Mixing them on one page confuses
visitors (EUR vs BDT pricing, email vs WhatsApp, different case studies)
and mixes both pipelines in one admin list. European clients also need
French.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| One app or two frontends | One Next.js app, one deployment | Most of the site is shared; two codebases drift. What differs is data. |
| How regions are addressed | Subdomains: `eu.`, `bd.`, `admin.` of `hephastusdev.com` | Client's choice; one wildcard DNS record and one wildcard certificate |
| How languages are addressed | Path prefix: `eu./en`, `eu./fr`, `bd./en` | Indexable per-language URLs for hreflang |
| Languages | EU: English + French. BD: English (Bangla later) | Client's call |
| First visit | Apex redirects by detected country/language; a chooser modal (country + language) opens pre-filled | Client asked for the modal; detection keeps it one click |
| Deep links / crawlers | No modal; globe switcher in the header | The URL already states intent; bots must see the page |
| Content translations | JSON columns `{ "en", "fr" }`, English required, fallback to English | One row per item; adding Bangla needs no migration |
| Interface text | `next-intl`, `messages/<locale>.json`, typed keys | Standard for the App Router |
| Per-region content | `regions Region[]` on services, portfolio, testimonials, FAQs; team shared | A case study can appear on both sites without duplication |
| Per-region settings | `SiteSettings` becomes one row per region | Own hero, contact, WhatsApp, budgets (€/৳), timezone, booking rules |
| Booking | Per-region hours/timezone; booked slots checked across both regions | Same people take calls for both markets |
| French copy | Drafted by Claude, for native review | Client asked |

## Routing

`src/middleware.ts`, using pure helpers in `src/lib/site/routing.ts`
(unit-tested):

- **Apex** — redirect to `<region>.<domain>/<locale>`. Region from the
  saved preference cookie, else country (`CF-IPCountry`, else the
  browser's language subtags). Adds `?welcome=<country>` for first-time
  human visitors so the page opens the chooser.
- **Region host** — `/fr/…` is rewritten to `/eu/fr/…`, i.e. to
  `app/(site)/[region]/[locale]`. A path with no language redirects to
  the saved/browser language; a language the region doesn't offer
  (`bd./fr`) redirects to the region default.
- **Admin host** — serves `/admin/…`; everything else redirects there.
  `/admin` on any other host redirects to the admin host.
- **Shared paths** (`/api`, `/uploads`, files) pass through on every
  host. On region hosts they carry an `x-hd-region` header, set (and
  overwritten) by the middleware, which API routes use to attribute
  leads and bookings.
- The host is read from `X-Forwarded-Host` first. Next's own internal
  fetches (the render after a Server Action `redirect()`) go to
  `localhost:<port>`, and carry the real host only in that header.
  Without this, admin sign-in bounced back to the login page. Nginx
  overwrites the header so clients can't set it.

The preference cookie `hd_pref=region:locale:COUNTRY` is scoped to
`.hephastusdev.com`, so the choice follows the visitor across subdomains.
It is host-only on `localhost` in development.

## App structure

Two root layouts, each rendering its own `<html>`:
`app/(site)/[region]/[locale]/layout.tsx` (sets `lang` per locale, keeps
pages statically prerendered) and `app/admin/layout.tsx`. The three site
variants are prerendered via `generateStaticParams` with 60 s ISR.

Admin edits call `revalidatePublicSite()`, which revalidates the route
*pattern*. Cached pages are tagged with the public pre-rewrite path
(`/fr`), which is ambiguous across hosts, so revalidating by URL doesn't
work.

## Admin

- Header switcher: All sites / Europe / Bangladesh (cookie). It scopes
  the dashboard (a pipeline card per region), leads, meetings and the
  content lists (reordering moves an item among the ones in view).
  Settings and availability require a specific region.
- "Show on" requires at least one site (checked in the browser), and the
  booking timezone is a dropdown of valid zones.
- Content forms: EN/FR inputs per text field, "Show on" region checkboxes,
  and a "FR missing" badge for EU-visible items without French.
- Leads and meetings show site, language and country. Meeting times
  display in their region's timezone.

## Admin roles

| | Super admin | Region admin (EU or BD) |
|---|---|---|
| Region switcher | All / Europe / Bangladesh | Pinned to their region (cookie ignored) |
| Leads, meetings, settings, availability | Both regions | Their region only |
| Services, portfolio, testimonials, FAQ | Everything | See items shown on their site; edit only items shown on their site **alone** (shared items are read-only); new items are saved to their site; no French inputs for BD |
| Team (shown on both sites) | Yes | No |
| Admins page (create, edit role/site, reset password, remove) | Yes | No |
| My account (name, own password) | Yes | Yes |

Enforcement is server-side in every action (`src/lib/admin-guard.ts`,
rules in `src/lib/admin/permissions.ts`, unit-tested); the UI only mirrors
it. Role and region are read from the database on each request, so
removing or demoting an admin takes effect on their next click. A
`CHECK` constraint makes a region admin without a region impossible.
Safety rails: nobody can change their own role or delete themselves, and
the last super admin can't be demoted or removed.

Verified by replaying a region admin's captured action requests against
another region's records (refused, database unchanged).

## Emails

Client-facing emails (lead auto-reply, meeting confirmation and
cancellation) go out in the language the client used, with times
formatted in the region's timezone. Staff notifications are English and
prefixed `[EU]` / `[BD]`, sent to that region's contact email.

## SEO

The social-share image is served by `/api/og?locale=…` on each region
host. A file-based `opengraph-image` would get a URL built from the
internal `/eu/fr/…` path, which the host rewrite turns into a 404.
Per-page canonical URL; hreflang `en`, `fr`, `en-BD` plus `x-default`
(`eu./en`); a per-host sitemap listing alternates; `robots.txt`
disallows everything on the admin host.

## Migration

`20260926130000_regions_and_localized_content` is hand-written so that
existing text is wrapped in place as `{"en": …}` rather than dropped. It
copies the settings row, availability rules and blackout dates to BD,
and marks existing leads and meetings EU.

## Out of scope / later

- Bangla (`bd./bn`): add `"bn"` to `LOCALES` and `REGION_LOCALES.bd`,
  add `messages/bn.json`, and fill in translations in the admin.
- Slot overlap across regions is detected by exact start time, so it
  assumes both regions use the same slot length (default 30 min).
