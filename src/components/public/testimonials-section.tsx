import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import type { Testimonial } from "@prisma/client";

export function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  if (testimonials.length === 0) return null;

  return (
    <section id="testimonials" className="bg-muted/30 py-16">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="font-heading text-3xl font-semibold">What clients say</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.id}>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">&ldquo;{testimonial.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  {testimonial.photo && (
                    <div className="relative h-10 w-10 overflow-hidden rounded-full">
                      <Image
                        src={testimonial.photo}
                        alt={testimonial.authorName}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">{testimonial.authorName}</p>
                    {testimonial.company && (
                      <p className="text-xs text-muted-foreground">{testimonial.company}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
