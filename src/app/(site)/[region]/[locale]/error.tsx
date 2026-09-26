"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
      <h1 className="site-h2 text-site-text">{t("title")}</h1>
      <p className="max-w-sm text-site-muted">{t("description")}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="site-pill inline-block bg-white px-9 py-4 text-[#050505]"
        >
          {t("retry")}
        </button>
        {/* A full page load, not <Link>: "/" has no route of its own — the
            middleware redirects it to the visitor's language. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          className="site-pill inline-block border border-site-border-strong px-9 py-4 text-site-text"
        >
          {t("back")}
        </a>
      </div>
    </main>
  );
}
