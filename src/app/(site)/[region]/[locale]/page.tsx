import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteNav } from "@/components/public/site-nav";
import { Hero } from "@/components/public/hero";
import { ServicesSection } from "@/components/public/services-section";
import { PortfolioSection } from "@/components/public/portfolio-section";
import { TestimonialsSection } from "@/components/public/testimonials-section";
import { TechStackSection } from "@/components/public/tech-stack-section";
import { ProcessSection } from "@/components/public/process-section";
import { FaqSection } from "@/components/public/faq-section";
import { TeamSection } from "@/components/public/team-section";
import { ContactSection } from "@/components/public/contact-section";
import { Footer } from "@/components/public/footer";
import {
  DEFAULT_LOCALE,
  DEFAULT_REGION,
  HREFLANG,
  SITE_VARIANTS,
  isLocaleForRegion,
  isRegion,
  type Locale,
  type RegionSlug,
} from "@/lib/site/config";
import { getSettingsView, getSiteContent } from "@/lib/site/content";
import { adminOrigin, regionOrigin } from "@/lib/site/env";

export const revalidate = 60;

type Params = Promise<{ region: string; locale: string }>;

async function resolveParams(params: Params): Promise<{ region: RegionSlug; locale: Locale }> {
  const { region, locale } = await params;
  if (!isRegion(region) || !isLocaleForRegion(region, locale)) notFound();
  return { region, locale };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { region, locale } = await resolveParams(params);
  const settings = await getSettingsView(region, locale);
  const title = settings?.agencyName ?? "Agency";
  const description = settings?.tagline || undefined;

  // Every variant points at every other, so search engines show French
  // speakers the French page and Bangladeshi searchers the BD site.
  const languages: Record<string, string> = Object.fromEntries(
    SITE_VARIANTS.map((v) => [HREFLANG[v.region][v.locale]!, `${regionOrigin(v.region)}/${v.locale}`])
  );
  languages["x-default"] = `${regionOrigin(DEFAULT_REGION)}/${DEFAULT_LOCALE}`;
  // Resolved against this site's metadataBase, so it stays on the region's host.
  const ogImage = `/api/og?locale=${locale}`;

  return {
    title,
    description,
    alternates: { canonical: `/${locale}`, languages },
    openGraph: {
      type: "website",
      url: `/${locale}`,
      siteName: title,
      title,
      description,
      locale: HREFLANG[region][locale]?.replace("-", "_"),
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
  };
}

export default async function Home({ params }: { params: Params }) {
  const { region, locale } = await resolveParams(params);
  setRequestLocale(locale);

  const [content, t] = await Promise.all([
    getSiteContent(region, locale),
    getTranslations("common"),
  ]);
  const { settings } = content;

  if (!settings) {
    return (
      <div className="mx-auto max-w-md p-8">
        <p className="text-site-muted">{t("notConfigured")}</p>
      </div>
    );
  }

  return (
    <>
      <a href="#main" className="site-skip-link">
        {t("skipToContent")}
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
        <ServicesSection services={content.services} />
        <PortfolioSection items={content.portfolio} />
        <TechStackSection items={settings.techStack} />
        {/* Hidden until there are active testimonials — see TestimonialsSection. */}
        <TestimonialsSection testimonials={content.testimonials} />
        <ProcessSection />
        <FaqSection faqs={content.faqs} />
        <TeamSection members={content.team} />
        <ContactSection
          services={content.services.map((s) => ({ id: s.id, title: s.title }))}
          budgetRanges={settings.budgetRanges}
          whatsapp={settings.whatsapp}
        />
      </main>
      <Footer settings={settings} adminUrl={adminOrigin()} />
    </>
  );
}
