"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertAdmin, assertCanEditContent } from "@/lib/admin-guard";
import { regionsToSave, reorderScope } from "@/lib/admin/content-access";
import { revalidatePublicSite } from "@/lib/site/revalidate";
import { readLocalized } from "@/lib/admin/form";

const testimonialSchema = z.object({
  authorName: z.string().min(1, "Author name is required"),
  company: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v)),
  photo: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v)),
});

function readForm(formData: FormData) {
  return {
    ...testimonialSchema.parse({
      authorName: formData.get("authorName"),
      company: formData.get("company"),
      photo: formData.get("photo"),
    }),
    quote: readLocalized(formData, "quote"),
  };
}

/** Region admins may only change items shown on their own site alone. */
async function assertEditable(id: string) {
  await assertAdmin();
  const { regions } = await prisma.testimonial.findUniqueOrThrow({
    where: { id },
    select: { regions: true },
  });
  await assertCanEditContent(regions);
}

export async function createTestimonial(formData: FormData) {
  await assertAdmin();
  const parsed = readForm(formData);
  const maxOrder = await prisma.testimonial.aggregate({ _max: { order: true } });

  await prisma.testimonial.create({
    data: {
      ...parsed,
      regions: await regionsToSave(formData),
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  revalidatePath("/admin/testimonials");
  revalidatePublicSite();
}

export async function updateTestimonial(id: string, formData: FormData) {
  await assertEditable(id);
  const parsed = readForm(formData);
  await prisma.testimonial.update({
    where: { id },
    data: { ...parsed, regions: await regionsToSave(formData) },
  });
  revalidatePath("/admin/testimonials");
  revalidatePublicSite();
}

export async function deleteTestimonial(id: string) {
  await assertEditable(id);
  await prisma.testimonial.delete({ where: { id } });
  revalidatePath("/admin/testimonials");
  revalidatePublicSite();
}

export async function toggleTestimonialActive(id: string, active: boolean) {
  await assertEditable(id);
  await prisma.testimonial.update({ where: { id }, data: { active } });
  revalidatePath("/admin/testimonials");
  revalidatePublicSite();
}

export async function moveTestimonialUp(id: string) {
  await assertEditable(id);
  const testimonial = await prisma.testimonial.findUniqueOrThrow({ where: { id } });
  const prev = await prisma.testimonial.findFirst({
    where: { order: { lt: testimonial.order }, ...(await reorderScope()) },
    orderBy: { order: "desc" },
  });
  if (!prev) return;

  await prisma.$transaction([
    prisma.testimonial.update({
      where: { id: testimonial.id },
      data: { order: prev.order },
    }),
    prisma.testimonial.update({
      where: { id: prev.id },
      data: { order: testimonial.order },
    }),
  ]);
  revalidatePath("/admin/testimonials");
  revalidatePublicSite();
}

export async function moveTestimonialDown(id: string) {
  await assertEditable(id);
  const testimonial = await prisma.testimonial.findUniqueOrThrow({ where: { id } });
  const next = await prisma.testimonial.findFirst({
    where: { order: { gt: testimonial.order }, ...(await reorderScope()) },
    orderBy: { order: "asc" },
  });
  if (!next) return;

  await prisma.$transaction([
    prisma.testimonial.update({
      where: { id: testimonial.id },
      data: { order: next.order },
    }),
    prisma.testimonial.update({
      where: { id: next.id },
      data: { order: testimonial.order },
    }),
  ]);
  revalidatePath("/admin/testimonials");
  revalidatePublicSite();
}
