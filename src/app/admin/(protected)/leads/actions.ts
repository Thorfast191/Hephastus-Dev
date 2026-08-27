"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const updateLeadSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "WON", "LOST"]),
  notes: z.string(),
});

export async function updateLead(
  id: string,
  data: { status: string; notes: string }
) {
  const parsed = updateLeadSchema.parse(data);
  await prisma.lead.update({ where: { id }, data: parsed });
  revalidatePath("/admin/leads");
  revalidatePath("/admin");
}
