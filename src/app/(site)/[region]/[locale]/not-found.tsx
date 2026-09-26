import { useTranslations } from "next-intl";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
      <p className="site-display site-bloom-accent">404</p>
      <h1 className="site-h3 text-2xl text-site-text">{t("title")}</h1>
      <p className="max-w-sm text-site-muted">{t("description")}</p>
      {/* A full page load, not <Link>: "/" has no route of its own — the
          middleware redirects it to the visitor's language. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="site-pill mt-4 inline-block bg-white px-9 py-4 text-[#050505]">
        {t("back")}
      </a>
    </main>
  );
}
