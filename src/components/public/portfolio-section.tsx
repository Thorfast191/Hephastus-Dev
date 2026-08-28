import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PortfolioItem } from "@prisma/client";

export function PortfolioSection({ items }: { items: PortfolioItem[] }) {
  if (items.length === 0) return null;

  return (
    <section id="portfolio" className="bg-muted/30 py-16">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="font-heading text-3xl font-semibold">Portfolio</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id}>
              {item.images[0] && (
                <div className="relative h-48 w-full">
                  <Image src={item.images[0]} alt={item.title} fill className="object-cover" />
                </div>
              )}
              <CardHeader>
                <CardTitle className="font-heading">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>{item.description}</p>
                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                {item.externalLink && (
                  <a
                    href={item.externalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-foreground hover:underline"
                  >
                    View project <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
