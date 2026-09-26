"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertAdmin, assertRegionAccess } from "@/lib/admin-guard";
import { getAdminRegion } from "@/lib/admin/region-server";

async function assertOwnRule(id: string) {
  await assertAdmin();
  const { region } = await prisma.availabilityRule.findUniqueOrThrow({
    where: { id },
    select: { region: true },
  });
  await assertRegionAccess(region);
}

async function assertOwnBlackout(id: string) {
  await assertAdmin();
  const { region } = await prisma.blackoutDate.findUniqueOrThrow({
    where: { id },
    select: { region: true },
  });
  await assertRegionAccess(region);
}

/**
 * New rules/blackouts belong to the region selected in the admin header
 * (always their own region for a region admin — see getAdminRegion).
 */
async function selectedRegion() {
  const region = await getAdminRegion();
  if (region === "ALL") throw new Error("Choose a site (Europe or Bangladesh) first");
  return region;
}

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
  await assertAdmin();
  const parsed = readRuleForm(formData);
  const region = await selectedRegion();
  await prisma.availabilityRule.create({ data: { ...parsed, region } });
  revalidatePath("/admin/availability");
}

export async function updateRule(id: string, formData: FormData) {
  await assertOwnRule(id);
  const parsed = readRuleForm(formData);
  await prisma.availabilityRule.update({ where: { id }, data: parsed });
  revalidatePath("/admin/availability");
}

export async function deleteRule(id: string) {
  await assertOwnRule(id);
  await prisma.availabilityRule.delete({ where: { id } });
  revalidatePath("/admin/availability");
}

export async function toggleRuleActive(id: string, active: boolean) {
  await assertOwnRule(id);
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

function readBlackoutForm(formData: FormData) {
  return blackoutSchema.parse({
    date: formData.get("date"),
    reason: formData.get("reason"),
  });
}

export async function createBlackout(formData: FormData) {
  await assertAdmin();
  const parsed = readBlackoutForm(formData);
  const region = await selectedRegion();
  await prisma.blackoutDate.create({
    data: { date: new Date(parsed.date), reason: parsed.reason, region },
  });
  revalidatePath("/admin/availability");
}

export async function updateBlackout(id: string, formData: FormData) {
  await assertOwnBlackout(id);
  const parsed = readBlackoutForm(formData);
  await prisma.blackoutDate.update({
    where: { id },
    data: { date: new Date(parsed.date), reason: parsed.reason },
  });
  revalidatePath("/admin/availability");
}

export async function deleteBlackout(id: string) {
  await assertOwnBlackout(id);
  await prisma.blackoutDate.delete({ where: { id } });
  revalidatePath("/admin/availability");
}
