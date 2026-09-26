import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { requestHost, resolveHost } from "@/lib/site/routing";
import { apexOrigin, regionOrigin, rootDomain } from "@/lib/site/env";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = resolveHost(requestHost(await headers()), rootDomain());

  if (host.kind === "admin") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  const origin = host.kind === "region" ? regionOrigin(host.region) : apexOrigin();
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
    sitemap: `${origin}/sitemap.xml`,
  };
}
