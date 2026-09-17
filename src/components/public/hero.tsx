"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { Magnetic } from "@/components/motion/magnetic";
import { Blobs } from "@/components/motion/blobs";
import { SITE_EASE } from "@/components/motion/ease";

export function Hero({
  agencyName,
  tagline,
  heroEyebrow,
  heroHeadline,
  heroHeadlineAccent,
  heroSubtitle,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
}: {
  agencyName: string;
  tagline: string;
  heroEyebrow: string | null;
  heroHeadline: string | null;
  heroHeadlineAccent: string | null;
  heroSubtitle: string | null;
  primaryLabel: string | null;
  primaryHref: string | null;
  secondaryLabel: string | null;
  secondaryHref: string | null;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 140]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, reduced ? 1 : 0]);

  const eyebrow = heroEyebrow ?? agencyName;

  // Two discrete fields rather than one delimited string: the client sets the
  // white phrase and the accent phrase independently, with no syntax to learn.
  const toWords = (text: string | null, accent: boolean) =>
    (text ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => ({ word, accent }));

  const words = [
    ...toWords(heroHeadline ?? tagline, false),
    ...toWords(heroHeadlineAccent, true),
  ];

  return (
    <section
      ref={ref}
      id="top"
      className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-6 pt-32 pb-20"
    >
      <Blobs />

      <motion.div
        style={{ y, opacity }}
        className="relative z-10 mx-auto flex max-w-5xl flex-col items-center text-center"
      >
        <motion.span
          className="site-eyebrow"
          initial={{ opacity: 0, y: reduced ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: SITE_EASE }}
        >
          {eyebrow}
        </motion.span>

        <h1 className="site-display mt-8">
          {words.map((item, index) => (
            <motion.span
              key={`${item.word}-${index}`}
              className={`mr-[0.22em] inline-block ${
                item.accent ? "site-bloom-accent" : "site-bloom-light"
              }`}
              initial={{ opacity: 0, y: reduced ? 0 : 48 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.9,
                ease: SITE_EASE,
                delay: reduced ? 0 : 0.15 + index * 0.07,
              }}
            >
              {item.word}
            </motion.span>
          ))}
        </h1>

        {heroSubtitle && (
          <motion.p
            className="mt-10 max-w-2xl text-base leading-relaxed text-site-muted sm:text-lg"
            initial={{ opacity: 0, y: reduced ? 0 : 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.8,
              ease: SITE_EASE,
              delay: reduced ? 0 : 0.2 + words.length * 0.07,
            }}
          >
            {heroSubtitle}
          </motion.p>
        )}

        <motion.div
          className="mt-12 flex flex-wrap items-center justify-center gap-4"
          initial={{ opacity: 0, y: reduced ? 0 : 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.8,
            ease: SITE_EASE,
            delay: reduced ? 0 : 0.3 + words.length * 0.07,
          }}
        >
          <Magnetic>
            <a
              href={primaryHref || "#portfolio"}
              className="site-pill inline-block bg-white px-10 py-4 text-[#050505] hover:-translate-y-1 hover:shadow-[0_20px_40px_var(--site-glow)]"
            >
              {primaryLabel || "View our work"}
            </a>
          </Magnetic>
          <Magnetic>
            <a
              href={secondaryHref || "#contact"}
              className="site-pill inline-block border border-site-border-strong px-10 py-4 text-site-text hover:-translate-y-1 hover:border-site-accent hover:bg-site-surface-hover"
            >
              {secondaryLabel || "Get in touch"}
            </a>
          </Magnetic>
        </motion.div>
      </motion.div>
    </section>
  );
}
