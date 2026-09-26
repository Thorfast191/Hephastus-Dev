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
import { ImageUpload } from "@/components/admin/image-upload";
import { LocalizedField } from "@/components/admin/localized-field";
import { createTeamMember, updateTeamMember } from "./actions";
import type { TeamMember } from "@prisma/client";

export function TeamMemberFormDialog({
  member,
  variant = "default",
  size = "default",
  children,
}: {
  member?: TeamMember;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(member?.photo ?? null);

  const action = member ? updateTeamMember.bind(null, member.id) : createTeamMember;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant, size })}>
        {children}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{member ? "Edit team member" : "Add team member"}</DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            await action(formData);
            setOpen(false);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={member?.name} required />
          </div>
          <LocalizedField name="role" label="Role" value={member?.role} required />
          <LocalizedField name="bio" label="Bio" value={member?.bio} multiline required />
          <p className="text-xs text-muted-foreground">
            Team members appear on both the Europe and Bangladesh sites.
          </p>
          <div className="space-y-2">
            <Label>Photo</Label>
            <input type="hidden" name="photo" value={photo ?? ""} />
            <ImageUpload value={photo} onChange={setPhoto} />
          </div>
          <Button type="submit" className="w-full">
            {member ? "Save changes" : "Add team member"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
