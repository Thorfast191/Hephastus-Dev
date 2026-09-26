"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { ContactForm } from "./contact-form";
import { Scheduler } from "./scheduler";
import { Reveal } from "@/components/motion/reveal";
import { Blobs } from "@/components/motion/blobs";

const TABS = [
  { id: "message", labelKey: "tabMessage" },
  { id: "call", labelKey: "tabCall" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** wa.me wants the number as bare digits with country code: +880 1711-000000 → 8801711000000. */
function whatsappLink(number: string) {
  return `https://wa.me/${number.replace(/\D/g, "")}`;
}

export function ContactSection({
  services,
  budgetRanges,
  whatsapp,
}: {
  services: { id: string; title: string }[];
  budgetRanges: string[];
  /** Set per region in admin; the BD site leads with it. */
  whatsapp: string | null;
}) {
  const [tab, setTab] = useState<TabId>("message");
  const t = useTranslations("contact");

  return (
    <section id="contact" className="relative overflow-hidden px-6 py-28 sm:py-36">
      <Blobs />

      <div className="relative z-10 mx-auto max-w-4xl">
        <Reveal>
          <div className="rounded-[2rem] border border-site-border bg-site-surface p-8 backdrop-blur-xl sm:p-14">
            <div className="text-center">
              <span className="site-eyebrow">{t("eyebrow")}</span>
              <h2 className="site-h2 mt-4 text-site-text">{t("title")}</h2>
              <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-site-muted">
                {t("description")}
              </p>
            </div>

            {whatsapp && (
              <div className="mt-10 flex flex-col items-center gap-3 text-center">
                <a
                  href={whatsappLink(whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="site-pill inline-flex items-center gap-2.5 bg-[#25D366] px-8 py-4 text-[#050505] hover:-translate-y-1"
                >
                  <MessageCircle className="h-5 w-5" aria-hidden />
                  {t("whatsapp")}
                </a>
                <p className="text-xs text-site-muted">{t("whatsappHint")}</p>
              </div>
            )}

            {/* Tabs rather than stacking: the form and the scheduler are each
                tall enough that together they push the card past 2000px. */}
            <div
              role="tablist"
              aria-label={t("tabsLabel")}
              className="mx-auto mt-10 flex w-fit gap-1 rounded-full border border-site-border p-1.5"
            >
              {TABS.map((item) => (
                <button
                  key={item.id}
                  role="tab"
                  type="button"
                  id={`contact-tab-${item.id}`}
                  aria-selected={tab === item.id}
                  aria-controls={`contact-panel-${item.id}`}
                  onClick={() => setTab(item.id)}
                  className={`rounded-full px-6 py-2.5 text-xs font-bold uppercase tracking-[0.1em] transition-all duration-500 ease-site ${
                    tab === item.id
                      ? "bg-white text-[#050505]"
                      : "text-site-muted hover:text-site-text"
                  }`}
                >
                  {t(item.labelKey)}
                </button>
              ))}
            </div>

            <div
              className="mt-12"
              role="tabpanel"
              id={`contact-panel-${tab}`}
              aria-labelledby={`contact-tab-${tab}`}
            >
              {tab === "message" ? (
                <ContactForm services={services} budgetRanges={budgetRanges} />
              ) : (
                <Scheduler />
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
