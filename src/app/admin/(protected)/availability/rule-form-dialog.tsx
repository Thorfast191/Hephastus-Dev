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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createRule, updateRule } from "./actions";
import type { AvailabilityRule } from "@prisma/client";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function RuleFormDialog({
  rule,
  variant = "default",
  size = "default",
  children,
}: {
  rule?: AvailabilityRule;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState(String(rule?.dayOfWeek ?? 1));

  const action = rule ? updateRule.bind(null, rule.id) : createRule;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant, size })}>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{rule ? "Edit availability rule" : "Add availability rule"}</DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            await action(formData);
            setOpen(false);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>Day of week</Label>
            <input type="hidden" name="dayOfWeek" value={dayOfWeek} />
            <Select value={dayOfWeek} onValueChange={(v) => v && setDayOfWeek(v)}>
              <SelectTrigger className="w-full">
                <SelectValue>{DAY_NAMES[Number(dayOfWeek)]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {DAY_NAMES.map((name, index) => (
                  <SelectItem key={name} value={String(index)}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start time</Label>
              <Input
                id="startTime"
                name="startTime"
                type="time"
                defaultValue={rule?.startTime ?? "09:00"}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End time</Label>
              <Input
                id="endTime"
                name="endTime"
                type="time"
                defaultValue={rule?.endTime ?? "17:00"}
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full">
            {rule ? "Save changes" : "Add rule"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
