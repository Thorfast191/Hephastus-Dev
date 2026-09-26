import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAdminRegion } from "@/lib/admin/region-server";
import { ADMIN_REGION_LABELS, contentRegionWhere } from "@/lib/admin/region";
import { TestimonialFormDialog } from "./testimonial-form-dialog";
import { TestimonialTable } from "./testimonial-table";

export default async function TestimonialsPage() {
  const region = await getAdminRegion();
  const testimonials = await prisma.testimonial.findMany({
    where: contentRegionWhere(region),
    orderBy: { order: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Testimonials
            {region !== "ALL" && (
              <span className="text-muted-foreground"> — on the {ADMIN_REGION_LABELS[region]} site</span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            The testimonials section only appears on the site once at least one is active.
          </p>
        </div>
        <TestimonialFormDialog>
          <Plus className="mr-2 h-4 w-4" />
          Add testimonial
        </TestimonialFormDialog>
      </div>
      <TestimonialTable testimonials={testimonials} />
    </div>
  );
}
