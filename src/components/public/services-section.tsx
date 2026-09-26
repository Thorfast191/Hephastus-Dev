import { getTranslations } from "next-intl/server";
import { SectionHeading } from "./section-heading";
import { ServiceCard } from "./service-card";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger";
import type { ServiceView } from "@/lib/site/content";

export async function ServicesSection({ services }: { services: ServiceView[] }) {
  if (services.length === 0) return null;
  const t = await getTranslations("services");

  return (
    <section id="services" className="relative px-6 py-28 sm:py-36">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description")}
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
