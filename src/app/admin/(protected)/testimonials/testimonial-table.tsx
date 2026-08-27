"use client";

import Image from "next/image";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { TestimonialFormDialog } from "./testimonial-form-dialog";
import {
  deleteTestimonial,
  moveTestimonialDown,
  moveTestimonialUp,
} from "./actions";
import type { Testimonial } from "@prisma/client";

export function TestimonialTable({ testimonials }: { testimonials: Testimonial[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Photo</TableHead>
          <TableHead>Author</TableHead>
          <TableHead>Quote</TableHead>
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
                disabled={index === 0}
                onClick={() => moveTestimonialUp(testimonial.id)}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={index === testimonials.length - 1}
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
            <TableCell className="max-w-xs truncate">{testimonial.quote}</TableCell>
            <TableCell className="flex justify-end gap-2">
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
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
