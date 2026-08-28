import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { SiteNav } from "@/components/public/site-nav";
import { Hero } from "@/components/public/hero";
import { ServicesSection } from "@/components/public/services-section";
import { PortfolioSection } from "@/components/public/portfolio-section";
import { ProcessSection } from "@/components/public/process-section";
import { TestimonialsSection } from "@/components/public/testimonials-section";
import { TeamSection } from "@/components/public/team-section";
import { ContactSection } from "@/components/public/contact-section";
import { Footer } from "@/components/public/footer";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await prisma.siteSettings.findFirst();
  return {
    title: settings?.agencyName ?? "Agency",
    description: settings?.tagline ?? undefined,
  };
}

export default async function Home() {
  const [settings, services, portfolioItems, testimonials, teamMembers] = await Promise.all([
    prisma.siteSettings.findFirst(),
    prisma.service.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
    prisma.portfolioItem.findMany({ orderBy: { order: "asc" } }),
    prisma.testimonial.findMany({ orderBy: { order: "asc" } }),
    prisma.teamMember.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
  ]);

  if (!settings) {
    return (
      <div className="mx-auto max-w-md p-8">
        <p className="text-muted-foreground">
          Site settings have not been configured yet. Sign in to /admin/settings to get started.
        </p>
      </div>
    );
  }

  return (
    <>
      <SiteNav agencyName={settings.agencyName} />
      <main>
        <Hero agencyName={settings.agencyName} tagline={settings.tagline} />
        <ServicesSection services={services} />
        <PortfolioSection items={portfolioItems} />
        <ProcessSection />
        <TestimonialsSection testimonials={testimonials} />
        <TeamSection members={teamMembers} />
        <ContactSection services={services.map((s) => ({ id: s.id, title: s.title }))} />
      </main>
      <Footer settings={settings} />
    </>
  );
}
