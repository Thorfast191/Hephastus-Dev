"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const portfolioSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
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
  return portfolioSchema.parse({
    title: formData.get("title"),
    description: formData.get("description"),
    externalLink: formData.get("externalLink"),
    tags: formData.get("tags"),
    images: formData.get("images"),
  });
}

export async function createPortfolioItem(formData: FormData) {
  const parsed = readForm(formData);
  const maxOrder = await prisma.portfolioItem.aggregate({ _max: { order: true } });

  await prisma.portfolioItem.create({
    data: { ...parsed, order: (maxOrder._max.order ?? -1) + 1 },
  });

  revalidatePath("/admin/portfolio");
}

export async function updatePortfolioItem(id: string, formData: FormData) {
  const parsed = readForm(formData);
  await prisma.portfolioItem.update({ where: { id }, data: parsed });
  revalidatePath("/admin/portfolio");
}

export async function deletePortfolioItem(id: string) {
  await prisma.portfolioItem.delete({ where: { id } });
  revalidatePath("/admin/portfolio");
}

export async function toggleFeatured(id: string, featured: boolean) {
  await prisma.portfolioItem.update({ where: { id }, data: { featured } });
  revalidatePath("/admin/portfolio");
}

export async function movePortfolioItemUp(id: string) {
  const item = await prisma.portfolioItem.findUniqueOrThrow({ where: { id } });
  const prev = await prisma.portfolioItem.findFirst({
    where: { order: { lt: item.order } },
    orderBy: { order: "desc" },
  });
  if (!prev) return;

  await prisma.$transaction([
    prisma.portfolioItem.update({ where: { id: item.id }, data: { order: prev.order } }),
    prisma.portfolioItem.update({ where: { id: prev.id }, data: { order: item.order } }),
  ]);
  revalidatePath("/admin/portfolio");
}

export async function movePortfolioItemDown(id: string) {
  const item = await prisma.portfolioItem.findUniqueOrThrow({ where: { id } });
  const next = await prisma.portfolioItem.findFirst({
    where: { order: { gt: item.order } },
    orderBy: { order: "asc" },
  });
  if (!next) return;

  await prisma.$transaction([
    prisma.portfolioItem.update({ where: { id: item.id }, data: { order: next.order } }),
    prisma.portfolioItem.update({ where: { id: next.id }, data: { order: item.order } }),
  ]);
  revalidatePath("/admin/portfolio");
}
