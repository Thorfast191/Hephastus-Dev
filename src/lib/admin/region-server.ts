import { cookies } from "next/headers";
import { getAdminContext } from "@/lib/admin-guard";
import { lockedRegion } from "./permissions";
import { ADMIN_REGION_COOKIE, parseAdminRegion, type AdminRegion } from "./region";

/**
 * The region the admin is looking at (server components and actions only).
 * Super admins choose it with the header switcher; region admins are always
 * pinned to their own region, whatever the cookie says.
 */
export async function getAdminRegion(): Promise<AdminRegion> {
  const admin = await getAdminContext();
  const locked = admin ? lockedRegion(admin) : null;
  if (locked) return locked;

  const store = await cookies();
  return parseAdminRegion(store.get(ADMIN_REGION_COOKIE)?.value);
}
