"use client";

import { useRef, useState } from "react";
import * as Icons from "lucide-react";

/**
 * Glass card with a radial accent wash that follows the pointer. The wash is a
 * positioned pseudo-layer driven by two CSS custom properties rather than a
 * re-render, so tracking stays cheap.
 */
export function ServiceCard({
  index,
  icon,
  title,
  description,
  tags,
}: {
  index: number;
  icon: string;
  title: string;
  description: string;
  tags: string[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState({ x: 50, y: 0, active: false });

  const Icon =
    (Icons[icon as keyof typeof Icons] as Icons.LucideIcon | undefined) ?? Icons.Sparkles;

  function onMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setPointer({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
      active: true,
    });
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={() => setPointer((p) => ({ ...p, active: false }))}
      className="group relative h-full overflow-hidden rounded-3xl border border-site-border bg-site-surface p-8 transition-all duration-[600ms] ease-site hover:-translate-y-2 hover:border-site-border-strong"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 ease-site group-hover:opacity-100"
        style={{
          background: `radial-gradient(420px circle at ${pointer.x}% ${pointer.y}%, rgb(99 102 241 / 0.14), transparent 70%)`,
          opacity: pointer.active ? undefined : 0,
        }}
      />

      <div className="relative">
        <span className="font-mono text-xs font-bold tracking-[0.2em] text-site-muted/50">
          {String(index + 1).padStart(2, "0")}
        </span>

        <div className="mt-6 inline-flex rounded-2xl border border-site-border bg-[rgb(99_102_241/0.12)] p-3.5">
          <Icon className="h-6 w-6 text-site-accent" />
        </div>

        <h3 className="site-h3 mt-6 text-xl text-site-text">{title}</h3>
        <p className="mt-4 text-sm leading-relaxed text-site-muted">{description}</p>

        {tags.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-site-border px-3 py-1 text-[0.7rem] uppercase tracking-[0.1em] text-site-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
