"use client";

import Image from "next/image";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
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
import { TeamMemberFormDialog } from "./team-member-form-dialog";
import {
  deleteTeamMember,
  moveTeamMemberDown,
  moveTeamMemberUp,
  toggleTeamMemberActive,
} from "./actions";
import type { TeamMember } from "@prisma/client";

export function TeamMemberTable({ members }: { members: TeamMember[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Photo</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Active</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member, index) => (
          <TableRow key={member.id}>
            <TableCell className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                disabled={index === 0}
                onClick={() => moveTeamMemberUp(member.id)}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={index === members.length - 1}
                onClick={() => moveTeamMemberDown(member.id)}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </TableCell>
            <TableCell>
              {member.photo && (
                <div className="relative h-10 w-10 overflow-hidden rounded-full border">
                  <Image src={member.photo} alt="" fill className="object-cover" />
                </div>
              )}
            </TableCell>
            <TableCell>{member.name}</TableCell>
            <TableCell>{member.role}</TableCell>
            <TableCell>
              <Switch
                checked={member.active}
                onCheckedChange={(checked) => toggleTeamMemberActive(member.id, checked)}
              />
            </TableCell>
            <TableCell className="flex justify-end gap-2">
              <TeamMemberFormDialog
                key={`${member.id}-${member.updatedAt.toISOString()}`}
                member={member}
                variant="outline"
                size="icon"
              >
                <Pencil className="h-4 w-4" />
              </TeamMemberFormDialog>
              <AlertDialog>
                <AlertDialogTrigger
                  className={buttonVariants({ variant: "outline", size: "icon" })}
                >
                  <Trash2 className="h-4 w-4" />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this team member?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes &quot;{member.name}&quot; permanently.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteTeamMember(member.id)}>
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
