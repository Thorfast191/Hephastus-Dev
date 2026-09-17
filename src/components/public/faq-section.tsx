"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";
import { SectionHeading } from "./section-heading";
import { SITE_EASE } from "@/components/motion/ease";
import type { Faq } from "@prisma/client";

export function FaqSection({ faqs }: { faqs: Faq[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const reduced = useReducedMotion();

  if (faqs.length === 0) return null;

  return (
    <section id="faq" className="relative px-6 py-28 sm:py-36">
      <div className="mx-auto max-w-4xl">
        <SectionHeading
          eyebrow="Knowledge base"
          title="Common questions"
          description="The things clients usually ask before we start. If yours is not here, just ask."
        />

        <div className="mt-20">
          {faqs.map((faq) => {
            const open = openId === faq.id;

            return (
              <div key={faq.id} className="border-b border-site-border">
                <h3>
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : faq.id)}
                    aria-expanded={open}
                    aria-controls={`faq-panel-${faq.id}`}
                    id={`faq-trigger-${faq.id}`}
                    className="flex w-full items-center justify-between gap-6 py-7 text-left"
                  >
                    <span className="site-h3 text-lg text-site-text sm:text-xl">
                      {faq.question}
                    </span>
                    <Plus
                      className={`h-5 w-5 shrink-0 text-site-accent transition-transform duration-500 ease-site ${
                        open ? "rotate-[135deg]" : ""
                      }`}
                    />
                  </button>
                </h3>

                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      key="content"
                      id={`faq-panel-${faq.id}`}
                      role="region"
                      aria-labelledby={`faq-trigger-${faq.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{
                        duration: reduced ? 0.15 : 0.5,
                        ease: SITE_EASE,
                      }}
                      className="overflow-hidden"
                    >
                      <p className="pb-8 pr-12 text-sm leading-relaxed text-site-muted sm:text-base">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
