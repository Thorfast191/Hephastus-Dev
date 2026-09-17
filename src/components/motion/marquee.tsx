"use client";

import { Children } from "react";
import { useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Edge-to-edge horizontal loop. The child list is rendered twice and the track
 * translates by exactly -50%, so the second copy lands where the first began
 * and the seam is invisible.
 *
 * Under reduced motion this becomes an ordinary scroll container with snap
 * points — the same content, driven by the user instead of by a timer.
 */
export function Marquee({
  children,
  durationSeconds = 40,
  className = "",
}: {
  children: ReactNode;
  durationSeconds?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const items = Children.toArray(children);

  if (reduced) {
    return (
      <div
        className={`flex snap-x snap-mandatory gap-6 overflow-x-auto px-6 pb-4 ${className}`}
      >
        {items.map((child, index) => (
          <div key={index} className="snap-start">
            {child}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`site-marquee site-marquee-mask overflow-hidden ${className}`}>
      <div
        className="site-marquee-track gap-6"
        style={{ "--marquee-duration": `${durationSeconds}s` } as React.CSSProperties}
      >
        {items.map((child, index) => (
          <div key={`a-${index}`} className="shrink-0">
            {child}
          </div>
        ))}
        {/* Second pass is purely visual filler for the loop. */}
        {items.map((child, index) => (
          <div key={`b-${index}`} className="shrink-0" aria-hidden>
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
