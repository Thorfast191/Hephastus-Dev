"use client";

import { useActionState, useEffect, useState } from "react";
import type { VariantProps } from "class-variance-authority";
import type { AdminRole, AdminUser, Region } from "@prisma/client";
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
import { ROLE_LABELS } from "@/lib/admin/permissions";
import { submitKeepingValues } from "@/components/admin/submit-keeping-values";
import {
  createAdmin,
  resetAdminPassword,
  updateAdmin,
  type FormState,
} from "./actions";

export type AdminRow = Pick<AdminUser, "id" | "name" | "email" | "role" | "region" | "createdAt">;

const selectClass = "h-9 w-full rounded-md border bg-transparent px-3 text-sm disabled:opacity-50";

/**
 * Close the dialog when a submission succeeds. Keyed on the state object, so
 * it fires once per successful submit — not again when the dialog is reopened.
 * `setOpen` is a state setter, hence stable.
 */
function useCloseOnSuccess(state: FormState, setOpen: (open: boolean) => void) {
  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state, setOpen]);
}

function FormError({ state }: { state: FormState }) {
  if (!state?.error) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {state.error}
    </p>
  );
}

function AccessFields({ role: initialRole, region }: { role?: AdminRole; region?: Region | null }) {
  const [role, setRole] = useState<AdminRole>(initialRole ?? "REGION_ADMIN");

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <select
          id="role"
          name="role"
          value={role}
          onChange={(event) => setRole(event.target.value as AdminRole)}
          className={selectClass}
        >
          <option value="REGION_ADMIN">{ROLE_LABELS.REGION_ADMIN}</option>
          <option value="SUPER_ADMIN">{ROLE_LABELS.SUPER_ADMIN}</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="region">Site</Label>
        <select
          id="region"
          name="region"
          defaultValue={region ?? "BD"}
          disabled={role === "SUPER_ADMIN"}
          className={selectClass}
        >
          <option value="EU">Europe</option>
          <option value="BD">Bangladesh</option>
        </select>
      </div>
      <p className="text-xs text-muted-foreground sm:col-span-2">
        {role === "SUPER_ADMIN"
          ? "Manages both sites, the team and other admins."
          : "Sees only this site's leads, meetings, settings and booking hours, and edits content shown on this site alone."}
      </p>
    </div>
  );
}

export function AdminFormDialog({
  admin,
  variant = "default",
  size = "default",
  children,
}: {
  admin?: AdminRow;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const action = admin ? updateAdmin.bind(null, admin.id) : createAdmin;
  const [state, formAction, pending] = useActionState(action, undefined);
  useCloseOnSuccess(state, setOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant, size })}>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{admin ? `Edit ${admin.name}` : "Add admin"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submitKeepingValues(formAction)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={admin?.name} required />
          </div>
          {!admin && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="off" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Initial password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={10}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  At least 10 characters. They can change it under My account.
                </p>
              </div>
            </>
          )}
          <AccessFields role={admin?.role} region={admin?.region} />
          <FormError state={state} />
          <Button type="submit" className="w-full" disabled={pending}>
            {admin ? "Save changes" : "Add admin"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ResetPasswordDialog({ admin }: { admin: AdminRow }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    resetAdminPassword.bind(null, admin.id),
    undefined
  );
  useCloseOnSuccess(state, setOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
        Reset password
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New password for {admin.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submitKeepingValues(formAction)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={10}
              required
            />
          </div>
          <FormError state={state} />
          <Button type="submit" className="w-full" disabled={pending}>
            Set password
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
