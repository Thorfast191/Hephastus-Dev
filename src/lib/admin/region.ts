import type { Region } from "@prisma/client";

/**
 * The region the admin is currently looking at, chosen with the switcher in
 * the admin header. "ALL" shows everything; pages that edit per-region data
 * (settings, availability) ask for a specific region instead.
 */
export type AdminRegion = Region | "ALL";

export const ADMIN_REGION_COOKIE = "admin_region";

export function parseAdminRegion(value: string | undefined): AdminRegion {
  return value === "EU" || value === "BD" ? value : "ALL";
}

/** Prisma `where` fragment for content shown on one or more sites (`regions` list). */
export function contentRegionWhere(region: AdminRegion) {
  return region === "ALL" ? {} : { regions: { has: region } };
}

/** Prisma `where` fragment for models with a single `region` column. */
export function regionWhere(region: AdminRegion) {
  return region === "ALL" ? {} : { region };
}

export const ADMIN_REGION_LABELS: Record<AdminRegion, string> = {
  ALL: "All sites",
  EU: "Europe",
  BD: "Bangladesh",
};
