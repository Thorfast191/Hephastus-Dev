import { prisma } from "@/lib/prisma";
import { MeetingTable } from "./meeting-table";

export default async function MeetingsPage() {
  const [meetings, settings] = await Promise.all([
    prisma.meeting.findMany({ orderBy: { scheduledAt: "asc" } }),
    prisma.siteSettings.findFirst(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Meetings</h1>
      <MeetingTable meetings={meetings} businessTimezone={settings?.businessTimezone ?? "UTC"} />
    </div>
  );
}
