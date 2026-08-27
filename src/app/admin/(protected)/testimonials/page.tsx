import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { TestimonialFormDialog } from "./testimonial-form-dialog";
import { TestimonialTable } from "./testimonial-table";

export default async function TestimonialsPage() {
  const testimonials = await prisma.testimonial.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Testimonials</h1>
        <TestimonialFormDialog>
          <Plus className="mr-2 h-4 w-4" />
          Add testimonial
        </TestimonialFormDialog>
      </div>
      <TestimonialTable testimonials={testimonials} />
    </div>
  );
}
