"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
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
import { createBlackout, updateBlackout } from "./actions";
import type { BlackoutDate } from "@prisma/client";

export function BlackoutFormDialog({ blackout }: { blackout?: BlackoutDate }) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(blackout);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={buttonVariants({
          variant: isEdit ? "outline" : "default",
          size: isEdit ? "icon" : "default",
        })}
        aria-label={isEdit ? "Edit blackout date" : undefined}
      >
        {isEdit ? <Pencil className="h-4 w-4" /> : "Add blackout date"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit blackout date" : "Add blackout date"}
          </DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            if (blackout) {
              await updateBlackout(blackout.id, formData);
            } else {
              await createBlackout(formData);
            }
            setOpen(false);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              name="date"
              type="date"
              required
              defaultValue={blackout?.date.toISOString().slice(0, 10)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Input
              id="reason"
              name="reason"
              placeholder="e.g. Holiday"
              defaultValue={blackout?.reason ?? ""}
            />
          </div>
          <Button type="submit" className="w-full">
            {isEdit ? "Save changes" : "Add blackout date"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
