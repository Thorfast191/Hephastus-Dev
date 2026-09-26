import { originFor } from "./routing";
import type { RegionSlug } from "./config";
import { ADMIN_SUBDOMAIN } from "./config";

/**
 * `ROOT_DOMAIN` is the bare domain every site hangs off (`hephastusdev.com`),
 * or `localhost:3000` in development — `eu.localhost:3000` resolves to
 * 127.0.0.1 in every modern browser, so subdomains work locally unchanged.
 */
export function rootDomain(): string {
  return process.env.ROOT_DOMAIN || "localhost:3000";
}

export function siteProtocol(): string {
  return process.env.SITE_PROTOCOL || (process.env.NODE_ENV === "production" ? "https" : "http");
}

export function regionOrigin(region: RegionSlug): string {
  return originFor(region, rootDomain(), siteProtocol());
}

export function adminOrigin(): string {
  return originFor(ADMIN_SUBDOMAIN, rootDomain(), siteProtocol());
}

export function apexOrigin(): string {
  return originFor(null, rootDomain(), siteProtocol());
}
