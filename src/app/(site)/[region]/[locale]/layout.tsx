import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Cursor } from "@/components/motion/cursor";
import { PreferencesProvider } from "@/components/public/preferences";
import {
  HREFLANG,
  SITE_VARIANTS,
  isLocaleForRegion,
  isRegion,
} from "@/lib/site/config";
import { regionOrigin, rootDomain } from "@/lib/site/env";
import { fontVariables } from "../../../fonts";
import "../../../globals.css";

export function generateStaticParams() {
  return SITE_VARIANTS;
}

type Params = Promise<{ region: string; locale: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { region } = await params;
  if (!isRegion(region)) return {};
  return { metadataBase: new URL(regionOrigin(region)) };
}

/**
 * Root layout for the public sites. The URL a visitor sees is
 * `eu.<domain>/fr`; the middleware rewrites it to `/eu/fr` so both halves
 * arrive here as route params.
 *
 * `.site-root` carries the dark palette. It is applied here rather than through
 * next-themes so the admin panel's light/dark toggle cannot affect the public
 * site in either direction.
 */
export default async function SiteRootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Params;
}) {
  const { region, locale } = await params;
  if (!isRegion(region) || !isLocaleForRegion(region, locale)) notFound();

  setRequestLocale(locale);

  return (
    <html lang={HREFLANG[region][locale] ?? locale}>
      <body className={`${fontVariables} antialiased`}>
        <NextIntlClientProvider>
          {/* Outermost, so the chooser dialog the provider renders also
              inherits the site palette. */}
          <div className="site-root min-h-screen font-sans">
            <PreferencesProvider region={region} locale={locale} rootDomain={rootDomain()}>
              <Cursor />
              {children}
            </PreferencesProvider>
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
