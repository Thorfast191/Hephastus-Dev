"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Magnetic } from "@/components/motion/magnetic";
import { ScrollProgress } from "@/components/motion/scroll-progress";
import { SITE_EASE } from "@/components/motion/ease";
import { PreferencesButton } from "./preferences";

const LINKS = [
  { href: "#services", key: "services", index: "01" },
  { href: "#portfolio", key: "portfolio", index: "02" },
  { href: "#process", key: "process", index: "03" },
  { href: "#contact", key: "contact", index: "04" },
] as const;

export function SiteNav({ agencyName }: { agencyName: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const reduced = useReducedMotion();
  const t = useTranslations("nav");
  const overlayRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    // Return focus to the control that opened the overlay, or the user is
    // dropped back at the top of the document with no idea where they are.
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 50);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // A fixed overlay over a scrollable body lets the page scroll behind the
  // menu, which reads as a bug. Lock the body while it is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // An overlay that covers the page must handle Escape and must not leak focus
  // to the content behind it, or a keyboard user can tab into hidden UI.
  useEffect(() => {
    if (!menuOpen) return;

    const overlay = overlayRef.current;
    overlay?.querySelector<HTMLElement>("a, button")?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }

      if (event.key !== "Tab" || !overlayRef.current) return;

      const focusable = Array.from(
        overlayRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      // Wrap at both ends so Tab cycles inside the overlay.
      if (event.shiftKey && (active === first || !overlayRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen, closeMenu]);

  // The overlay is `lg:hidden`, so crossing into the desktop breakpoint with it
  // open would hide it while leaving `menuOpen` true — the body stays locked
  // and the page becomes unscrollable with nothing visible to dismiss. Close it
  // when the breakpoint is crossed (resize, or a tablet rotating to landscape).
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    function onChange(event: MediaQueryListEvent) {
      if (event.matches) setMenuOpen(false);
    }
    desktop.addEventListener("change", onChange);
    return () => desktop.removeEventListener("change", onChange);
  }, []);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-500 ease-site ${
          scrolled
            ? "border-site-border bg-[rgb(5_5_5/0.85)] py-3 backdrop-blur-[20px]"
            : "border-transparent bg-[rgb(5_5_5/0.6)] py-6 backdrop-blur-[20px]"
        }`}
      >
        <nav className="relative mx-auto flex max-w-7xl items-center justify-between px-6">
          <a
            href="#top"
            className="site-h3 text-lg tracking-tight text-site-text"
            onClick={() => setMenuOpen(false)}
          >
            {agencyName}
          </a>

          <div className="absolute left-1/2 hidden -translate-x-1/2 gap-10 lg:flex">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="group flex items-center gap-2 text-xs font-medium uppercase tracking-[0.1em] text-site-text/60 transition-colors duration-500 ease-site hover:text-site-text"
              >
                <span className="text-site-accent">{link.index}</span>
                {t(link.key)}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <PreferencesButton />
            {/* Wrapper carries the breakpoint: Magnetic sets an inline
                display, which would override a `hidden` class on itself. */}
            <div className="hidden sm:block">
              <Magnetic>
                <a
                  href="#contact"
                  className="site-pill inline-block bg-white px-7 py-3.5 text-[#050505] hover:-translate-y-1 hover:shadow-[0_20px_40px_var(--site-glow)]"
                >
                  {t("cta")}
                </a>
              </Magnetic>
            </div>
            <button
              ref={triggerRef}
              type="button"
              aria-label={menuOpen ? t("closeMenu") : t("openMenu")}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen((open) => !open)}
              className="rounded-full border border-site-border p-2.5 text-site-text lg:hidden"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>
        <ScrollProgress />
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            ref={overlayRef}
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label={t("siteMenu")}
            className="fixed inset-0 z-40 flex flex-col justify-center gap-2 bg-[#050505] px-8 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: SITE_EASE }}
          >
            {LINKS.map((link, index) => (
              <motion.a
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="site-h3 flex items-baseline gap-4 border-b border-site-border py-5 text-3xl text-site-text"
                initial={{ opacity: 0, y: reduced ? 0 : 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  ease: SITE_EASE,
                  delay: reduced ? 0 : 0.08 * index,
                }}
              >
                <span className="text-sm text-site-accent">{link.index}</span>
                {t(link.key)}
              </motion.a>
            ))}
            <motion.a
              href="#contact"
              onClick={closeMenu}
              className="site-pill mt-8 bg-white px-7 py-4 text-center text-[#050505]"
              initial={{ opacity: 0, y: reduced ? 0 : 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                ease: SITE_EASE,
                delay: reduced ? 0 : 0.08 * LINKS.length,
              }}
            >
              {t("cta")}
            </motion.a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
