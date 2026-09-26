import { prisma } from "@/lib/prisma";
import { getAdminRegion } from "@/lib/admin/region-server";
import { ADMIN_REGION_LABELS, regionWhere } from "@/lib/admin/region";
import { MeetingTable } from "./meeting-table";

export default async function MeetingsPage() {
  const region = await getAdminRegion();
  const [meetings, settings] = await Promise.all([
    prisma.meeting.findMany({ where: regionWhere(region), orderBy: { scheduledAt: "asc" } }),
    prisma.siteSettings.findMany({ select: { region: true, businessTimezone: true } }),
  ]);
  const timezones = Object.fromEntries(settings.map((s) => [s.region, s.businessTimezone]));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Meetings — {ADMIN_REGION_LABELS[region]}</h1>
      <MeetingTable meetings={meetings} timezones={timezones} />
    </div>
  );
}
