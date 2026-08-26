import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ServiceFormDialog } from "./service-form-dialog";
import { ServiceTable } from "./service-table";

export default async function ServicesPage() {
  const services = await prisma.service.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Services</h1>
        <ServiceFormDialog>
          <Plus className="mr-2 h-4 w-4" />
          Add service
        </ServiceFormDialog>
      </div>
      <ServiceTable services={services} />
    </div>
  );
}
