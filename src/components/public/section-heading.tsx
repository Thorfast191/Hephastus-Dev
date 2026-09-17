import { Reveal } from "@/components/motion/reveal";

/**
 * The numbered eyebrow + display heading pairing that opens every section.
 * Centralised so the rhythm stays identical down the page.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "center" | "left";
}) {
  const alignment =
    align === "center" ? "mx-auto max-w-3xl text-center items-center" : "max-w-2xl text-left";

  return (
    <Reveal className={`flex flex-col ${alignment}`}>
      <span className="site-eyebrow">{eyebrow}</span>
      <h2 className="site-h2 mt-4 text-site-text">{title}</h2>
      {description && (
        <p className="mt-6 text-base leading-relaxed text-site-muted sm:text-lg">
          {description}
        </p>
      )}
    </Reveal>
  );
}
