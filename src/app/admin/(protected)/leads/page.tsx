import { prisma } from "@/lib/prisma";
import { getAdminRegion } from "@/lib/admin/region-server";
import { ADMIN_REGION_LABELS, regionWhere } from "@/lib/admin/region";
import { LeadTable } from "./lead-table";

export default async function LeadsPage() {
  const region = await getAdminRegion();
  const leads = await prisma.lead.findMany({
    where: regionWhere(region),
    include: { service: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Leads — {ADMIN_REGION_LABELS[region]}</h1>
      <LeadTable leads={leads} />
    </div>
  );
}
