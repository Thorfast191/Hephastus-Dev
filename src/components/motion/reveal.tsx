"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { SITE_EASE, SITE_DURATION } from "./ease";

/**
 * Scroll-triggered entrance. Fires once, slightly before the element reaches
 * the viewport edge so content is already settled by the time it is read.
 *
 * Under reduced motion the translation is dropped and only opacity remains,
 * which keeps the staggering legible without any movement.
 */
export function Reveal({
  children,
  delay = 0,
  y = 32,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduced ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{
        duration: reduced ? 0.2 : SITE_DURATION,
        ease: SITE_EASE,
        delay: reduced ? 0 : delay,
      }}
    >
      {children}
    </motion.div>
  );
}
