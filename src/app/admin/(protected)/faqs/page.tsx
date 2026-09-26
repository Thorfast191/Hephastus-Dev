import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAdminRegion } from "@/lib/admin/region-server";
import { ADMIN_REGION_LABELS, contentRegionWhere } from "@/lib/admin/region";
import { FaqFormDialog } from "./faq-form-dialog";
import { FaqTable } from "./faq-table";

export default async function FaqsPage() {
  const region = await getAdminRegion();
  const faqs = await prisma.faq.findMany({
    where: contentRegionWhere(region),
    orderBy: { order: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          FAQ
          {region !== "ALL" && (
            <span className="text-muted-foreground"> — on the {ADMIN_REGION_LABELS[region]} site</span>
          )}
        </h1>
        <FaqFormDialog>
          <Plus className="mr-2 h-4 w-4" />
          Add question
        </FaqFormDialog>
      </div>
      <FaqTable faqs={faqs} />
    </div>
  );
}
