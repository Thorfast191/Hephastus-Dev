import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PortfolioFormDialog } from "./portfolio-form-dialog";
import { PortfolioTable } from "./portfolio-table";

export default async function PortfolioPage() {
  const items = await prisma.portfolioItem.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Portfolio</h1>
        <PortfolioFormDialog>
          <Plus className="mr-2 h-4 w-4" />
          Add project
        </PortfolioFormDialog>
      </div>
      <PortfolioTable items={items} />
    </div>
  );
}
