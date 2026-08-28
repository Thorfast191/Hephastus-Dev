import * as Icons from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Service } from "@prisma/client";

export function ServicesSection({ services }: { services: Service[] }) {
  if (services.length === 0) return null;

  return (
    <section id="services" className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="font-heading text-3xl font-semibold">Services</h2>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => {
          const Icon =
            (Icons[service.icon as keyof typeof Icons] as Icons.LucideIcon | undefined) ??
            Icons.Sparkles;
          return (
            <Card key={service.id}>
              <CardHeader>
                <Icon className="h-6 w-6 text-primary" />
                <CardTitle className="font-heading mt-2">{service.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {service.description}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
