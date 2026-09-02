"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
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
import { LeadDetailDialog } from "./lead-detail-dialog";
import { deleteLead } from "./actions";
import type { Lead, Service } from "@prisma/client";

type LeadWithService = Lead & { service: Service | null };

const FILTERS = ["ALL", "NEW", "CONTACTED", "WON", "LOST"] as const;

export function LeadTable({ leads }: { leads: LeadWithService[] }) {
  const [filter, setFilter] = useState<string>("ALL");

  const filtered = filter === "ALL" ? leads : leads.filter((l) => l.status === filter);

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
            <TableHead>Date</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell>{lead.createdAt.toLocaleDateString()}</TableCell>
              <TableCell>{lead.name}</TableCell>
              <TableCell>{lead.email}</TableCell>
              <TableCell>{lead.service?.title ?? "—"}</TableCell>
              <TableCell>
                <Badge variant="secondary">{lead.status}</Badge>
              </TableCell>
              <TableCell className="flex justify-end gap-2">
                <LeadDetailDialog
                  key={`${lead.id}-${lead.updatedAt.toISOString()}`}
                  lead={lead}
                />
                <AlertDialog>
                  <AlertDialogTrigger
                    className={buttonVariants({ variant: "outline", size: "icon" })}
                    aria-label="Delete lead"
                  >
                    <Trash2 className="h-4 w-4" />
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently removes {lead.name}&apos;s enquiry
                        ({lead.email}). This can&apos;t be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteLead(lead.id)}>
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
