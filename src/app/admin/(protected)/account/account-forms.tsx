"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitKeepingValues } from "@/components/admin/submit-keeping-values";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changeMyPassword, updateMyName, type FormState } from "./actions";

function Status({ state, success }: { state: FormState; success: string }) {
  if (state?.error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {state.error}
      </p>
    );
  }
  if (state?.ok) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {success}
      </p>
    );
  }
  return null;
}

export function NameForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState(updateMyName, undefined);

  return (
    <form onSubmit={submitKeepingValues(action)} className="space-y-4 rounded-lg border bg-background p-5">
      <p className="font-medium">Name</p>
      <div className="space-y-2">
        <Label htmlFor="name">Shown in the admin</Label>
        <Input id="name" name="name" defaultValue={name} required />
      </div>
      <Status state={state} success="Name updated." />
      <Button type="submit" disabled={pending}>
        Save name
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changeMyPassword, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  // Keep what was typed after an error; clear the password fields on success.
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      onSubmit={submitKeepingValues(action)}
      className="space-y-4 rounded-lg border bg-background p-5"
    >
      <p className="font-medium">Password</p>
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="newPassword">New password</Label>
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Repeat new password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
          />
        </div>
      </div>
      <Status state={state} success="Password changed." />
      <Button type="submit" disabled={pending}>
        Change password
      </Button>
    </form>
  );
}
