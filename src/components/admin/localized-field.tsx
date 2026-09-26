"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  LOCALES,
  LOCALE_LABELS,
  REGION_LOCALES,
  regionSlugFromEnum,
  type Locale,
} from "@/lib/site/config";
import { asLocalized } from "@/lib/site/localized";
import { lockedRegion } from "@/lib/admin/permissions";
import { useViewer } from "./viewer-context";

/**
 * One text field, one input per language, named `<name>.<locale>` for
 * `readLocalized()`. English is the required source; other languages are
 * optional and the public site falls back to English when they are blank.
 */
export function LocalizedField({
  name,
  label,
  value,
  locales,
  multiline = false,
  rows,
  required = false,
  placeholder,
  hint,
}: {
  name: string;
  label: string;
  /** The stored Json value (or null for a new record). */
  value?: unknown;
  locales?: readonly Locale[];
  multiline?: boolean;
  rows?: number;
  required?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  const current = value === undefined || value === null ? null : asLocalized(value);
  // By default, the languages the admin's content can appear in: all of them
  // for a super admin, their own site's for a region admin (no French inputs
  // for Bangladesh-only items).
  const locked = lockedRegion(useViewer());
  const shown = locales ?? (locked ? REGION_LOCALES[regionSlugFromEnum(locked)] : LOCALES);

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium leading-none">{label}</legend>
      {shown.map((locale) => {
        const id = `${name}-${locale}`;
        const props = {
          id,
          name: `${name}.${locale}`,
          lang: locale,
          defaultValue: current?.[locale] ?? "",
          required: required && locale === "en",
          placeholder:
            locale === "en" ? placeholder : "Leave blank to show the English text",
        };

        return (
          <div key={locale} className="flex items-start gap-2">
            <Label
              htmlFor={id}
              className="mt-2 w-8 shrink-0 justify-center rounded bg-muted px-1 py-0.5 text-[0.65rem] font-semibold uppercase"
              title={LOCALE_LABELS[locale]}
            >
              {locale}
            </Label>
            {multiline ? <Textarea rows={rows} {...props} /> : <Input {...props} />}
          </div>
        );
      })}
      {/* Languages this admin doesn't edit still round-trip, so saving never
          erases a translation someone else wrote. */}
      {LOCALES.filter((locale) => !shown.includes(locale) && current?.[locale]).map((locale) => (
        <input key={locale} type="hidden" name={`${name}.${locale}`} value={current![locale]} />
      ))}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </fieldset>
  );
}
