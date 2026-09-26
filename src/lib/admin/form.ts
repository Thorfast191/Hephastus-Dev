import { z } from "zod";
import { LOCALES } from "@/lib/site/config";
import type { LocalizedText } from "@/lib/site/localized";

/**
 * Readers for the admin's localized and region fields. Localized inputs are
 * named `<field>.<locale>` (e.g. `title.en`, `title.fr`) by <LocalizedField>.
 */

/** English required; other languages kept only when filled in. */
export function readLocalized(formData: FormData, name: string): LocalizedText {
  const en = String(formData.get(`${name}.en`) ?? "").trim();
  if (!en) throw new Error(`${name} (English) is required`);

  const result: LocalizedText = { en };
  for (const locale of LOCALES) {
    if (locale === "en") continue;
    const text = String(formData.get(`${name}.${locale}`) ?? "").trim();
    if (text) result[locale] = text;
  }
  return result;
}

/** Optional localized field: `null` when English is blank. */
export function readOptionalLocalized(formData: FormData, name: string): LocalizedText | null {
  const en = String(formData.get(`${name}.en`) ?? "").trim();
  return en ? readLocalized(formData, name) : null;
}

const regionsSchema = z
  .array(z.enum(["EU", "BD"]))
  .min(1, "Choose at least one site to show this on");

/** Checkboxes named `regions`, from <RegionCheckboxes>. */
export function readRegions(formData: FormData) {
  return regionsSchema.parse(formData.getAll("regions"));
}
