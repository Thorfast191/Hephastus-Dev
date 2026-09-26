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
import { MultiImageUpload } from "@/components/admin/image-upload";
import { LocalizedField } from "@/components/admin/localized-field";
import { RegionCheckboxes } from "@/components/admin/region-fields";
import { createPortfolioItem, updatePortfolioItem } from "./actions";
import type { PortfolioItem } from "@prisma/client";

export function PortfolioFormDialog({
  item,
  variant = "default",
  size = "default",
  children,
}: {
  item?: PortfolioItem;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<string[]>(item?.images ?? []);

  const action = item ? updatePortfolioItem.bind(null, item.id) : createPortfolioItem;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant, size })}>
        {children}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Edit project" : "Add project"}</DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            await action(formData);
            setOpen(false);
          }}
          className="space-y-4"
        >
          <LocalizedField name="title" label="Title" value={item?.title} required />
          <LocalizedField
            name="description"
            label="Description"
            value={item?.description}
            multiline
            required
          />
          <RegionCheckboxes value={item?.regions} />
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input id="tags" name="tags" defaultValue={item?.tags.join(", ")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="externalLink">External link</Label>
            <Input
              id="externalLink"
              name="externalLink"
              type="url"
              defaultValue={item?.externalLink ?? ""}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label>Images</Label>
            <input type="hidden" name="images" value={JSON.stringify(images)} />
            <MultiImageUpload value={images} onChange={setImages} />
          </div>
          <Button type="submit" className="w-full">
            {item ? "Save changes" : "Add project"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
