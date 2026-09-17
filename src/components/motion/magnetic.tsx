"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Pulls its child toward the pointer while the pointer is inside its bounds,
 * then springs back on leave. Capped at a small offset — past roughly 10px the
 * effect stops feeling responsive and starts feeling broken.
 */
export function Magnetic({
  children,
  strength = 0.35,
  max = 8,
  className,
}: {
  children: ReactNode;
  strength?: number;
  max?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 220, damping: 18, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 220, damping: 18, mass: 0.4 });

  function clamp(value: number) {
    return Math.max(-max, Math.min(max, value));
  }

  function onMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    if (reduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const offsetX = event.clientX - (rect.left + rect.width / 2);
    const offsetY = event.clientY - (rect.top + rect.height / 2);
    x.set(clamp(offsetX * strength));
    y.set(clamp(offsetY * strength));
  }

  function reset() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x: springX, y: springY, display: "inline-block" }}
      onMouseMove={onMouseMove}
      onMouseLeave={reset}
    >
      {children}
    </motion.div>
  );
}
