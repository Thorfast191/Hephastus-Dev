"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertAdmin, assertCanEditContent } from "@/lib/admin-guard";
import { regionsToSave, reorderScope } from "@/lib/admin/content-access";
import { revalidatePublicSite } from "@/lib/site/revalidate";
import { readLocalized } from "@/lib/admin/form";

const serviceSchema = z.object({
  icon: z.string().min(1, "Icon is required"),
  tags: z.string().transform((v) =>
    v
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
  ),
});

function readForm(formData: FormData) {
  return {
    ...serviceSchema.parse({
      icon: formData.get("icon"),
      tags: formData.get("tags") ?? "",
    }),
    title: readLocalized(formData, "title"),
    description: readLocalized(formData, "description"),
  };
}

/** Region admins may only change items shown on their own site alone. */
async function assertEditable(id: string) {
  await assertAdmin();
  const { regions } = await prisma.service.findUniqueOrThrow({
    where: { id },
    select: { regions: true },
  });
  await assertCanEditContent(regions);
}

export async function createService(formData: FormData) {
  await assertAdmin();
  const parsed = readForm(formData);

  const maxOrder = await prisma.service.aggregate({ _max: { order: true } });

  await prisma.service.create({
    data: {
      ...parsed,
      regions: await regionsToSave(formData),
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  revalidatePath("/admin/services");
  revalidatePublicSite();
}

export async function updateService(id: string, formData: FormData) {
  await assertEditable(id);
  const parsed = readForm(formData);

  await prisma.service.update({
    where: { id },
    data: { ...parsed, regions: await regionsToSave(formData) },
  });
  revalidatePath("/admin/services");
  revalidatePublicSite();
}

export async function deleteService(id: string) {
  await assertEditable(id);
  await prisma.service.delete({ where: { id } });
  revalidatePath("/admin/services");
  revalidatePublicSite();
}

export async function toggleServiceActive(id: string, active: boolean) {
  await assertEditable(id);
  await prisma.service.update({ where: { id }, data: { active } });
  revalidatePath("/admin/services");
  revalidatePublicSite();
}

export async function moveServiceUp(id: string) {
  await assertEditable(id);
  const service = await prisma.service.findUniqueOrThrow({ where: { id } });
  const prev = await prisma.service.findFirst({
    where: { order: { lt: service.order }, ...(await reorderScope()) },
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
  revalidatePublicSite();
}

export async function moveServiceDown(id: string) {
  await assertEditable(id);
  const service = await prisma.service.findUniqueOrThrow({ where: { id } });
  const next = await prisma.service.findFirst({
    where: { order: { gt: service.order }, ...(await reorderScope()) },
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
  revalidatePublicSite();
}
