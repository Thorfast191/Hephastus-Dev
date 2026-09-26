"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Prisma, type Region } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertRegionAccess } from "@/lib/admin-guard";
import { revalidatePublicSite } from "@/lib/site/revalidate";
import { readLocalized, readOptionalLocalized } from "@/lib/admin/form";

const optionalString = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v));

const settingsSchema = z.object({
  agencyName: z.string().min(1),
  heroPrimaryHref: optionalString,
  heroSecondaryHref: optionalString,
  budgetRanges: z.string().transform((v) =>
    v
      .split(",")
      .map((b) => b.trim())
      .filter(Boolean)
  ),
  techStack: z.string().transform((v) =>
    // Order kept, duplicates dropped (the marquee would show them twice).
    [...new Set(v.split(",").map((t) => t.trim()).filter(Boolean))]
  ),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(1),
  whatsapp: optionalString,
  smtpSenderName: z.string().min(1),
  businessTimezone: z.string().refine(
    (tz) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    },
    { message: "Unknown timezone — use an IANA name such as Europe/Paris" }
  ),
  slotDurationMinutes: z.coerce.number().int().positive(),
  minNoticeHours: z.coerce.number().int().min(0),
  bookingWindowDays: z.coerce.number().int().positive(),
  twitter: z.string().trim(),
  linkedin: z.string().trim(),
  github: z.string().trim(),
});

export async function updateSettings(region: Region, formData: FormData) {
  if (region !== "EU" && region !== "BD") throw new Error("Unknown region");
  await assertRegionAccess(region);

  const parsed = settingsSchema.parse({
    agencyName: formData.get("agencyName"),
    heroPrimaryHref: formData.get("heroPrimaryHref"),
    heroSecondaryHref: formData.get("heroSecondaryHref"),
    budgetRanges: formData.get("budgetRanges") ?? "",
    techStack: formData.get("techStack") ?? "",
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone"),
    whatsapp: formData.get("whatsapp") ?? "",
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

  // Prisma needs DbNull (not plain null) to clear a nullable Json column.
  const optionalJson = (name: string) =>
    readOptionalLocalized(formData, name) ?? Prisma.DbNull;

  const data = {
    agencyName: parsed.agencyName,
    tagline: readLocalized(formData, "tagline"),
    heroEyebrow: optionalJson("heroEyebrow"),
    heroHeadline: optionalJson("heroHeadline"),
    heroHeadlineAccent: optionalJson("heroHeadlineAccent"),
    heroSubtitle: optionalJson("heroSubtitle"),
    heroPrimaryLabel: optionalJson("heroPrimaryLabel"),
    heroPrimaryHref: parsed.heroPrimaryHref,
    heroSecondaryLabel: optionalJson("heroSecondaryLabel"),
    heroSecondaryHref: parsed.heroSecondaryHref,
    budgetRanges: parsed.budgetRanges,
    techStack: parsed.techStack,
    contactEmail: parsed.contactEmail,
    contactPhone: parsed.contactPhone,
    whatsapp: parsed.whatsapp,
    smtpSenderName: parsed.smtpSenderName,
    businessTimezone: parsed.businessTimezone,
    slotDurationMinutes: parsed.slotDurationMinutes,
    minNoticeHours: parsed.minNoticeHours,
    bookingWindowDays: parsed.bookingWindowDays,
    socialLinks,
  };

  await prisma.siteSettings.upsert({
    where: { region },
    update: data,
    create: { region, ...data },
  });

  revalidatePath("/admin/settings");
  revalidatePublicSite();
}
