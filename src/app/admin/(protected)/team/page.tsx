import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { TeamMemberFormDialog } from "./team-member-form-dialog";
import { TeamMemberTable } from "./team-member-table";

export default async function TeamPage() {
  const members = await prisma.teamMember.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Team</h1>
        <TeamMemberFormDialog>
          <Plus className="mr-2 h-4 w-4" />
          Add team member
        </TeamMemberFormDialog>
      </div>
      <TeamMemberTable members={members} />
    </div>
  );
}
