"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertAdmin, assertCanEditContent } from "@/lib/admin-guard";
import { regionsToSave, reorderScope } from "@/lib/admin/content-access";
import { revalidatePublicSite } from "@/lib/site/revalidate";
import { readLocalized } from "@/lib/admin/form";

function readForm(formData: FormData) {
  return {
    question: readLocalized(formData, "question"),
    answer: readLocalized(formData, "answer"),
  };
}

/** Region admins may only change items shown on their own site alone. */
async function assertEditable(id: string) {
  await assertAdmin();
  const { regions } = await prisma.faq.findUniqueOrThrow({
    where: { id },
    select: { regions: true },
  });
  await assertCanEditContent(regions);
}

export async function createFaq(formData: FormData) {
  await assertAdmin();
  const parsed = readForm(formData);
  const maxOrder = await prisma.faq.aggregate({ _max: { order: true } });

  await prisma.faq.create({
    data: {
      ...parsed,
      regions: await regionsToSave(formData),
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  revalidatePath("/admin/faqs");
  revalidatePublicSite();
}

export async function updateFaq(id: string, formData: FormData) {
  await assertEditable(id);
  const parsed = readForm(formData);
  await prisma.faq.update({
    where: { id },
    data: { ...parsed, regions: await regionsToSave(formData) },
  });
  revalidatePath("/admin/faqs");
  revalidatePublicSite();
}

export async function deleteFaq(id: string) {
  await assertEditable(id);
  await prisma.faq.delete({ where: { id } });
  revalidatePath("/admin/faqs");
  revalidatePublicSite();
}

export async function toggleFaqActive(id: string, active: boolean) {
  await assertEditable(id);
  await prisma.faq.update({ where: { id }, data: { active } });
  revalidatePath("/admin/faqs");
  revalidatePublicSite();
}

export async function moveFaqUp(id: string) {
  await assertEditable(id);
  const faq = await prisma.faq.findUniqueOrThrow({ where: { id } });
  const prev = await prisma.faq.findFirst({
    where: { order: { lt: faq.order }, ...(await reorderScope()) },
    orderBy: { order: "desc" },
  });
  if (!prev) return;

  await prisma.$transaction([
    prisma.faq.update({ where: { id: faq.id }, data: { order: prev.order } }),
    prisma.faq.update({ where: { id: prev.id }, data: { order: faq.order } }),
  ]);
  revalidatePath("/admin/faqs");
  revalidatePublicSite();
}

export async function moveFaqDown(id: string) {
  await assertEditable(id);
  const faq = await prisma.faq.findUniqueOrThrow({ where: { id } });
  const next = await prisma.faq.findFirst({
    where: { order: { gt: faq.order }, ...(await reorderScope()) },
    orderBy: { order: "asc" },
  });
  if (!next) return;

  await prisma.$transaction([
    prisma.faq.update({ where: { id: faq.id }, data: { order: next.order } }),
    prisma.faq.update({ where: { id: next.id }, data: { order: faq.order } }),
  ]);
  revalidatePath("/admin/faqs");
  revalidatePublicSite();
}
