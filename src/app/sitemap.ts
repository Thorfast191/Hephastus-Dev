import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { HREFLANG, REGIONS, REGION_LOCALES, type RegionSlug } from "@/lib/site/config";
import { requestHost, resolveHost } from "@/lib/site/routing";
import { regionOrigin, rootDomain } from "@/lib/site/env";

/**
 * Each host serves its own sitemap: eu.<domain>/sitemap.xml lists the EU pages,
 * bd.<domain>/sitemap.xml the BD ones. Every entry carries hreflang alternates
 * to all variants, so search engines see the sites as translations of one another.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = resolveHost(requestHost(await headers()), rootDomain());
  const regions: readonly RegionSlug[] = host.kind === "region" ? [host.region] : REGIONS;

  const alternates = Object.fromEntries(
    REGIONS.flatMap((region) =>
      REGION_LOCALES[region].map((locale) => [
        HREFLANG[region][locale]!,
        `${regionOrigin(region)}/${locale}`,
      ])
    )
  );

  return regions.flatMap((region) =>
    REGION_LOCALES[region].map((locale) => ({
      url: `${regionOrigin(region)}/${locale}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 1,
      alternates: { languages: alternates },
    }))
  );
}
