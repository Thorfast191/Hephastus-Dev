"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertAdmin, assertRegionAccess } from "@/lib/admin-guard";

async function assertOwnLead(id: string) {
  await assertAdmin();
  const { region } = await prisma.lead.findUniqueOrThrow({ where: { id }, select: { region: true } });
  await assertRegionAccess(region);
}

const updateLeadSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "WON", "LOST"]),
  notes: z.string(),
});

export async function updateLead(
  id: string,
  data: { status: string; notes: string }
) {
  await assertOwnLead(id);
  const parsed = updateLeadSchema.parse(data);
  await prisma.lead.update({ where: { id }, data: parsed });
  revalidatePath("/admin/leads");
  revalidatePath("/admin");
}

export async function deleteLead(id: string) {
  await assertOwnLead(id);
  await prisma.lead.delete({ where: { id } });
  revalidatePath("/admin/leads");
  revalidatePath("/admin");
}
