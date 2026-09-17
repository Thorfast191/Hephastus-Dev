"use client";

import { motion, useScroll, useSpring } from "framer-motion";

/** Hairline accent bar under the nav showing progress through the page. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="absolute inset-x-0 bottom-0 h-px origin-left bg-gradient-to-r from-site-accent to-site-accent-2"
    />
  );
}
