import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { SiteNav } from "@/components/public/site-nav";
import { Hero } from "@/components/public/hero";
import { ServicesSection } from "@/components/public/services-section";
import { PortfolioSection } from "@/components/public/portfolio-section";
import { TestimonialsSection } from "@/components/public/testimonials-section";
import { ProcessSection } from "@/components/public/process-section";
import { FaqSection } from "@/components/public/faq-section";
import { TeamSection } from "@/components/public/team-section";
import { ContactSection } from "@/components/public/contact-section";
import { Footer } from "@/components/public/footer";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await prisma.siteSettings.findFirst();
  const title = settings?.agencyName ?? "Agency";
  const description = settings?.tagline ?? undefined;

  return {
    title,
    description,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      url: "/",
      siteName: title,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function Home() {
  const [settings, services, portfolioItems, testimonials, faqs, teamMembers] =
    await Promise.all([
      prisma.siteSettings.findFirst(),
      prisma.service.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
      prisma.portfolioItem.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
      prisma.testimonial.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
      prisma.faq.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
      prisma.teamMember.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
    ]);

  if (!settings) {
    return (
      <div className="mx-auto max-w-md p-8">
        <p className="text-site-muted">
          Site settings have not been configured yet. Sign in to /admin/settings to get
          started.
        </p>
      </div>
    );
  }

  return (
    <>
      <a href="#main" className="site-skip-link">
        Skip to content
      </a>
      <SiteNav agencyName={settings.agencyName} />
      <main id="main">
        <Hero
          agencyName={settings.agencyName}
          tagline={settings.tagline}
          heroEyebrow={settings.heroEyebrow}
          heroHeadline={settings.heroHeadline}
          heroHeadlineAccent={settings.heroHeadlineAccent}
          heroSubtitle={settings.heroSubtitle}
          primaryLabel={settings.heroPrimaryLabel}
          primaryHref={settings.heroPrimaryHref}
          secondaryLabel={settings.heroSecondaryLabel}
          secondaryHref={settings.heroSecondaryHref}
        />
        <ServicesSection services={services} />
        <PortfolioSection items={portfolioItems} />
        <TestimonialsSection testimonials={testimonials} />
        <ProcessSection />
        <FaqSection faqs={faqs} />
        <TeamSection members={teamMembers} />
        <ContactSection
          services={services.map((s) => ({ id: s.id, title: s.title }))}
          budgetRanges={settings.budgetRanges}
        />
      </main>
      <Footer settings={settings} />
    </>
  );
}
