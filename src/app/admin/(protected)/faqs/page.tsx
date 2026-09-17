import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { FaqFormDialog } from "./faq-form-dialog";
import { FaqTable } from "./faq-table";

export default async function FaqsPage() {
  const faqs = await prisma.faq.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">FAQ</h1>
        <FaqFormDialog>
          <Plus className="mr-2 h-4 w-4" />
          Add question
        </FaqFormDialog>
      </div>
      <FaqTable faqs={faqs} />
    </div>
  );
}
