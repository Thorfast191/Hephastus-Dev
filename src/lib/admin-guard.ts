import { cache } from "react";
import { redirect } from "next/navigation";
import type { Region } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  canAccessRegion,
  canEditContent,
  isSuperAdmin,
  type Viewer,
} from "@/lib/admin/permissions";

export type AdminContext = Viewer & { id: string; email: string; name: string };

/**
 * The signed-in admin, read fresh from the database once per request. The
 * session only proves who they are; role and region come from here, so a
 * demoted or deleted admin loses access on their very next request instead
 * of whenever their session cookie expires.
 */
export const getAdminContext = cache(async (): Promise<AdminContext | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;

  const user = await prisma.adminUser.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true, region: true },
  });
  if (!user) return null;
  // The DB forbids this (CHECK constraint); refuse rather than treat as unrestricted.
  if (user.role === "REGION_ADMIN" && !user.region) return null;
  return user;
});

/**
 * Guard for admin-only Server Actions. The `(protected)` layout only guards
 * *page renders* — Server Actions are POST endpoints that can be invoked
 * directly, so every mutating action must assert a session itself.
 */
export async function assertAdmin(): Promise<AdminContext> {
  const admin = await getAdminContext();
  if (!admin) throw new Error("Unauthorized");
  return admin;
}

/** For super-admin-only *pages*: region admins are sent back to the dashboard. */
export async function requireSuperAdminPage(): Promise<AdminContext> {
  const admin = await getAdminContext();
  if (!admin) redirect("/admin/login");
  if (!isSuperAdmin(admin)) redirect("/admin");
  return admin;
}

export async function assertSuperAdmin(): Promise<AdminContext> {
  const admin = await assertAdmin();
  if (!isSuperAdmin(admin)) throw new Error("Only a super admin can do that");
  return admin;
}

/** For records that belong to one region (leads, meetings, settings, availability). */
export async function assertRegionAccess(region: Region): Promise<AdminContext> {
  const admin = await assertAdmin();
  if (!canAccessRegion(admin, region)) throw new Error("That belongs to another site");
  return admin;
}

/** For content shown on one or more sites (services, portfolio, …). */
export async function assertCanEditContent(regions: readonly Region[]): Promise<AdminContext> {
  const admin = await assertAdmin();
  if (!canEditContent(admin, regions)) {
    throw new Error("Only a super admin can change content shared with another site");
  }
  return admin;
}
