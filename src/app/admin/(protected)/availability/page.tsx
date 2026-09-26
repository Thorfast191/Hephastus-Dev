import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAdminRegion } from "@/lib/admin/region-server";
import { ADMIN_REGION_LABELS } from "@/lib/admin/region";
import { RegionRequired } from "@/components/admin/region-required";
import { RuleFormDialog } from "./rule-form-dialog";
import { RuleTable } from "./rule-table";
import { BlackoutFormDialog } from "./blackout-form-dialog";
import { BlackoutTable } from "./blackout-table";

export default async function AvailabilityPage() {
  const region = await getAdminRegion();

  if (region === "ALL") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Weekly availability</h1>
        <RegionRequired what="booking hours and blackout dates" />
      </div>
    );
  }

  const [rules, blackouts, settings] = await Promise.all([
    prisma.availabilityRule.findMany({ where: { region }, orderBy: { dayOfWeek: "asc" } }),
    prisma.blackoutDate.findMany({ where: { region }, orderBy: { date: "asc" } }),
    prisma.siteSettings.findUnique({ where: { region }, select: { businessTimezone: true } }),
  ]);

  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">
              Weekly availability — {ADMIN_REGION_LABELS[region]}
            </h1>
            <p className="text-sm text-muted-foreground">
              Times are in {settings?.businessTimezone ?? "UTC"} (set in Settings). A meeting
              booked on either site blocks that time on both.
            </p>
          </div>
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
