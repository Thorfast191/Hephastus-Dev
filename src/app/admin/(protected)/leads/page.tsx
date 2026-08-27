import { prisma } from "@/lib/prisma";
import { LeadTable } from "./lead-table";

export default async function LeadsPage() {
  const leads = await prisma.lead.findMany({
    include: { service: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Leads</h1>
      <LeadTable leads={leads} />
    </div>
  );
}
