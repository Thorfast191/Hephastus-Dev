import type { AdminRole, Region } from "@prisma/client";

/**
 * Who may do what in the admin. Pure functions over plain data, shared by
 * server actions (which enforce them) and client tables (which use them to
 * disable controls) so the two can never disagree.
 *
 * - SUPER_ADMIN: everything, including other admin accounts and the team.
 * - REGION_ADMIN: only their region — its leads, meetings, settings and
 *   availability, and content shown on *their site alone*. Content shared
 *   with another site is read-only for them: editing it would change what
 *   the other region's visitors see.
 */

export type Viewer = { role: AdminRole; region: Region | null };

export function isSuperAdmin(viewer: Viewer) {
  return viewer.role === "SUPER_ADMIN";
}

/** The one region a region admin is confined to; null for super admins. */
export function lockedRegion(viewer: Viewer): Region | null {
  return viewer.role === "REGION_ADMIN" ? viewer.region : null;
}

export function canAccessRegion(viewer: Viewer, region: Region) {
  return isSuperAdmin(viewer) || viewer.region === region;
}

/** May this viewer change an item shown on `regions`? */
export function canEditContent(viewer: Viewer, regions: readonly Region[]) {
  if (isSuperAdmin(viewer)) return true;
  return regions.length === 1 && regions[0] === viewer.region;
}

/** Why a region admin can't edit an item, for a tooltip. */
export function contentLockReason(viewer: Viewer, regions: readonly Region[]) {
  if (canEditContent(viewer, regions)) return null;
  return regions.length > 1 ? "Shared — super admin only" : "Other site — super admin only";
}

export const ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: "Super admin",
  REGION_ADMIN: "Region admin",
};
