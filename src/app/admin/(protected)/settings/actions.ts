"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/admin-guard";

const settingsSchema = z.object({
  agencyName: z.string().min(1),
  tagline: z.string().min(1),
  heroEyebrow: z.string().trim().transform((v) => (v === "" ? null : v)),
  heroHeadline: z.string().trim().transform((v) => (v === "" ? null : v)),
  heroHeadlineAccent: z.string().trim().transform((v) => (v === "" ? null : v)),
  heroPrimaryLabel: z.string().trim().transform((v) => (v === "" ? null : v)),
  heroPrimaryHref: z.string().trim().transform((v) => (v === "" ? null : v)),
  heroSecondaryLabel: z.string().trim().transform((v) => (v === "" ? null : v)),
  heroSecondaryHref: z.string().trim().transform((v) => (v === "" ? null : v)),
  budgetRanges: z.string().transform((v) =>
    v
      .split(",")
      .map((b) => b.trim())
      .filter(Boolean)
  ),
  heroSubtitle: z.string().trim().transform((v) => (v === "" ? null : v)),
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
  await assertAdmin();
  const parsed = settingsSchema.parse({
    agencyName: formData.get("agencyName"),
    tagline: formData.get("tagline"),
    heroEyebrow: formData.get("heroEyebrow"),
    heroHeadline: formData.get("heroHeadline"),
    heroHeadlineAccent: formData.get("heroHeadlineAccent"),
    heroPrimaryLabel: formData.get("heroPrimaryLabel"),
    heroPrimaryHref: formData.get("heroPrimaryHref"),
    heroSecondaryLabel: formData.get("heroSecondaryLabel"),
    heroSecondaryHref: formData.get("heroSecondaryHref"),
    budgetRanges: formData.get("budgetRanges") ?? "",
    heroSubtitle: formData.get("heroSubtitle"),
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
    heroEyebrow: parsed.heroEyebrow,
    heroHeadline: parsed.heroHeadline,
    heroHeadlineAccent: parsed.heroHeadlineAccent,
    heroPrimaryLabel: parsed.heroPrimaryLabel,
    heroPrimaryHref: parsed.heroPrimaryHref,
    heroSecondaryLabel: parsed.heroSecondaryLabel,
    heroSecondaryHref: parsed.heroSecondaryHref,
    budgetRanges: parsed.budgetRanges,
    heroSubtitle: parsed.heroSubtitle,
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
  revalidatePath("/");
}
