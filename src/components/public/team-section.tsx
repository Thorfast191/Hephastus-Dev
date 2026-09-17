import Image from "next/image";
import { SectionHeading } from "./section-heading";
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger";
import type { TeamMember } from "@prisma/client";

export function TeamSection({ members }: { members: TeamMember[] }) {
  if (members.length === 0) return null;

  return (
    <section id="team" className="relative px-6 py-28 sm:py-36">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="The people"
          title="Who you'll work with"
          description="A small senior team. The people you meet are the people who build it."
        />

        <StaggerGroup className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <StaggerItem key={member.id} className="h-full">
              <article className="group h-full overflow-hidden rounded-3xl border border-site-border bg-site-surface transition-all duration-[600ms] ease-site hover:-translate-y-2 hover:border-site-border-strong">
                {member.photo && (
                  <div className="relative aspect-[4/5] w-full overflow-hidden">
                    <Image
                      src={member.photo}
                      alt={member.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      /* Grayscale until hover keeps a row of portraits from
                         fighting the accent palette for attention. */
                      className="object-cover grayscale transition-all duration-[800ms] ease-site group-hover:scale-[1.05] group-hover:grayscale-0"
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent"
                    />
                  </div>
                )}

                <div className="p-8">
                  <h3 className="site-h3 text-xl text-site-text">{member.name}</h3>
                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.15em] text-site-accent">
                    {member.role}
                  </p>
                  <p className="mt-4 text-sm leading-relaxed text-site-muted">
                    {member.bio}
                  </p>
                </div>
              </article>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
