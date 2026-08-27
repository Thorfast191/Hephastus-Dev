import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";

export default async function AdminDashboardPage() {
  const session = await auth();
  const recentLeads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Welcome, {session?.user?.name}</h1>
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
              <li key={lead.id} className="flex items-center justify-between text-sm">
                <span>
                  {lead.name} — {lead.email}
                </span>
                <Badge variant="secondary">{lead.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-muted-foreground">
        Recent meetings will show here once the scheduler is built.
      </p>
    </div>
  );
}
