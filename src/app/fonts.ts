import { Inter, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700", "800"],
});

/**
 * The app has two root layouts (public site and admin) — each renders its own
 * <html> so the public one can set `lang` per locale without making every page
 * dynamic. Both apply the same font variables from here.
 */
export const fontVariables = `${inter.variable} ${geistMono.variable} ${plusJakarta.variable}`;
