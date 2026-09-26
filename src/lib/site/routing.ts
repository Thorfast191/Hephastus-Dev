/**
 * Pure host / region / locale resolution. No Next.js imports, so the
 * middleware, server code, client code and tests all share one implementation.
 */
import {
  ADMIN_SUBDOMAIN,
  DEFAULT_REGION,
  REGION_LOCALES,
  isLocaleForRegion,
  isRegion,
  type Locale,
  type RegionSlug,
} from "./config";

export type HostKind =
  | { kind: "apex" }
  | { kind: "admin" }
  | { kind: "region"; region: RegionSlug };

/**
 * Classify a Host header against the configured root domain.
 * `rootDomain` may carry a port (`localhost:3000`) for local development, in
 * which case the host must carry the same port.
 *
 * Anything unrecognised (a bare IP, `www.`, a typo'd subdomain) is treated as
 * the apex, which redirects visitors somewhere real.
 */
export function resolveHost(host: string | null | undefined, rootDomain: string): HostKind {
  const normalizedHost = (host ?? "").trim().toLowerCase();
  const root = rootDomain.trim().toLowerCase();

  if (!normalizedHost || normalizedHost === root) return { kind: "apex" };
  if (!normalizedHost.endsWith(`.${root}`)) return { kind: "apex" };

  const subdomain = normalizedHost.slice(0, -(root.length + 1));
  if (subdomain === ADMIN_SUBDOMAIN) return { kind: "admin" };
  if (isRegion(subdomain)) return { kind: "region", region: subdomain };
  return { kind: "apex" };
}

/**
 * The host the visitor actually requested. Prefers `X-Forwarded-Host`: Next's
 * own server-side fetches — notably the render a Server Action does after
 * `redirect()` — go to `localhost:<port>` and carry the real host only in that
 * header. Without it the admin sign-in redirect looks like an apex request,
 * gets bounced cross-origin, loses its cookies and lands back on the login page.
 * (The reverse proxy overwrites the header, so clients can't choose it; and
 * choosing a host only picks which public site answers anyway.)
 */
export function requestHost(headers: { get(name: string): string | null }): string | null {
  const forwarded = headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  return forwarded || headers.get("host");
}

/** Bangladesh gets the BD site; everyone else the European/international one. */
export function regionForCountry(country: string | null | undefined): RegionSlug {
  return country?.toUpperCase() === "BD" ? "bd" : DEFAULT_REGION;
}

type LanguagePreference = { language: string; country: string | null; q: number };

/** Parse an Accept-Language header into tags ordered by preference. */
export function parseAcceptLanguage(header: string | null | undefined): LanguagePreference[] {
  if (!header) return [];

  return header
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number(qParam.trim().slice(2)) : 1;
      const [language, country] = tag.trim().toLowerCase().split("-");
      return {
        language,
        country: country ? country.toUpperCase() : null,
        q: Number.isFinite(q) ? q : 0,
        index,
      };
    })
    .filter((p) => p.language && p.language !== "*" && p.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index)
    .map(({ language, country, q }) => ({ language, country, q }));
}

/** First language the visitor accepts that this region offers; else the region default. */
export function pickLocale(region: RegionSlug, acceptLanguage: string | null | undefined): Locale {
  for (const { language } of parseAcceptLanguage(acceptLanguage)) {
    if (isLocaleForRegion(region, language)) return language;
  }
  return REGION_LOCALES[region][0];
}

/**
 * Best guess at the visitor's country. Cloudflare's `CF-IPCountry` is
 * authoritative when present; otherwise fall back to the country subtag of
 * the browser's languages (`en-BD`, `fr-FR`), and treat Bangla as Bangladesh.
 */
export function detectCountry(params: {
  ipCountry: string | null | undefined;
  acceptLanguage: string | null | undefined;
}): string | null {
  const ip = params.ipCountry?.trim().toUpperCase();
  // Cloudflare sends XX for unknown and T1 for Tor.
  if (ip && /^[A-Z]{2}$/.test(ip) && ip !== "XX" && ip !== "T1") return ip;

  const languages = parseAcceptLanguage(params.acceptLanguage);
  const withCountry = languages.find((l) => l.country && /^[A-Z]{2}$/.test(l.country));
  if (withCountry?.country) return withCountry.country;
  if (languages.some((l) => l.language === "bn")) return "BD";
  return null;
}

export type Preference = { region: RegionSlug; locale: Locale; country: string | null };

/** Cookie value is `region:locale:COUNTRY`, e.g. `eu:fr:FR`. */
export function serializePreference(pref: Preference): string {
  return [pref.region, pref.locale, pref.country ?? ""].join(":");
}

export function parsePreference(value: string | null | undefined): Preference | null {
  if (!value) return null;
  const [region, locale, country] = decodeURIComponent(value).split(":");
  if (!isRegion(region) || !isLocaleForRegion(region, locale)) return null;
  return {
    region,
    locale,
    country: country && /^[A-Z]{2}$/.test(country) ? country : null,
  };
}

/**
 * Split a public path into its locale prefix and the rest.
 * `/fr/services` → `{ locale: "fr", rest: "/services" }`; `/` → `{ locale: null, rest: "/" }`.
 */
export function splitLocalePath(pathname: string): { locale: string | null; rest: string } {
  const match = pathname.match(/^\/([^/]+)(\/.*)?$/);
  if (!match) return { locale: null, rest: pathname || "/" };
  const [, first, rest] = match;
  if (/^[a-z]{2}$/i.test(first)) return { locale: first.toLowerCase(), rest: rest ?? "" };
  return { locale: null, rest: pathname };
}

/** Public origin of a subdomain, e.g. `https://eu.example.com`. */
export function originFor(
  subdomain: RegionSlug | typeof ADMIN_SUBDOMAIN | null,
  rootDomain: string,
  protocol: string
): string {
  const proto = protocol.replace(/:$/, "");
  return subdomain ? `${proto}://${subdomain}.${rootDomain}` : `${proto}://${rootDomain}`;
}

/**
 * Domain attribute for cookies shared across subdomains. Browsers refuse a
 * Domain of `localhost`, so local development falls back to host-only cookies.
 */
export function cookieDomainFor(rootDomain: string): string | undefined {
  const hostname = rootDomain.split(":")[0];
  if (hostname === "localhost" || /^[\d.]+$/.test(hostname)) return undefined;
  return `.${hostname}`;
}
