import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAdminRegion } from "@/lib/admin/region-server";
import { ADMIN_REGION_LABELS, contentRegionWhere } from "@/lib/admin/region";
import { PortfolioFormDialog } from "./portfolio-form-dialog";
import { PortfolioTable } from "./portfolio-table";

export default async function PortfolioPage() {
  const region = await getAdminRegion();
  const items = await prisma.portfolioItem.findMany({
    where: contentRegionWhere(region),
    orderBy: { order: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Portfolio
          {region !== "ALL" && (
            <span className="text-muted-foreground"> — on the {ADMIN_REGION_LABELS[region]} site</span>
          )}
        </h1>
        <PortfolioFormDialog>
          <Plus className="mr-2 h-4 w-4" />
          Add project
        </PortfolioFormDialog>
      </div>
      <PortfolioTable items={items} />
    </div>
  );
}
