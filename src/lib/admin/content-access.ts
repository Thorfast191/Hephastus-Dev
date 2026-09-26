import type { Region } from "@prisma/client";
import { assertAdmin } from "@/lib/admin-guard";
import { readRegions } from "./form";
import { lockedRegion } from "./permissions";
import { contentRegionWhere } from "./region";
import { getAdminRegion } from "./region-server";

/**
 * Which sites a saved content item is shown on. Region admins don't get to
 * choose — their items are always shown on their own site only, whatever the
 * form sent. Super admins use the "Show on" checkboxes.
 */
export async function regionsToSave(formData: FormData): Promise<Region[]> {
  const admin = await assertAdmin();
  const locked = lockedRegion(admin);
  return locked ? [locked] : readRegions(formData);
}

/**
 * Where to look for the neighbour to swap with when reordering.
 *
 * Super admins move items among those in their current view. Region admins
 * only among items exclusive to their site: swapping order with a shared
 * item would also reshuffle the other site's list.
 */
export async function reorderScope() {
  const admin = await assertAdmin();
  const locked = lockedRegion(admin);
  if (locked) return { regions: { equals: [locked] } };
  return contentRegionWhere(await getAdminRegion());
}
