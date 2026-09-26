import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { SectionHeading } from "./section-heading";
import { Reveal } from "@/components/motion/reveal";
import type { PortfolioView } from "@/lib/site/content";

export async function PortfolioSection({ items }: { items: PortfolioView[] }) {
  if (items.length === 0) return null;
  const t = await getTranslations("portfolio");

  return (
    <section id="portfolio" className="relative px-6 py-28 sm:py-36">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description")}
        />

        <div className="mt-20 grid gap-8 md:grid-cols-2">
          {items.map((item, index) => (
            <Reveal
              key={item.id}
              delay={(index % 2) * 0.12}
              /* Nudging the right-hand column down breaks the grid's lockstep
                 and gives the section an editorial rhythm. */
              className={index % 2 === 1 ? "md:mt-16" : undefined}
            >
              <article className="group h-full overflow-hidden rounded-3xl border border-site-border bg-site-surface transition-all duration-[600ms] ease-site hover:-translate-y-2 hover:border-site-border-strong">
                {item.images[0] && (
                  <div className="relative aspect-[4/3] w-full overflow-hidden">
                    <Image
                      src={item.images[0]}
                      alt={item.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover transition-transform duration-[800ms] ease-site group-hover:scale-[1.08]"
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/20 to-transparent"
                    />
                  </div>
                )}

                <div className="p-8">
                  {item.tags.length > 0 && (
                    <p className="text-[0.7rem] uppercase tracking-[0.2em] text-site-accent">
                      {item.tags.join(" / ")}
                    </p>
                  )}
                  <h3 className="site-h3 mt-4 text-2xl text-site-text">{item.title}</h3>
                  <p className="mt-4 text-sm leading-relaxed text-site-muted">
                    {item.description}
                  </p>

                  {item.externalLink && (
                    <a
                      href={item.externalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-site-text transition-colors duration-500 ease-site hover:text-site-accent"
                    >
                      {t("viewProject")}
                      <ArrowUpRight className="h-4 w-4 transition-transform duration-500 ease-site group-hover:translate-x-1 group-hover:-translate-y-1" />
                    </a>
                  )}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
