"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Trash2 } from "lucide-react";
import { cancelMeeting, deleteMeeting } from "./actions";
import type { Meeting } from "@prisma/client";

const FILTERS = ["ALL", "CONFIRMED", "CANCELLED"] as const;

export function MeetingTable({
  meetings,
  businessTimezone,
}: {
  meetings: Meeting[];
  businessTimezone: string;
}) {
  const [filter, setFilter] = useState<string>("ALL");
  const formatter = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: businessTimezone,
  });

  const filtered = filter === "ALL" ? meetings : meetings.filter((m) => m.status === filter);

  return (
    <div className="space-y-4">
      <div className="w-40">
        <Select value={filter} onValueChange={(v) => v && setFilter(v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTERS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When ({businessTimezone})</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Topic</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((meeting) => (
            <TableRow key={meeting.id}>
              <TableCell>{formatter.format(meeting.scheduledAt)}</TableCell>
              <TableCell>{meeting.name}</TableCell>
              <TableCell>{meeting.email}</TableCell>
              <TableCell>{meeting.topic}</TableCell>
              <TableCell>
                <Badge variant={meeting.status === "CONFIRMED" ? "default" : "secondary"}>
                  {meeting.status}
                </Badge>
              </TableCell>
              <TableCell className="flex justify-end gap-2">
                {meeting.status === "CONFIRMED" && (
                  <AlertDialog>
                    <AlertDialogTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
                      Cancel
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel this meeting?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This frees the {formatter.format(meeting.scheduledAt)} slot and emails{" "}
                          {meeting.email} a cancellation notice.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Back</AlertDialogCancel>
                        <AlertDialogAction onClick={() => cancelMeeting(meeting.id)}>
                          Cancel meeting
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <AlertDialog>
                  <AlertDialogTrigger
                    className={buttonVariants({ variant: "outline", size: "icon" })}
                    aria-label="Delete meeting"
                  >
                    <Trash2 className="h-4 w-4" />
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this meeting?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently removes the record of {meeting.name}&apos;s
                        booking ({formatter.format(meeting.scheduledAt)}). No email is
                        sent. This can&apos;t be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteMeeting(meeting.id)}>
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
    </div>
  );
}
