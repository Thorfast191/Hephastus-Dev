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
import { Textarea } from "@/components/ui/textarea";
import { MultiImageUpload } from "@/components/admin/image-upload";
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
      <DialogContent>
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
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" defaultValue={item?.title} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={item?.description}
              required
            />
          </div>
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
