import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { RuleFormDialog } from "./rule-form-dialog";
import { RuleTable } from "./rule-table";
import { BlackoutFormDialog } from "./blackout-form-dialog";
import { BlackoutTable } from "./blackout-table";

export default async function AvailabilityPage() {
  const [rules, blackouts] = await Promise.all([
    prisma.availabilityRule.findMany({ orderBy: { dayOfWeek: "asc" } }),
    prisma.blackoutDate.findMany({ orderBy: { date: "asc" } }),
  ]);

  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Weekly availability</h1>
          <RuleFormDialog>
            <Plus className="mr-2 h-4 w-4" />
            Add rule
          </RuleFormDialog>
        </div>
        <RuleTable rules={rules} />
      </div>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Blackout dates</h2>
          <BlackoutFormDialog />
        </div>
        <BlackoutTable blackouts={blackouts} />
      </div>
    </div>
  );
}
