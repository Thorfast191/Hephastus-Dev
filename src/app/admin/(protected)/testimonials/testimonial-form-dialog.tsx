"use client";

import { useState } from "react";
import type { VariantProps } from "class-variance-authority";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/admin/image-upload";
import { LocalizedField } from "@/components/admin/localized-field";
import { RegionCheckboxes } from "@/components/admin/region-fields";
import { createTestimonial, updateTestimonial } from "./actions";
import type { Testimonial } from "@prisma/client";

export function TestimonialFormDialog({
  testimonial,
  variant = "default",
  size = "default",
  children,
}: {
  testimonial?: Testimonial;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(testimonial?.photo ?? null);

  const action = testimonial
    ? updateTestimonial.bind(null, testimonial.id)
    : createTestimonial;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant, size })}>
        {children}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {testimonial ? "Edit testimonial" : "Add testimonial"}
          </DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            await action(formData);
            setOpen(false);
          }}
          className="space-y-4"
        >
          <LocalizedField
            name="quote"
            label="Quote"
            value={testimonial?.quote}
            multiline
            required
          />
          <div className="space-y-2">
            <Label htmlFor="authorName">Author name</Label>
            <Input
              id="authorName"
              name="authorName"
              defaultValue={testimonial?.authorName}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input id="company" name="company" defaultValue={testimonial?.company ?? ""} />
          </div>
          <RegionCheckboxes value={testimonial?.regions} />
          <div className="space-y-2">
            <Label>Photo</Label>
            <input type="hidden" name="photo" value={photo ?? ""} />
            <ImageUpload value={photo} onChange={setPhoto} />
          </div>
          <Button type="submit" className="w-full">
            {testimonial ? "Save changes" : "Add testimonial"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
