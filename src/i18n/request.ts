import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, isLocale } from "@/lib/site/config";

/**
 * Locale routing is ours (src/middleware.ts), not next-intl's: the public
 * layout calls `setRequestLocale` with the `[locale]` segment, and that value
 * arrives here as `requestLocale`. Admin pages have no locale and get English.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = isLocale(requested) ? requested : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
