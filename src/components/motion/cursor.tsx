"use client";

import { useEffect, useRef, useState } from "react";

const HOVER_SELECTOR = 'a, button, input, select, textarea, [data-cursor="hover"]';

/**
 * A small dot that trails the pointer and swells over interactive elements.
 *
 * Three deliberate constraints:
 *  - It never mounts on coarse pointers or under reduced-motion, so touch and
 *    motion-sensitive users are unaffected.
 *  - `cursor: none` is applied only once the dot is actually live, and only to
 *    the site subtree, so a failure here can never leave a user without a
 *    pointer.
 *  - Position is written straight to the transform in a rAF loop rather than
 *    through React state, which would re-render on every mousemove.
 */
export function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || reduced.matches) return;

    setEnabled(true);

    // Start off-screen so the dot does not flash at the origin before the
    // first pointer event arrives.
    const target = { x: -100, y: -100 };
    const current = { x: -100, y: -100 };
    let frame = 0;

    function onMove(event: MouseEvent) {
      target.x = event.clientX;
      target.y = event.clientY;
    }

    function onOver(event: MouseEvent) {
      const el = event.target as Element | null;
      const interactive = el?.closest?.(HOVER_SELECTOR);
      dotRef.current?.classList.toggle("site-cursor-hover", Boolean(interactive));
      if (dotRef.current) {
        dotRef.current.dataset.scale = interactive ? "4" : "1";
      }
    }

    function tick() {
      // Exponential smoothing gives the dot a slight lag behind the pointer.
      current.x += (target.x - current.x) * 0.2;
      current.y += (target.y - current.y) * 0.2;
      const scale = dotRef.current?.dataset.scale ?? "1";
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${current.x - 6}px, ${
          current.y - 6
        }px, 0) scale(${scale})`;
      }
      frame = requestAnimationFrame(tick);
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseover", onOver, { passive: true });
    frame = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      cancelAnimationFrame(frame);
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      <style>{`.site-root, .site-root * { cursor: none; }`}</style>
      <div ref={dotRef} className="site-cursor" data-scale="1" aria-hidden />
    </>
  );
}
