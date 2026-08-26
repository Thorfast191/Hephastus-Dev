"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const serviceSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  icon: z.string().min(1, "Icon is required"),
});

export async function createService(formData: FormData) {
  const parsed = serviceSchema.parse({
    title: formData.get("title"),
    description: formData.get("description"),
    icon: formData.get("icon"),
  });

  const maxOrder = await prisma.service.aggregate({ _max: { order: true } });

  await prisma.service.create({
    data: {
      ...parsed,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  revalidatePath("/admin/services");
}

export async function updateService(id: string, formData: FormData) {
  const parsed = serviceSchema.parse({
    title: formData.get("title"),
    description: formData.get("description"),
    icon: formData.get("icon"),
  });

  await prisma.service.update({ where: { id }, data: parsed });
  revalidatePath("/admin/services");
}

export async function deleteService(id: string) {
  await prisma.service.delete({ where: { id } });
  revalidatePath("/admin/services");
}

export async function toggleServiceActive(id: string, active: boolean) {
  await prisma.service.update({ where: { id }, data: { active } });
  revalidatePath("/admin/services");
}

export async function moveServiceUp(id: string) {
  const service = await prisma.service.findUniqueOrThrow({ where: { id } });
  const prev = await prisma.service.findFirst({
    where: { order: { lt: service.order } },
    orderBy: { order: "desc" },
  });
  if (!prev) return;

  await prisma.$transaction([
    prisma.service.update({
      where: { id: service.id },
      data: { order: prev.order },
    }),
    prisma.service.update({
      where: { id: prev.id },
      data: { order: service.order },
    }),
  ]);
  revalidatePath("/admin/services");
}

export async function moveServiceDown(id: string) {
  const service = await prisma.service.findUniqueOrThrow({ where: { id } });
  const next = await prisma.service.findFirst({
    where: { order: { gt: service.order } },
    orderBy: { order: "asc" },
  });
  if (!next) return;

  await prisma.$transaction([
    prisma.service.update({
      where: { id: service.id },
      data: { order: next.order },
    }),
    prisma.service.update({
      where: { id: next.id },
      data: { order: service.order },
    }),
  ]);
  revalidatePath("/admin/services");
}
