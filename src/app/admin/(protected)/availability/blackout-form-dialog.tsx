"use client";

import { useState } from "react";
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
import { createBlackout } from "./actions";

export function BlackoutFormDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant: "default", size: "default" })}>
        Add blackout date
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add blackout date</DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            await createBlackout(formData);
            setOpen(false);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" name="date" type="date" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Input id="reason" name="reason" placeholder="e.g. Holiday" />
          </div>
          <Button type="submit" className="w-full">
            Add blackout date
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
