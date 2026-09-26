import { LOCALES, type Locale } from "./config";

/**
 * Localized text as stored in Json columns: English is required, other
 * languages are optional and fall back to English when missing or blank.
 */
export type LocalizedText = { en: string } & Partial<Record<Locale, string>>;

/** Read a Json column value defensively; bad or legacy shapes become `{ en: "" }`. */
export function asLocalized(value: unknown): LocalizedText {
  if (typeof value === "string") return { en: value };
  if (!value || typeof value !== "object" || Array.isArray(value)) return { en: "" };

  const record = value as Record<string, unknown>;
  const result: LocalizedText = { en: typeof record.en === "string" ? record.en : "" };
  for (const locale of LOCALES) {
    const text = record[locale];
    if (locale !== "en" && typeof text === "string" && text.trim()) result[locale] = text;
  }
  return result;
}

/** The text in `locale`, else English. */
export function localize(value: unknown, locale: Locale): string {
  const text = asLocalized(value);
  return text[locale]?.trim() ? text[locale]! : text.en;
}

/** Like `localize`, but a missing/blank value stays `null` (for optional fields). */
export function localizeOptional(value: unknown, locale: Locale): string | null {
  if (value === null || value === undefined) return null;
  return localize(value, locale).trim() || null;
}

export function hasTranslation(value: unknown, locale: Locale): boolean {
  return Boolean(asLocalized(value)[locale]?.trim());
}
