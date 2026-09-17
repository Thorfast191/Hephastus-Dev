"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/admin-guard";

const faqSchema = z.object({
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
});

function readForm(formData: FormData) {
  return faqSchema.parse({
    question: formData.get("question"),
    answer: formData.get("answer"),
  });
}

export async function createFaq(formData: FormData) {
  await assertAdmin();
  const parsed = readForm(formData);
  const maxOrder = await prisma.faq.aggregate({ _max: { order: true } });

  await prisma.faq.create({
    data: { ...parsed, order: (maxOrder._max.order ?? -1) + 1 },
  });

  revalidatePath("/admin/faqs");
  revalidatePath("/");
}

export async function updateFaq(id: string, formData: FormData) {
  await assertAdmin();
  const parsed = readForm(formData);
  await prisma.faq.update({ where: { id }, data: parsed });
  revalidatePath("/admin/faqs");
  revalidatePath("/");
}

export async function deleteFaq(id: string) {
  await assertAdmin();
  await prisma.faq.delete({ where: { id } });
  revalidatePath("/admin/faqs");
  revalidatePath("/");
}

export async function toggleFaqActive(id: string, active: boolean) {
  await assertAdmin();
  await prisma.faq.update({ where: { id }, data: { active } });
  revalidatePath("/admin/faqs");
  revalidatePath("/");
}

export async function moveFaqUp(id: string) {
  await assertAdmin();
  const faq = await prisma.faq.findUniqueOrThrow({ where: { id } });
  const prev = await prisma.faq.findFirst({
    where: { order: { lt: faq.order } },
    orderBy: { order: "desc" },
  });
  if (!prev) return;

  await prisma.$transaction([
    prisma.faq.update({ where: { id: faq.id }, data: { order: prev.order } }),
    prisma.faq.update({ where: { id: prev.id }, data: { order: faq.order } }),
  ]);
  revalidatePath("/admin/faqs");
  revalidatePath("/");
}

export async function moveFaqDown(id: string) {
  await assertAdmin();
  const faq = await prisma.faq.findUniqueOrThrow({ where: { id } });
  const next = await prisma.faq.findFirst({
    where: { order: { gt: faq.order } },
    orderBy: { order: "asc" },
  });
  if (!next) return;

  await prisma.$transaction([
    prisma.faq.update({ where: { id: faq.id }, data: { order: next.order } }),
    prisma.faq.update({ where: { id: next.id }, data: { order: faq.order } }),
  ]);
  revalidatePath("/admin/faqs");
  revalidatePath("/");
}
