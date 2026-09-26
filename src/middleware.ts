import { NextResponse, type NextRequest } from "next/server";
import {
  PREF_COOKIE,
  REGION_HEADER,
  REGION_LOCALES,
  WELCOME_PARAM,
  isLocaleForRegion,
  type RegionSlug,
} from "@/lib/site/config";
import {
  detectCountry,
  parsePreference,
  pickLocale,
  regionForCountry,
  requestHost,
  resolveHost,
  splitLocalePath,
} from "@/lib/site/routing";
import { adminOrigin, regionOrigin, rootDomain } from "@/lib/site/env";

/**
 * One app, several hosts:
 *
 *   hephastusdev.com          → redirect to the visitor's region + language
 *   eu.hephastusdev.com/fr/…  → rewrite to /eu/fr/… (app/(site)/[region]/[locale])
 *   bd.hephastusdev.com/en/…  → rewrite to /bd/en/…
 *   admin.hephastusdev.com    → /admin/…
 *
 * Paths every host shares (API, uploads, static files) pass straight through,
 * tagged with the calling region so API routes know which site they serve.
 */

const BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|embedly|lighthouse|preview/i;

function isSharedPath(pathname: string) {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/uploads/") ||
    // Files served from /public, plus robots.txt and sitemap.xml.
    /\/[^/]+\.[a-z0-9]+$/i.test(pathname)
  );
}

function withRegionHeader(request: NextRequest, region: RegionSlug) {
  const headers = new Headers(request.headers);
  // Always overwrite: a client must not be able to pick its own region header.
  headers.set(REGION_HEADER, region);
  return headers;
}

/**
 * Pass through a request that belongs to no region, stripping any region
 * header a client sent. Headers are left untouched when there is nothing to
 * strip, so admin requests reach Next exactly as they arrived.
 */
function passThroughWithoutRegion(request: NextRequest) {
  if (!request.headers.has(REGION_HEADER)) return NextResponse.next();
  const headers = new Headers(request.headers);
  headers.delete(REGION_HEADER);
  return NextResponse.next({ request: { headers } });
}

export function middleware(request: NextRequest) {
  const host = resolveHost(requestHost(request.headers), rootDomain());
  const { pathname, search } = request.nextUrl;
  const acceptLanguage = request.headers.get("accept-language");
  const preference = parsePreference(request.cookies.get(PREF_COOKIE)?.value);

  if (host.kind === "admin") {
    if (isSharedPath(pathname) || pathname === "/admin" || pathname.startsWith("/admin/")) {
      return passThroughWithoutRegion(request);
    }
    return NextResponse.redirect(new URL("/admin", adminOrigin()));
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return NextResponse.redirect(new URL(pathname + search, adminOrigin()));
  }

  if (host.kind === "apex") {
    if (isSharedPath(pathname)) {
      return passThroughWithoutRegion(request);
    }

    const country = detectCountry({
      ipCountry: request.headers.get("cf-ipcountry"),
      acceptLanguage,
    });
    const region = preference?.region ?? regionForCountry(country);
    const { locale: pathLocale, rest } = splitLocalePath(pathname);
    const locale = isLocaleForRegion(region, pathLocale)
      ? pathLocale
      : preference?.region === region
        ? preference.locale
        : pickLocale(region, acceptLanguage);

    const target = new URL(`/${locale}${rest === "/" ? "" : rest}`, regionOrigin(region));
    target.search = search;
    // First-timers land with ?welcome=<country> so the page opens the chooser
    // pre-filled. Crawlers never get it — they should index the page itself.
    if (!preference && !BOT_UA.test(request.headers.get("user-agent") ?? "")) {
      target.searchParams.set(WELCOME_PARAM, country ?? "1");
    }
    return NextResponse.redirect(target);
  }

  const region = host.region;
  const headers = withRegionHeader(request, region);

  if (isSharedPath(pathname)) {
    return NextResponse.next({ request: { headers } });
  }

  const { locale, rest } = splitLocalePath(pathname);

  if (isLocaleForRegion(region, locale)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${region}/${locale}${rest}`;
    return NextResponse.rewrite(url, { request: { headers } });
  }

  // A language this region doesn't offer (bd/fr) → same page, region default.
  // No language at all → the visitor's saved or browser language.
  const fallback =
    locale !== null
      ? REGION_LOCALES[region][0]
      : preference?.region === region
        ? preference.locale
        : pickLocale(region, acceptLanguage);
  // Built from the configured origin, not request.nextUrl: behind the reverse
  // proxy the latter can carry the upstream's internal host and scheme.
  const path = `/${fallback}${locale !== null ? rest : pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(new URL(path + search, regionOrigin(region)));
}

export const config = {
  runtime: "nodejs",
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
