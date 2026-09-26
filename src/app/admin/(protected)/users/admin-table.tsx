"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
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
import { ADMIN_REGION_LABELS } from "@/lib/admin/region";
import { ROLE_LABELS } from "@/lib/admin/permissions";
import { AdminFormDialog, ResetPasswordDialog, type AdminRow } from "./admin-dialogs";
import { deleteAdmin } from "./actions";

export function AdminTable({ admins, currentId }: { admins: AdminRow[]; currentId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Site</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {admins.map((admin) => (
            <TableRow key={admin.id}>
              <TableCell>
                {admin.name}
                {admin.id === currentId && (
                  <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                )}
              </TableCell>
              <TableCell>{admin.email}</TableCell>
              <TableCell>
                <Badge variant={admin.role === "SUPER_ADMIN" ? "default" : "secondary"}>
                  {ROLE_LABELS[admin.role]}
                </Badge>
              </TableCell>
              <TableCell>
                {admin.region ? ADMIN_REGION_LABELS[admin.region] : "Both sites"}
              </TableCell>
              <TableCell className="flex justify-end gap-2">
                <AdminFormDialog
                  key={`${admin.id}-${admin.role}-${admin.region}-${admin.name}`}
                  admin={admin}
                  variant="outline"
                  size="icon"
                >
                  <Pencil className="h-4 w-4" />
                </AdminFormDialog>
                <ResetPasswordDialog admin={admin} />
                {admin.id !== currentId && (
                  <AlertDialog>
                    <AlertDialogTrigger
                      className={buttonVariants({ variant: "outline", size: "icon" })}
                      aria-label={`Delete ${admin.name}`}
                      disabled={pending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove {admin.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {admin.email} will lose access to the admin immediately.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            startTransition(async () => {
                              const result = await deleteAdmin(admin.id);
                              setError(result?.error ?? null);
                            })
                          }
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
