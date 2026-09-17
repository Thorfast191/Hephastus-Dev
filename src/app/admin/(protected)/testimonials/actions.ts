"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/admin-guard";

const testimonialSchema = z.object({
  quote: z.string().min(1, "Quote is required"),
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
  return testimonialSchema.parse({
    quote: formData.get("quote"),
    authorName: formData.get("authorName"),
    company: formData.get("company"),
    photo: formData.get("photo"),
  });
}

export async function createTestimonial(formData: FormData) {
  await assertAdmin();
  const parsed = readForm(formData);
  const maxOrder = await prisma.testimonial.aggregate({ _max: { order: true } });

  await prisma.testimonial.create({
    data: { ...parsed, order: (maxOrder._max.order ?? -1) + 1 },
  });

  revalidatePath("/admin/testimonials");
  revalidatePath("/");
}

export async function updateTestimonial(id: string, formData: FormData) {
  await assertAdmin();
  const parsed = readForm(formData);
  await prisma.testimonial.update({ where: { id }, data: parsed });
  revalidatePath("/admin/testimonials");
  revalidatePath("/");
}

export async function deleteTestimonial(id: string) {
  await assertAdmin();
  await prisma.testimonial.delete({ where: { id } });
  revalidatePath("/admin/testimonials");
  revalidatePath("/");
}

export async function toggleTestimonialActive(id: string, active: boolean) {
  await assertAdmin();
  await prisma.testimonial.update({ where: { id }, data: { active } });
  revalidatePath("/admin/testimonials");
  revalidatePath("/");
}

export async function moveTestimonialUp(id: string) {
  await assertAdmin();
  const testimonial = await prisma.testimonial.findUniqueOrThrow({ where: { id } });
  const prev = await prisma.testimonial.findFirst({
    where: { order: { lt: testimonial.order } },
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
  revalidatePath("/");
}

export async function moveTestimonialDown(id: string) {
  await assertAdmin();
  const testimonial = await prisma.testimonial.findUniqueOrThrow({ where: { id } });
  const next = await prisma.testimonial.findFirst({
    where: { order: { gt: testimonial.order } },
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
  revalidatePath("/");
}
