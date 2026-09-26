import Link from "next/link";
import type { Region } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { getAdminRegion } from "@/lib/admin/region-server";
import { getAdminContext } from "@/lib/admin-guard";
import { ADMIN_REGION_LABELS, regionWhere } from "@/lib/admin/region";

const REGIONS: Region[] = ["EU", "BD"];

/** Per-site pipeline numbers, so neither market gets lost in the other. */
async function regionStats(region: Region) {
  const [newLeads, openLeads, upcomingMeetings] = await Promise.all([
    prisma.lead.count({ where: { region, status: "NEW" } }),
    prisma.lead.count({ where: { region, status: { in: ["NEW", "CONTACTED"] } } }),
    prisma.meeting.count({
      where: { region, status: "CONFIRMED", scheduledAt: { gte: new Date() } },
    }),
  ]);
  return { region, newLeads, openLeads, upcomingMeetings };
}

export default async function AdminDashboardPage() {
  const admin = await getAdminContext();
  const region = await getAdminRegion();
  const where = regionWhere(region);

  const [stats, recentLeads, recentMeetings] = await Promise.all([
    Promise.all(REGIONS.filter((r) => region === "ALL" || r === region).map(regionStats)),
    prisma.lead.findMany({ where, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.meeting.findMany({ where, orderBy: { scheduledAt: "desc" }, take: 5 }),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Welcome, {admin?.name}</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        {stats.map((s) => (
          <div key={s.region} className="rounded-lg border bg-background p-5">
            <p className="text-sm font-medium">{ADMIN_REGION_LABELS[s.region]}</p>
            <dl className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <dt className="text-xs text-muted-foreground">New leads</dt>
                <dd className="text-2xl font-semibold">{s.newLeads}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Open leads</dt>
                <dd className="text-2xl font-semibold">{s.openLeads}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Upcoming calls</dt>
                <dd className="text-2xl font-semibold">{s.upcomingMeetings}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Recent leads</h2>
          <Link href="/admin/leads" className="text-sm text-muted-foreground hover:underline">
            View all
          </Link>
        </div>
        {recentLeads.length === 0 ? (
          <p className="text-muted-foreground">No leads yet.</p>
        ) : (
          <ul className="space-y-2">
            {recentLeads.map((lead) => (
              <li key={lead.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2">
                  <Badge variant="outline">{lead.region}</Badge>
                  {lead.name} — {lead.email}
                </span>
                <Badge variant="secondary">{lead.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Recent meetings</h2>
          <Link href="/admin/meetings" className="text-sm text-muted-foreground hover:underline">
            View all
          </Link>
        </div>
        {recentMeetings.length === 0 ? (
          <p className="text-muted-foreground">No meetings booked yet.</p>
        ) : (
          <ul className="space-y-2">
            {recentMeetings.map((meeting) => (
              <li key={meeting.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2">
                  <Badge variant="outline">{meeting.region}</Badge>
                  {meeting.name} — {meeting.topic}
                </span>
                <Badge variant={meeting.status === "CONFIRMED" ? "default" : "secondary"}>
                  {meeting.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
