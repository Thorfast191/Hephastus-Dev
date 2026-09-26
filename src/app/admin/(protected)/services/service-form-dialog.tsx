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
import { IconPicker } from "@/components/admin/icon-picker";
import { LocalizedField } from "@/components/admin/localized-field";
import { RegionCheckboxes } from "@/components/admin/region-fields";
import { createService, updateService } from "./actions";
import type { Service } from "@prisma/client";

export function ServiceFormDialog({
  service,
  variant = "default",
  size = "default",
  children,
}: {
  service?: Service;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [icon, setIcon] = useState(service?.icon ?? "Globe");

  const action = service ? updateService.bind(null, service.id) : createService;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant, size })}>
        {children}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{service ? "Edit service" : "Add service"}</DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            await action(formData);
            setOpen(false);
          }}
          className="space-y-4"
        >
          <LocalizedField name="title" label="Title" value={service?.title} required />
          <LocalizedField
            name="description"
            label="Description"
            value={service?.description}
            multiline
            required
          />
          <RegionCheckboxes value={service?.regions} />
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input id="tags" name="tags" defaultValue={service?.tags.join(", ")} />
          </div>
          <div className="space-y-2">
            <Label>Icon</Label>
            <input type="hidden" name="icon" value={icon} />
            <IconPicker value={icon} onChange={setIcon} />
          </div>
          <Button type="submit" className="w-full">
            {service ? "Save changes" : "Add service"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
