import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAdminRegion } from "@/lib/admin/region-server";
import { ADMIN_REGION_LABELS, contentRegionWhere } from "@/lib/admin/region";
import { ServiceFormDialog } from "./service-form-dialog";
import { ServiceTable } from "./service-table";

export default async function ServicesPage() {
  const region = await getAdminRegion();
  const services = await prisma.service.findMany({
    where: contentRegionWhere(region),
    orderBy: { order: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Services
          {region !== "ALL" && (
            <span className="text-muted-foreground"> — on the {ADMIN_REGION_LABELS[region]} site</span>
          )}
        </h1>
        <ServiceFormDialog>
          <Plus className="mr-2 h-4 w-4" />
          Add service
        </ServiceFormDialog>
      </div>
      <ServiceTable services={services} />
    </div>
  );
}
