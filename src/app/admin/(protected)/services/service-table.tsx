"use client";

import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import * as Icons from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { ServiceFormDialog } from "./service-form-dialog";
import {
  deleteService,
  moveServiceDown,
  moveServiceUp,
  toggleServiceActive,
} from "./actions";
import type { Service } from "@prisma/client";

export function ServiceTable({ services }: { services: Service[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Icon</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Active</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {services.map((service, index) => {
          const ServiceIcon = Icons[
            service.icon as keyof typeof Icons
          ] as Icons.LucideIcon | undefined;

          return (
            <TableRow key={service.id}>
              <TableCell className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={index === 0}
                  onClick={() => moveServiceUp(service.id)}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={index === services.length - 1}
                  onClick={() => moveServiceDown(service.id)}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </TableCell>
              <TableCell>{ServiceIcon && <ServiceIcon className="h-5 w-5" />}</TableCell>
              <TableCell>{service.title}</TableCell>
              <TableCell>
                <Switch
                  checked={service.active}
                  onCheckedChange={(checked) => toggleServiceActive(service.id, checked)}
                />
              </TableCell>
              <TableCell className="flex justify-end gap-2">
                <ServiceFormDialog
                  key={`${service.id}-${service.updatedAt.toISOString()}`}
                  service={service}
                  variant="outline"
                  size="icon"
                >
                  <Pencil className="h-4 w-4" />
                </ServiceFormDialog>
                <AlertDialog>
                  <AlertDialogTrigger
                    className={buttonVariants({ variant: "outline", size: "icon" })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this service?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This removes &quot;{service.title}&quot; permanently. Any
                        leads referencing it keep their history — the service
                        reference is just cleared.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteService(service.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
