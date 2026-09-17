import { SectionHeading } from "./section-heading";
import { ServiceCard } from "./service-card";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger";
import type { Service } from "@prisma/client";

export function ServicesSection({ services }: { services: Service[] }) {
  if (services.length === 0) return null;

  return (
    <section id="services" className="relative px-6 py-28 sm:py-36">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="01 — Solutions"
          title="Everything you need, under one roof"
          description="A full-service team covering strategy, design and engineering, so your product ships as one coherent piece of work."
        />

        <StaggerGroup className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => (
            <StaggerItem key={service.id} className="h-full">
              <ServiceCard
                index={index}
                icon={service.icon}
                title={service.title}
                description={service.description}
                tags={service.tags}
              />
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
