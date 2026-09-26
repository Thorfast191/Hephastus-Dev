"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Globe, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  LOCALE_LABELS,
  PREF_COOKIE,
  REGION_LOCALES,
  WELCOME_PARAM,
  isLocaleForRegion,
  type Locale,
  type RegionSlug,
} from "@/lib/site/config";
import {
  cookieDomainFor,
  originFor,
  parsePreference,
  regionForCountry,
  serializePreference,
  type Preference,
} from "@/lib/site/routing";
import { COUNTRY_CODES } from "@/lib/site/countries";
import { SITE_EASE } from "@/components/motion/ease";

type SiteInfo = { region: RegionSlug; locale: Locale; rootDomain: string };

type PreferencesContextValue = SiteInfo & { openChooser: () => void };

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error("usePreferences must be used inside <PreferencesProvider>");
  return value;
}

function readPreferenceCookie(): Preference | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${PREF_COOKIE}=([^;]*)`));
  return parsePreference(match?.[1]);
}

function writePreferenceCookie(pref: Preference, rootDomain: string) {
  const parts = [
    `${PREF_COOKIE}=${encodeURIComponent(serializePreference(pref))}`,
    "Path=/",
    `Max-Age=${60 * 60 * 24 * 365}`,
    "SameSite=Lax",
  ];
  // Shared across eu./bd./apex so the choice follows the visitor between sites.
  const domain = cookieDomainFor(rootDomain);
  if (domain) parts.push(`Domain=${domain}`);
  if (window.location.protocol === "https:") parts.push("Secure");
  document.cookie = parts.join("; ");
}

/** Remove ?welcome=… from the address bar without a navigation. */
function stripWelcomeParam() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(WELCOME_PARAM)) return;
  url.searchParams.delete(WELCOME_PARAM);
  window.history.replaceState(window.history.state, "", url);
}

/**
 * Owns the "where are you / which language" chooser. It opens by itself when
 * the apex domain redirected a first-time visitor here (`?welcome=<country>`),
 * and on demand from the globe button in the header.
 */
export function PreferencesProvider({
  region,
  locale,
  rootDomain,
  children,
}: SiteInfo & { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [initialCountry, setInitialCountry] = useState<string | null>(null);

  useEffect(() => {
    const welcome = new URLSearchParams(window.location.search).get(WELCOME_PARAM);
    if (welcome === null) return;
    // Opening from an effect is intentional: the flag only exists client-side
    // (reading it on the server would make every page dynamic).
    setInitialCountry(/^[A-Z]{2}$/.test(welcome) ? welcome : null);
    setOpen(true);
  }, []);

  const openChooser = useCallback(() => {
    const saved = readPreferenceCookie();
    setInitialCountry(saved?.country ?? (region === "bd" ? "BD" : null));
    setOpen(true);
  }, [region]);

  // Dismissing counts as accepting the site they're on: without a saved
  // preference the apex would greet them with the chooser on every visit.
  const close = useCallback(() => {
    if (!readPreferenceCookie()) {
      writePreferenceCookie(
        {
          region,
          locale,
          country: initialCountry && regionForCountry(initialCountry) === region ? initialCountry : null,
        },
        rootDomain
      );
    }
    setOpen(false);
    stripWelcomeParam();
  }, [region, locale, initialCountry, rootDomain]);

  const confirm = useCallback(
    (pref: Preference) => {
      writePreferenceCookie(pref, rootDomain);
      if (pref.region === region && pref.locale === locale) {
        close();
        return;
      }
      const origin = originFor(pref.region, rootDomain, window.location.protocol);
      window.location.assign(`${origin}/${pref.locale}${window.location.hash}`);
    },
    [rootDomain, region, locale, close]
  );

  const value = useMemo(
    () => ({ region, locale, rootDomain, openChooser }),
    [region, locale, rootDomain, openChooser]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {open && (
          <PreferencesDialog
            key="preferences"
            currentLocale={locale}
            initialCountry={initialCountry}
            onClose={close}
            onConfirm={confirm}
          />
        )}
      </AnimatePresence>
    </PreferencesContext.Provider>
  );
}

/** Globe button for the header; opens the chooser. */
export function PreferencesButton({ className = "" }: { className?: string }) {
  const { locale, openChooser } = usePreferences();
  const t = useTranslations("preferences");

  return (
    <button
      type="button"
      onClick={openChooser}
      aria-label={t("switcherLabel")}
      title={t("switcherLabel")}
      className={`inline-flex items-center gap-1.5 rounded-full border border-site-border px-3 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-site-text/80 transition-colors duration-500 ease-site hover:border-site-border-strong hover:text-site-text ${className}`}
    >
      <Globe className="h-4 w-4" aria-hidden />
      {locale}
    </button>
  );
}

function PreferencesDialog({
  currentLocale,
  initialCountry,
  onClose,
  onConfirm,
}: {
  currentLocale: Locale;
  initialCountry: string | null;
  onClose: () => void;
  onConfirm: (pref: Preference) => void;
}) {
  const t = useTranslations("preferences");
  const reduced = useReducedMotion();
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  const [country, setCountry] = useState<string>(initialCountry ?? "");
  const region = regionForCountry(country || null);
  const languages = REGION_LOCALES[region];
  const [language, setLanguage] = useState<Locale>(
    isLocaleForRegion(region, currentLocale) ? currentLocale : languages[0]
  );
  // A language the newly chosen region doesn't offer snaps to its default.
  const effectiveLanguage = languages.includes(language) ? language : languages[0];

  const countries = useMemo(() => {
    const names = new Intl.DisplayNames([currentLocale], { type: "region" });
    return COUNTRY_CODES.map((code) => ({ code, name: names.of(code) ?? code })).sort((a, b) =>
      a.name.localeCompare(b.name, currentLocale)
    );
  }, [currentLocale]);

  // Lock scroll, focus the first control, trap Tab, close on Escape.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("select")?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), select")
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  const siteName = region === "bd" ? t("siteBd") : t("siteEu");

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-[rgb(0_0_0/0.7)] p-4 backdrop-blur-sm sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: SITE_EASE }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative w-full max-w-md rounded-[2rem] border border-site-border-strong bg-[#0b0b0f] p-8 shadow-[0_30px_80px_rgb(0_0_0/0.6)] sm:p-10"
        initial={{ opacity: 0, y: reduced ? 0 : 32, scale: reduced ? 1 : 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: reduced ? 0 : 16 }}
        transition={{ duration: 0.45, ease: SITE_EASE }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close")}
          className="absolute right-5 top-5 rounded-full p-2 text-site-muted transition-colors duration-500 ease-site hover:text-site-text"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="inline-flex rounded-2xl border border-site-border bg-[rgb(99_102_241/0.12)] p-3">
          <Globe className="h-6 w-6 text-site-accent" aria-hidden />
        </div>
        <h2 id={titleId} className="site-h3 mt-6 text-3xl text-site-text">
          {t("title")}
        </h2>
        <p id={descriptionId} className="mt-3 text-sm leading-relaxed text-site-muted">
          {t("description")}
        </p>

        <form
          className="mt-8 space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            onConfirm({ region, locale: effectiveLanguage, country: country || null });
          }}
        >
          <div className="space-y-2.5">
            <label htmlFor="pref-country" className="block text-sm font-medium text-site-accent">
              {t("country")}
            </label>
            <select
              id="pref-country"
              className="site-field"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
            >
              <option value="">—</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            {initialCountry && country === initialCountry && (
              <p className="text-xs text-site-muted">{t("detected")}</p>
            )}
          </div>

          <div className="space-y-2.5">
            <label htmlFor="pref-language" className="block text-sm font-medium text-site-accent">
              {t("language")}
            </label>
            <select
              id="pref-language"
              className="site-field"
              value={effectiveLanguage}
              onChange={(event) => setLanguage(event.target.value as Locale)}
              disabled={languages.length === 1}
            >
              {languages.map((code) => (
                <option key={code} value={code} lang={code}>
                  {LOCALE_LABELS[code]}
                </option>
              ))}
            </select>
          </div>

          <p className="text-sm text-site-muted">
            {t("site", { site: siteName })}
          </p>

          <button
            type="submit"
            className="site-pill w-full bg-white px-10 py-4 text-[#050505] hover:shadow-[0_20px_40px_var(--site-glow)]"
          >
            {t("continue")}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
