import { describe, expect, it } from "vitest";
import {
  cookieDomainFor,
  detectCountry,
  parseAcceptLanguage,
  parsePreference,
  pickLocale,
  regionForCountry,
  requestHost,
  resolveHost,
  serializePreference,
  splitLocalePath,
} from "./routing";

describe("resolveHost", () => {
  const root = "hephastusdev.com";

  it("recognises the apex, region and admin hosts", () => {
    expect(resolveHost("hephastusdev.com", root)).toEqual({ kind: "apex" });
    expect(resolveHost("eu.hephastusdev.com", root)).toEqual({ kind: "region", region: "eu" });
    expect(resolveHost("bd.hephastusdev.com", root)).toEqual({ kind: "region", region: "bd" });
    expect(resolveHost("admin.hephastusdev.com", root)).toEqual({ kind: "admin" });
  });

  it("is case-insensitive", () => {
    expect(resolveHost("EU.HephastusDev.com", root)).toEqual({ kind: "region", region: "eu" });
  });

  it("treats unknown subdomains, foreign hosts and missing hosts as the apex", () => {
    expect(resolveHost("www.hephastusdev.com", root)).toEqual({ kind: "apex" });
    expect(resolveHost("us.hephastusdev.com", root)).toEqual({ kind: "apex" });
    expect(resolveHost("evil-hephastusdev.com", root)).toEqual({ kind: "apex" });
    expect(resolveHost("127.0.0.1:3000", root)).toEqual({ kind: "apex" });
    expect(resolveHost(null, root)).toEqual({ kind: "apex" });
  });

  it("matches ports when the root domain carries one (local dev)", () => {
    expect(resolveHost("eu.localhost:3000", "localhost:3000")).toEqual({
      kind: "region",
      region: "eu",
    });
    expect(resolveHost("localhost:3000", "localhost:3000")).toEqual({ kind: "apex" });
    expect(resolveHost("eu.localhost:4000", "localhost:3000")).toEqual({ kind: "apex" });
  });
});

describe("requestHost", () => {
  const headers = (h: Record<string, string>) => new Headers(h);

  it("prefers X-Forwarded-Host (Next's internal fetches use localhost as Host)", () => {
    expect(
      requestHost(headers({ host: "localhost:3000", "x-forwarded-host": "admin.hephastusdev.com" }))
    ).toBe("admin.hephastusdev.com");
  });

  it("takes the first of several forwarded hosts", () => {
    expect(requestHost(headers({ "x-forwarded-host": "eu.a.com, proxy.internal" }))).toBe("eu.a.com");
  });

  it("falls back to Host", () => {
    expect(requestHost(headers({ host: "bd.hephastusdev.com" }))).toBe("bd.hephastusdev.com");
    expect(requestHost(headers({}))).toBeNull();
  });
});

describe("regionForCountry", () => {
  it("sends Bangladesh to bd and everyone else to eu", () => {
    expect(regionForCountry("BD")).toBe("bd");
    expect(regionForCountry("bd")).toBe("bd");
    expect(regionForCountry("FR")).toBe("eu");
    expect(regionForCountry("US")).toBe("eu");
    expect(regionForCountry(null)).toBe("eu");
  });
});

describe("parseAcceptLanguage", () => {
  it("orders by q-value, keeping header order for ties", () => {
    expect(parseAcceptLanguage("en-US;q=0.8, fr-FR, de;q=0.8")).toEqual([
      { language: "fr", country: "FR", q: 1 },
      { language: "en", country: "US", q: 0.8 },
      { language: "de", country: null, q: 0.8 },
    ]);
  });

  it("drops wildcards and zero-weighted tags", () => {
    expect(parseAcceptLanguage("*, fr;q=0")).toEqual([]);
    expect(parseAcceptLanguage(null)).toEqual([]);
  });
});

describe("pickLocale", () => {
  it("returns the first accepted language the region offers", () => {
    expect(pickLocale("eu", "de-DE, fr;q=0.9, en;q=0.8")).toBe("fr");
    expect(pickLocale("eu", "en-GB,en;q=0.9")).toBe("en");
  });

  it("never offers French on the Bangladesh site", () => {
    expect(pickLocale("bd", "fr-FR")).toBe("en");
  });

  it("falls back to the region default", () => {
    expect(pickLocale("eu", "ja-JP")).toBe("en");
    expect(pickLocale("eu", null)).toBe("en");
  });
});

describe("detectCountry", () => {
  it("prefers the Cloudflare country header", () => {
    expect(detectCountry({ ipCountry: "bd", acceptLanguage: "fr-FR" })).toBe("BD");
  });

  it("ignores Cloudflare's unknown and Tor codes", () => {
    expect(detectCountry({ ipCountry: "XX", acceptLanguage: "fr-FR" })).toBe("FR");
    expect(detectCountry({ ipCountry: "T1", acceptLanguage: null })).toBeNull();
  });

  it("uses the language country subtag, then Bangla, as fallbacks", () => {
    expect(detectCountry({ ipCountry: null, acceptLanguage: "en-BD,en;q=0.9" })).toBe("BD");
    expect(detectCountry({ ipCountry: null, acceptLanguage: "bn,en;q=0.5" })).toBe("BD");
    expect(detectCountry({ ipCountry: null, acceptLanguage: "en" })).toBeNull();
  });
});

describe("preference cookie", () => {
  it("round-trips", () => {
    const pref = { region: "eu", locale: "fr", country: "FR" } as const;
    expect(parsePreference(serializePreference(pref))).toEqual(pref);
    expect(parsePreference("bd:en:")).toEqual({ region: "bd", locale: "en", country: null });
  });

  it("rejects values that name an unknown region or an unoffered language", () => {
    expect(parsePreference("us:en:US")).toBeNull();
    expect(parsePreference("bd:fr:BD")).toBeNull();
    expect(parsePreference("garbage")).toBeNull();
    expect(parsePreference(undefined)).toBeNull();
  });

  it("drops a malformed country rather than the whole preference", () => {
    expect(parsePreference("eu:en:<script>")).toEqual({
      region: "eu",
      locale: "en",
      country: null,
    });
  });
});

describe("splitLocalePath", () => {
  it("separates a leading language segment", () => {
    expect(splitLocalePath("/fr")).toEqual({ locale: "fr", rest: "" });
    expect(splitLocalePath("/fr/services")).toEqual({ locale: "fr", rest: "/services" });
    expect(splitLocalePath("/EN/x")).toEqual({ locale: "en", rest: "/x" });
  });

  it("leaves paths without one alone", () => {
    expect(splitLocalePath("/")).toEqual({ locale: null, rest: "/" });
    expect(splitLocalePath("/services")).toEqual({ locale: null, rest: "/services" });
  });
});

describe("cookieDomainFor", () => {
  it("shares cookies across subdomains in production", () => {
    expect(cookieDomainFor("hephastusdev.com")).toBe(".hephastusdev.com");
  });

  it("uses host-only cookies where browsers reject a Domain", () => {
    expect(cookieDomainFor("localhost:3000")).toBeUndefined();
    expect(cookieDomainFor("127.0.0.1:3000")).toBeUndefined();
  });
});
