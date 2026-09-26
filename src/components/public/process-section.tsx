"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Magnetic } from "@/components/motion/magnetic";
import { Reveal } from "@/components/motion/reveal";

const STEPS = ["discover", "design", "build", "deliver"] as const;

/**
 * One step in the methodology list. Its index number lifts from muted to accent
 * as the step passes through the middle of the viewport, which gives the
 * sticky left column something to feel anchored against.
 */
function ProcessStep({
  index,
  title,
  description,
}: {
  index: number;
  title: string;
  description: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 85%", "center 45%"],
  });
  const opacity = useTransform(scrollYProgress, [0, 1], [0.25, 1]);

  return (
    <div ref={ref} className="border-t border-site-border py-12 first:border-t-0 sm:py-16">
      <Reveal y={24}>
        <div className="flex gap-6 sm:gap-10">
          <motion.span
            style={reduced ? undefined : { opacity }}
            className="font-mono text-sm font-bold tracking-[0.2em] text-site-accent"
          >
            {String(index + 1).padStart(2, "0")}
          </motion.span>
          <div>
            <h3 className="site-h3 text-2xl text-site-text sm:text-3xl">{title}</h3>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-site-muted sm:text-base">
              {description}
            </p>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

export function ProcessSection() {
  const t = useTranslations("process");

  return (
    <section id="process" className="relative px-6 py-28 sm:py-36">
      <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-2 lg:gap-24">
        {/* Sticky rail: the framing stays put while the steps scroll past it. */}
        <div className="lg:sticky lg:top-32 lg:self-start">
          <Reveal>
            <span className="site-eyebrow">{t("eyebrow")}</span>
            <h2 className="site-h2 mt-4 text-site-text">{t("title")}</h2>
            <p className="mt-6 max-w-md text-base leading-relaxed text-site-muted sm:text-lg">
              {t("description")}
            </p>
            <Magnetic className="mt-10">
              <a
                href="#contact"
                className="site-pill inline-block bg-white px-9 py-4 text-[#050505] hover:-translate-y-1 hover:shadow-[0_20px_40px_var(--site-glow)]"
              >
                {t("cta")}
              </a>
            </Magnetic>
          </Reveal>
        </div>

        <div>
          {STEPS.map((step, index) => (
            <ProcessStep
              key={step}
              index={index}
              title={t(`steps.${step}.title`)}
              description={t(`steps.${step}.description`)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
