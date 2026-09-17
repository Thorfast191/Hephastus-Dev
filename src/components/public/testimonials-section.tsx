import Image from "next/image";
import { SectionHeading } from "./section-heading";
import { Marquee } from "@/components/motion/marquee";
import type { Testimonial } from "@prisma/client";

export function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  if (testimonials.length === 0) return null;

  return (
    <section id="testimonials" className="relative overflow-hidden py-28 sm:py-36">
      <div className="px-6">
        <SectionHeading
          eyebrow="Social proof"
          title="What clients say"
          description="The part of the work that matters most: whether it moved the number the client cared about."
        />
      </div>

      {/* Full-bleed on purpose — the track runs past both viewport edges and is
          masked rather than clipped, so cards dissolve instead of snapping. */}
      <Marquee className="mt-20" durationSeconds={45}>
        {testimonials.map((testimonial) => (
          <figure
            key={testimonial.id}
            className="flex h-full w-[min(88vw,520px)] flex-col justify-between rounded-3xl border border-site-border bg-site-surface p-8"
          >
            <blockquote className="text-lg leading-relaxed text-site-text/90 italic">
              &ldquo;{testimonial.quote}&rdquo;
            </blockquote>

            <figcaption className="mt-8 flex items-center gap-4">
              {testimonial.photo && (
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-site-border">
                  <Image
                    src={testimonial.photo}
                    alt={testimonial.authorName}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
              )}
              <div>
                <p className="site-h3 text-sm text-site-text">{testimonial.authorName}</p>
                {testimonial.company && (
                  <p className="mt-1 text-xs font-medium text-site-accent">
                    {testimonial.company}
                  </p>
                )}
              </div>
            </figcaption>
          </figure>
        ))}
      </Marquee>
    </section>
  );
}
