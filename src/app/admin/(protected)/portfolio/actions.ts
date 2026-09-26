"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertAdmin, assertCanEditContent } from "@/lib/admin-guard";
import { regionsToSave, reorderScope } from "@/lib/admin/content-access";
import { revalidatePublicSite } from "@/lib/site/revalidate";
import { readLocalized } from "@/lib/admin/form";

const portfolioSchema = z.object({
  externalLink: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v)),
  tags: z.string().transform((v) =>
    v
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
  ),
  images: z.string().transform((v) => JSON.parse(v) as string[]),
});

function readForm(formData: FormData) {
  return {
    ...portfolioSchema.parse({
      externalLink: formData.get("externalLink"),
      tags: formData.get("tags"),
      images: formData.get("images"),
    }),
    title: readLocalized(formData, "title"),
    description: readLocalized(formData, "description"),
  };
}

/** Region admins may only change items shown on their own site alone. */
async function assertEditable(id: string) {
  await assertAdmin();
  const { regions } = await prisma.portfolioItem.findUniqueOrThrow({
    where: { id },
    select: { regions: true },
  });
  await assertCanEditContent(regions);
}

export async function createPortfolioItem(formData: FormData) {
  await assertAdmin();
  const parsed = readForm(formData);
  const maxOrder = await prisma.portfolioItem.aggregate({ _max: { order: true } });

  await prisma.portfolioItem.create({
    data: {
      ...parsed,
      regions: await regionsToSave(formData),
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  revalidatePath("/admin/portfolio");
  revalidatePublicSite();
}

export async function updatePortfolioItem(id: string, formData: FormData) {
  await assertEditable(id);
  const parsed = readForm(formData);
  await prisma.portfolioItem.update({
    where: { id },
    data: { ...parsed, regions: await regionsToSave(formData) },
  });
  revalidatePath("/admin/portfolio");
  revalidatePublicSite();
}

export async function deletePortfolioItem(id: string) {
  await assertEditable(id);
  await prisma.portfolioItem.delete({ where: { id } });
  revalidatePath("/admin/portfolio");
  revalidatePublicSite();
}

export async function togglePortfolioActive(id: string, active: boolean) {
  await assertEditable(id);
  await prisma.portfolioItem.update({ where: { id }, data: { active } });
  revalidatePath("/admin/portfolio");
  revalidatePublicSite();
}

export async function toggleFeatured(id: string, featured: boolean) {
  await assertEditable(id);
  await prisma.portfolioItem.update({ where: { id }, data: { featured } });
  revalidatePath("/admin/portfolio");
  revalidatePublicSite();
}

export async function movePortfolioItemUp(id: string) {
  await assertEditable(id);
  const item = await prisma.portfolioItem.findUniqueOrThrow({ where: { id } });
  const prev = await prisma.portfolioItem.findFirst({
    where: { order: { lt: item.order }, ...(await reorderScope()) },
    orderBy: { order: "desc" },
  });
  if (!prev) return;

  await prisma.$transaction([
    prisma.portfolioItem.update({ where: { id: item.id }, data: { order: prev.order } }),
    prisma.portfolioItem.update({ where: { id: prev.id }, data: { order: item.order } }),
  ]);
  revalidatePath("/admin/portfolio");
  revalidatePublicSite();
}

export async function movePortfolioItemDown(id: string) {
  await assertEditable(id);
  const item = await prisma.portfolioItem.findUniqueOrThrow({ where: { id } });
  const next = await prisma.portfolioItem.findFirst({
    where: { order: { gt: item.order }, ...(await reorderScope()) },
    orderBy: { order: "asc" },
  });
  if (!next) return;

  await prisma.$transaction([
    prisma.portfolioItem.update({ where: { id: item.id }, data: { order: next.order } }),
    prisma.portfolioItem.update({ where: { id: next.id }, data: { order: item.order } }),
  ]);
  revalidatePath("/admin/portfolio");
  revalidatePublicSite();
}
