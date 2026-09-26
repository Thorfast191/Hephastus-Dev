import {
  DEFAULT_REGION,
  PREF_COOKIE,
  REGION_ENUM,
  REGION_HEADER,
  isLocaleForRegion,
  isRegion,
  type Locale,
  type RegionSlug,
} from "./config";
import { detectCountry, parsePreference } from "./routing";

/**
 * Which site an API request came from. The middleware stamps this header on
 * every request to eu./bd. hosts (overwriting anything the client sent), so
 * it can be trusted; requests from elsewhere fall back to the default region.
 */
export function regionFromRequest(request: Request): RegionSlug {
  const value = request.headers.get(REGION_HEADER);
  return isRegion(value) ? value : DEFAULT_REGION;
}

export function regionEnumFromRequest(request: Request) {
  return REGION_ENUM[regionFromRequest(request)];
}

/** The language the visitor was reading, if the site offers it; else the region default. */
export function localeFor(region: RegionSlug, requested: unknown): Locale {
  return isLocaleForRegion(region, requested) ? requested : "en";
}

/** Country from the visitor's saved preference, else Cloudflare / their browser. */
export function countryFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${PREF_COOKIE}=([^;]*)`));
  const saved = parsePreference(match?.[1])?.country;
  return (
    saved ??
    detectCountry({
      ipCountry: request.headers.get("cf-ipcountry"),
      acceptLanguage: request.headers.get("accept-language"),
    })
  );
}
