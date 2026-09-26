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
import { LocalizedField } from "@/components/admin/localized-field";
import { RegionCheckboxes } from "@/components/admin/region-fields";
import { createFaq, updateFaq } from "./actions";
import type { Faq } from "@prisma/client";

export function FaqFormDialog({
  faq,
  variant = "default",
  size = "default",
  children,
}: {
  faq?: Faq;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const action = faq ? updateFaq.bind(null, faq.id) : createFaq;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant, size })}>
        {children}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{faq ? "Edit question" : "Add question"}</DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            await action(formData);
            setOpen(false);
          }}
          className="space-y-4"
        >
          <LocalizedField name="question" label="Question" value={faq?.question} required />
          <LocalizedField
            name="answer"
            label="Answer"
            value={faq?.answer}
            multiline
            rows={4}
            required
          />
          <RegionCheckboxes value={faq?.regions} />
          <Button type="submit" className="w-full">
            {faq ? "Save changes" : "Add question"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
