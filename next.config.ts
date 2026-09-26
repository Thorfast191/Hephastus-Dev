import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Lets a second build/server run beside a dev server without both writing `.next`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // The public sites and admin live on subdomains (eu., bd., admin.); in
  // development those are *.localhost, which Next otherwise treats as foreign
  // origins and blocks from loading dev assets.
  allowedDevOrigins: ["*.localhost"],
};

export default withNextIntl(nextConfig);
