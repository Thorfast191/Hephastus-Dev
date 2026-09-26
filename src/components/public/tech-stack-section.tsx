import { getTranslations } from "next-intl/server";
import { SectionHeading } from "./section-heading";
import { Marquee } from "@/components/motion/marquee";

/**
 * "Our toolkit": the technologies we build with, as two counter-scrolling
 * rows. Stands in for social proof while there are no client testimonials —
 * the list is edited per site under Admin → Settings.
 */
export async function TechStackSection({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  const t = await getTranslations("stack");

  // Two rows read as a band rather than a ticker; a short list stays one row.
  const half = Math.ceil(items.length / 2);
  const rows = items.length >= 8 ? [items.slice(0, half), items.slice(half)] : [items];

  return (
    <section id="stack" className="relative overflow-hidden py-28 sm:py-36">
      <div className="px-6">
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description")}
        />
      </div>

      <ul className="sr-only">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      {/* Full-bleed and decorative for screen readers: the list above carries
          the content once, instead of the marquee's duplicated loop. */}
      <div aria-hidden className="mt-20 space-y-5">
        {rows.map((row, index) => (
          <Marquee key={index} durationSeconds={36 + index * 6} reverse={index % 2 === 1}>
            {row.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-3 whitespace-nowrap rounded-full border border-site-border bg-site-surface px-7 py-4 text-lg font-medium text-site-text/85 transition-colors duration-500 ease-site hover:border-site-border-strong hover:text-site-text sm:text-xl"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-site-accent" />
                {item}
              </span>
            ))}
          </Marquee>
        ))}
      </div>
    </section>
  );
}
