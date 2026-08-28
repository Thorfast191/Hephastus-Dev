import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TeamMember } from "@prisma/client";

export function TeamSection({ members }: { members: TeamMember[] }) {
  if (members.length === 0) return null;

  return (
    <section id="team" className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="text-3xl font-semibold">Team</h2>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => (
          <Card key={member.id}>
            {member.photo && (
              <div className="relative h-48 w-full">
                <Image src={member.photo} alt={member.name} fill className="object-cover" />
              </div>
            )}
            <CardHeader>
              <CardTitle>{member.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{member.role}</p>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{member.bio}</CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
