"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { assertSuperAdmin } from "@/lib/admin-guard";
import { ADMIN_REGION_COOKIE, parseAdminRegion } from "@/lib/admin/region";

export async function setAdminRegion(value: string) {
  // Region admins are pinned to their region; only super admins switch.
  await assertSuperAdmin();
  const store = await cookies();
  store.set(ADMIN_REGION_COOKIE, parseAdminRegion(value), {
    path: "/admin",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/admin", "layout");
}
