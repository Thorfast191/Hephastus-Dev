"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/admin-guard";

const updateLeadSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "WON", "LOST"]),
  notes: z.string(),
});

export async function updateLead(
  id: string,
  data: { status: string; notes: string }
) {
  await assertAdmin();
  const parsed = updateLeadSchema.parse(data);
  await prisma.lead.update({ where: { id }, data: parsed });
  revalidatePath("/admin/leads");
  revalidatePath("/admin");
}

export async function deleteLead(id: string) {
  await assertAdmin();
  await prisma.lead.delete({ where: { id } });
  revalidatePath("/admin/leads");
  revalidatePath("/admin");
}
