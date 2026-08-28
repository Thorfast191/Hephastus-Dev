"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const ruleSchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startTime: z.string().regex(TIME_REGEX, "Use HH:MM, e.g. 09:00"),
    endTime: z.string().regex(TIME_REGEX, "Use HH:MM, e.g. 17:00"),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "Start time must be before end time",
    path: ["endTime"],
  });

function readRuleForm(formData: FormData) {
  return ruleSchema.parse({
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });
}

export async function createRule(formData: FormData) {
  const parsed = readRuleForm(formData);
  await prisma.availabilityRule.create({ data: parsed });
  revalidatePath("/admin/availability");
}

export async function updateRule(id: string, formData: FormData) {
  const parsed = readRuleForm(formData);
  await prisma.availabilityRule.update({ where: { id }, data: parsed });
  revalidatePath("/admin/availability");
}

export async function deleteRule(id: string) {
  await prisma.availabilityRule.delete({ where: { id } });
  revalidatePath("/admin/availability");
}

export async function toggleRuleActive(id: string, active: boolean) {
  await prisma.availabilityRule.update({ where: { id }, data: { active } });
  revalidatePath("/admin/availability");
}

const blackoutSchema = z.object({
  date: z.string().min(1),
  reason: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v)),
});

export async function createBlackout(formData: FormData) {
  const parsed = blackoutSchema.parse({
    date: formData.get("date"),
    reason: formData.get("reason"),
  });
  await prisma.blackoutDate.create({
    data: { date: new Date(parsed.date), reason: parsed.reason },
  });
  revalidatePath("/admin/availability");
}

export async function deleteBlackout(id: string) {
  await prisma.blackoutDate.delete({ where: { id } });
  revalidatePath("/admin/availability");
}
