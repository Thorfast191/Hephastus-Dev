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
import { Label } from "@/components/ui/label";
import { localize } from "@/lib/site/localized";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateLead } from "./actions";
import type { Lead, Service } from "@prisma/client";

const STATUS_OPTIONS = ["NEW", "CONTACTED", "WON", "LOST"] as const;

export function LeadDetailDialog({
  lead,
}: {
  lead: Lead & { service: Service | null };
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string>(lead.status);
  const [notes, setNotes] = useState(lead.notes);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
        View
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{lead.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p>
            <span className="text-muted-foreground">Email: </span>
            {lead.email}
          </p>
          <p>
            <span className="text-muted-foreground">Site: </span>
            {lead.region === "BD" ? "Bangladesh" : "Europe"} · {lead.locale.toUpperCase()}
            {lead.country && ` · ${lead.country}`}
          </p>
          {lead.company && (
            <p>
              <span className="text-muted-foreground">Company: </span>
              {lead.company}
            </p>
          )}
          {lead.service && (
            <p>
              <span className="text-muted-foreground">Service: </span>
              {localize(lead.service.title, "en")}
            </p>
          )}
          {lead.projectType && (
            <p>
              <span className="text-muted-foreground">Project type: </span>
              {lead.projectType}
            </p>
          )}
          {lead.budgetRange && (
            <p>
              <span className="text-muted-foreground">Budget: </span>
              {lead.budgetRange}
            </p>
          )}
          <p className="whitespace-pre-wrap rounded-md bg-muted p-3">{lead.message}</p>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => v && setStatus(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <Button
            className="w-full"
            onClick={async () => {
              await updateLead(lead.id, { status, notes });
              setOpen(false);
            }}
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
