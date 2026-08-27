"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const settingsSchema = z.object({
  agencyName: z.string().min(1),
  tagline: z.string().min(1),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(1),
  smtpSenderName: z.string().min(1),
  businessTimezone: z.string().min(1),
  slotDurationMinutes: z.coerce.number().int().positive(),
  minNoticeHours: z.coerce.number().int().min(0),
  bookingWindowDays: z.coerce.number().int().positive(),
  twitter: z.string().trim(),
  linkedin: z.string().trim(),
  github: z.string().trim(),
});

export async function updateSettings(formData: FormData) {
  const parsed = settingsSchema.parse({
    agencyName: formData.get("agencyName"),
    tagline: formData.get("tagline"),
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone"),
    smtpSenderName: formData.get("smtpSenderName"),
    businessTimezone: formData.get("businessTimezone"),
    slotDurationMinutes: formData.get("slotDurationMinutes"),
    minNoticeHours: formData.get("minNoticeHours"),
    bookingWindowDays: formData.get("bookingWindowDays"),
    twitter: formData.get("twitter"),
    linkedin: formData.get("linkedin"),
    github: formData.get("github"),
  });

  const socialLinks: Record<string, string> = {};
  if (parsed.twitter) socialLinks.twitter = parsed.twitter;
  if (parsed.linkedin) socialLinks.linkedin = parsed.linkedin;
  if (parsed.github) socialLinks.github = parsed.github;

  const data = {
    agencyName: parsed.agencyName,
    tagline: parsed.tagline,
    contactEmail: parsed.contactEmail,
    contactPhone: parsed.contactPhone,
    smtpSenderName: parsed.smtpSenderName,
    businessTimezone: parsed.businessTimezone,
    slotDurationMinutes: parsed.slotDurationMinutes,
    minNoticeHours: parsed.minNoticeHours,
    bookingWindowDays: parsed.bookingWindowDays,
    socialLinks,
  };

  await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });

  revalidatePath("/admin/settings");
}
