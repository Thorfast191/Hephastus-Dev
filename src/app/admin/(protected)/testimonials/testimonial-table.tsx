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
import { RegionBadges } from "@/components/admin/region-fields";
import { LockedNote, useViewer } from "@/components/admin/viewer-context";
import { contentLockReason } from "@/lib/admin/permissions";
import { localize } from "@/lib/site/localized";
import { TestimonialFormDialog } from "./testimonial-form-dialog";
import {
  deleteTestimonial,
  moveTestimonialDown,
  moveTestimonialUp,
  toggleTestimonialActive,
} from "./actions";
import type { Testimonial } from "@prisma/client";

export function TestimonialTable({ testimonials }: { testimonials: Testimonial[] }) {
  const viewer = useViewer();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Photo</TableHead>
          <TableHead>Author</TableHead>
          <TableHead>Quote</TableHead>
          <TableHead>Shown on</TableHead>
          <TableHead>Active</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {testimonials.map((testimonial, index) => (
          <TableRow key={testimonial.id}>
            <TableCell className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                disabled={index === 0 || Boolean(contentLockReason(viewer, testimonial.regions))}
                onClick={() => moveTestimonialUp(testimonial.id)}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={index === testimonials.length - 1 || Boolean(contentLockReason(viewer, testimonial.regions))}
                onClick={() => moveTestimonialDown(testimonial.id)}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </TableCell>
            <TableCell>
              {testimonial.photo && (
                <div className="relative h-10 w-10 overflow-hidden rounded-full border">
                  <Image src={testimonial.photo} alt="" fill className="object-cover" />
                </div>
              )}
            </TableCell>
            <TableCell>
              {testimonial.authorName}
              {testimonial.company && (
                <span className="text-muted-foreground"> — {testimonial.company}</span>
              )}
            </TableCell>
            <TableCell className="max-w-xs truncate">
              {localize(testimonial.quote, "en")}
            </TableCell>
            <TableCell>
              <RegionBadges regions={testimonial.regions} localized={[testimonial.quote]} />
            </TableCell>
            <TableCell>
              <Switch
                disabled={Boolean(contentLockReason(viewer, testimonial.regions))}
                checked={testimonial.active}
                onCheckedChange={(checked) =>
                  toggleTestimonialActive(testimonial.id, checked)
                }
              />
            </TableCell>
            <TableCell className="flex justify-end gap-2">
              {contentLockReason(viewer, testimonial.regions) ? (
                <LockedNote reason={contentLockReason(viewer, testimonial.regions)!} />
              ) : (
                <>
                  <TestimonialFormDialog
                    key={`${testimonial.id}-${testimonial.updatedAt.toISOString()}`}
                    testimonial={testimonial}
                    variant="outline"
                    size="icon"
                  >
                    <Pencil className="h-4 w-4" />
                  </TestimonialFormDialog>
                  <AlertDialog>
                    <AlertDialogTrigger
                      className={buttonVariants({ variant: "outline", size: "icon" })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this testimonial?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes the quote from &quot;{testimonial.authorName}&quot;
                          permanently.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteTestimonial(testimonial.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
