/**
 * The site is one app serving several "variants": a region (which business —
 * pricing, contact channels, portfolio, booking hours) crossed with a locale
 * (which language the text is in). Everything region/locale-shaped reads from
 * this file, so adding Bangla or a new region is an edit here plus content.
 */

export const REGIONS = ["eu", "bd"] as const;
export type RegionSlug = (typeof REGIONS)[number];

export const LOCALES = ["en", "fr"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_REGION: RegionSlug = "eu";
export const DEFAULT_LOCALE: Locale = "en";

/** Languages offered per region. The first entry is the region's default. */
export const REGION_LOCALES: Record<RegionSlug, readonly Locale[]> = {
  eu: ["en", "fr"],
  bd: ["en"],
};

/** Prisma's `Region` enum values, keyed by URL slug. */
export const REGION_ENUM = { eu: "EU", bd: "BD" } as const;
export type RegionEnum = (typeof REGION_ENUM)[RegionSlug];

export function regionSlugFromEnum(value: RegionEnum): RegionSlug {
  return value === "BD" ? "bd" : "eu";
}

export const REGION_LABELS: Record<RegionSlug, string> = {
  eu: "Europe & International",
  bd: "Bangladesh",
};

/** Native names — a language picker should read in the language it offers. */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  fr: "Français",
};

/** BCP 47 tags for hreflang, so Google can tell the two English sites apart. */
export const HREFLANG: Record<RegionSlug, Partial<Record<Locale, string>>> = {
  eu: { en: "en", fr: "fr" },
  bd: { en: "en-BD" },
};

/** Subdomain that serves the admin panel. */
export const ADMIN_SUBDOMAIN = "admin";

/** Cookie holding the visitor's chosen region, language and country. */
export const PREF_COOKIE = "hd_pref";
/** Query flag the apex redirect adds so the landing page shows the chooser. */
export const WELCOME_PARAM = "welcome";
/** Request header the middleware sets so API routes know which site called them. */
export const REGION_HEADER = "x-hd-region";

export function isRegion(value: unknown): value is RegionSlug {
  return typeof value === "string" && (REGIONS as readonly string[]).includes(value);
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function isLocaleForRegion(region: RegionSlug, locale: unknown): locale is Locale {
  return isLocale(locale) && REGION_LOCALES[region].includes(locale);
}

/** Every region/locale pair that has a public site. */
export const SITE_VARIANTS = REGIONS.flatMap((region) =>
  REGION_LOCALES[region].map((locale) => ({ region, locale }))
);
