"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import { LeadDetailDialog } from "./lead-detail-dialog";
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
              <TableCell className="text-right">
                <LeadDetailDialog
                  key={`${lead.id}-${lead.updatedAt.toISOString()}`}
                  lead={lead}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
