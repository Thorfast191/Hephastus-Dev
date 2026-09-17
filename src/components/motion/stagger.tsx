"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { SITE_EASE, SITE_DURATION } from "./ease";

/**
 * Cascading reveal for grids and lists. Wrap the container in `StaggerGroup`
 * and each child in `StaggerItem`; the group drives the timing so items do not
 * each need their own delay prop.
 */
export function StaggerGroup({
  children,
  className,
  stagger = 0.08,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: reduced ? 0 : stagger,
            delayChildren: reduced ? 0 : delay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  y = 32,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: reduced ? 0 : y },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: reduced ? 0.2 : SITE_DURATION, ease: SITE_EASE },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
