"use client";

import { Pencil, Trash2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { RuleFormDialog } from "./rule-form-dialog";
import { deleteRule, toggleRuleActive } from "./actions";
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

export function RuleTable({ rules }: { rules: AvailabilityRule[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Day</TableHead>
          <TableHead>Start</TableHead>
          <TableHead>End</TableHead>
          <TableHead>Active</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rules.map((rule) => (
          <TableRow key={rule.id}>
            <TableCell>{DAY_NAMES[rule.dayOfWeek]}</TableCell>
            <TableCell>{rule.startTime}</TableCell>
            <TableCell>{rule.endTime}</TableCell>
            <TableCell>
              <Switch
                checked={rule.active}
                onCheckedChange={(checked) => toggleRuleActive(rule.id, checked)}
              />
            </TableCell>
            <TableCell className="flex justify-end gap-2">
              <RuleFormDialog
                key={`${rule.id}-${rule.dayOfWeek}-${rule.startTime}-${rule.endTime}`}
                rule={rule}
                variant="outline"
                size="icon"
              >
                <Pencil className="h-4 w-4" />
              </RuleFormDialog>
              <AlertDialog>
                <AlertDialogTrigger
                  className={buttonVariants({ variant: "outline", size: "icon" })}
                >
                  <Trash2 className="h-4 w-4" />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this rule?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes the {DAY_NAMES[rule.dayOfWeek]} {rule.startTime}–
                      {rule.endTime} window permanently.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteRule(rule.id)}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
