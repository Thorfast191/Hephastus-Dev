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
      <DialogContent>
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
          <div className="space-y-2">
            <Label htmlFor="question">Question</Label>
            <Input id="question" name="question" defaultValue={faq?.question} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="answer">Answer</Label>
            <Textarea
              id="answer"
              name="answer"
              rows={5}
              defaultValue={faq?.answer}
              required
            />
          </div>
          <Button type="submit" className="w-full">
            {faq ? "Save changes" : "Add question"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
