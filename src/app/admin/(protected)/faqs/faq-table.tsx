"use client";

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
import { FaqFormDialog } from "./faq-form-dialog";
import { deleteFaq, moveFaqDown, moveFaqUp, toggleFaqActive } from "./actions";
import type { Faq } from "@prisma/client";

export function FaqTable({ faqs }: { faqs: Faq[] }) {
  if (faqs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No questions yet. Add one to make the FAQ section appear on the public site.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Question</TableHead>
          <TableHead>Answer</TableHead>
          <TableHead>Active</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {faqs.map((faq, index) => (
          <TableRow key={faq.id}>
            <TableCell className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Move up"
                disabled={index === 0}
                onClick={() => moveFaqUp(faq.id)}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Move down"
                disabled={index === faqs.length - 1}
                onClick={() => moveFaqDown(faq.id)}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </TableCell>
            <TableCell className="max-w-xs font-medium">{faq.question}</TableCell>
            <TableCell className="max-w-md truncate text-muted-foreground">
              {faq.answer}
            </TableCell>
            <TableCell>
              <Switch
                checked={faq.active}
                onCheckedChange={(checked) => toggleFaqActive(faq.id, checked)}
              />
            </TableCell>
            <TableCell className="flex justify-end gap-2">
              <FaqFormDialog
                key={`${faq.id}-${faq.updatedAt.toISOString()}`}
                faq={faq}
                variant="outline"
                size="icon"
              >
                <Pencil className="h-4 w-4" />
              </FaqFormDialog>
              <AlertDialog>
                <AlertDialogTrigger
                  className={buttonVariants({ variant: "outline", size: "icon" })}
                  aria-label="Delete question"
                >
                  <Trash2 className="h-4 w-4" />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this question?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently removes &quot;{faq.question}&quot; from the FAQ
                      section. This can&apos;t be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteFaq(faq.id)}>
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
