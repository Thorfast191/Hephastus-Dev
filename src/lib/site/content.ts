import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { REGION_ENUM, type Locale, type RegionSlug } from "./config";
import { localize, localizeOptional } from "./localized";

/**
 * Public-site data, already filtered to one region and flattened to one
 * language. Components receive plain strings and never see Json columns.
 */

export type SettingsView = {
  agencyName: string;
  tagline: string;
  heroEyebrow: string | null;
  heroHeadline: string | null;
  heroHeadlineAccent: string | null;
  heroSubtitle: string | null;
  heroPrimaryLabel: string | null;
  heroPrimaryHref: string | null;
  heroSecondaryLabel: string | null;
  heroSecondaryHref: string | null;
  budgetRanges: string[];
  techStack: string[];
  contactEmail: string;
  contactPhone: string;
  whatsapp: string | null;
  socialLinks: { twitter?: string; linkedin?: string; github?: string };
};

export type ServiceView = {
  id: string;
  icon: string;
  title: string;
  description: string;
  tags: string[];
};

export type PortfolioView = {
  id: string;
  title: string;
  description: string;
  images: string[];
  tags: string[];
  externalLink: string | null;
};

export type TestimonialView = {
  id: string;
  quote: string;
  authorName: string;
  company: string | null;
  photo: string | null;
};

export type FaqView = { id: string; question: string; answer: string };

export type TeamMemberView = {
  id: string;
  name: string;
  role: string;
  bio: string;
  photo: string | null;
};

/** Deduplicated per request: metadata and the page both need the settings row. */
export const getRegionSettings = cache(async (region: RegionSlug) =>
  prisma.siteSettings.findUnique({ where: { region: REGION_ENUM[region] } })
);

export async function getSettingsView(
  region: RegionSlug,
  locale: Locale
): Promise<SettingsView | null> {
  const settings = await getRegionSettings(region);
  if (!settings) return null;

  return {
    agencyName: settings.agencyName,
    tagline: localize(settings.tagline, locale),
    heroEyebrow: localizeOptional(settings.heroEyebrow, locale),
    heroHeadline: localizeOptional(settings.heroHeadline, locale),
    heroHeadlineAccent: localizeOptional(settings.heroHeadlineAccent, locale),
    heroSubtitle: localizeOptional(settings.heroSubtitle, locale),
    heroPrimaryLabel: localizeOptional(settings.heroPrimaryLabel, locale),
    heroPrimaryHref: settings.heroPrimaryHref,
    heroSecondaryLabel: localizeOptional(settings.heroSecondaryLabel, locale),
    heroSecondaryHref: settings.heroSecondaryHref,
    budgetRanges: settings.budgetRanges,
    techStack: settings.techStack,
    contactEmail: settings.contactEmail,
    contactPhone: settings.contactPhone,
    whatsapp: settings.whatsapp,
    socialLinks: (settings.socialLinks ?? {}) as SettingsView["socialLinks"],
  };
}

export async function getSiteContent(region: RegionSlug, locale: Locale) {
  const inRegion = { active: true, regions: { has: REGION_ENUM[region] } };
  const byOrder = { order: "asc" } as const;

  const [settings, services, portfolio, testimonials, faqs, team] = await Promise.all([
    getSettingsView(region, locale),
    prisma.service.findMany({ where: inRegion, orderBy: byOrder }),
    prisma.portfolioItem.findMany({ where: inRegion, orderBy: byOrder }),
    prisma.testimonial.findMany({ where: inRegion, orderBy: byOrder }),
    prisma.faq.findMany({ where: inRegion, orderBy: byOrder }),
    prisma.teamMember.findMany({ where: { active: true }, orderBy: byOrder }),
  ]);

  return {
    settings,
    services: services.map<ServiceView>((s) => ({
      id: s.id,
      icon: s.icon,
      title: localize(s.title, locale),
      description: localize(s.description, locale),
      tags: s.tags,
    })),
    portfolio: portfolio.map<PortfolioView>((p) => ({
      id: p.id,
      title: localize(p.title, locale),
      description: localize(p.description, locale),
      images: p.images,
      tags: p.tags,
      externalLink: p.externalLink,
    })),
    testimonials: testimonials.map<TestimonialView>((t) => ({
      id: t.id,
      quote: localize(t.quote, locale),
      authorName: t.authorName,
      company: t.company,
      photo: t.photo,
    })),
    faqs: faqs.map<FaqView>((f) => ({
      id: f.id,
      question: localize(f.question, locale),
      answer: localize(f.answer, locale),
    })),
    team: team.map<TeamMemberView>((m) => ({
      id: m.id,
      name: m.name,
      role: localize(m.role, locale),
      bio: localize(m.bio, locale),
      photo: m.photo,
    })),
  };
}
