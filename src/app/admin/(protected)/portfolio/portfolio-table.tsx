"use client";

import Image from "next/image";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { PortfolioFormDialog } from "./portfolio-form-dialog";
import {
  deletePortfolioItem,
  movePortfolioItemDown,
  movePortfolioItemUp,
  toggleFeatured,
  togglePortfolioActive,
} from "./actions";
import type { PortfolioItem } from "@prisma/client";

export function PortfolioTable({ items }: { items: PortfolioItem[] }) {
  const viewer = useViewer();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Image</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Tags</TableHead>
          <TableHead>Shown on</TableHead>
          <TableHead>Featured</TableHead>
          <TableHead>Active</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item, index) => (
          <TableRow key={item.id}>
            <TableCell className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                disabled={index === 0 || Boolean(contentLockReason(viewer, item.regions))}
                onClick={() => movePortfolioItemUp(item.id)}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={index === items.length - 1 || Boolean(contentLockReason(viewer, item.regions))}
                onClick={() => movePortfolioItemDown(item.id)}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </TableCell>
            <TableCell>
              {item.images[0] && (
                <div className="relative h-10 w-10 overflow-hidden rounded-md border">
                  <Image src={item.images[0]} alt="" fill className="object-cover" />
                </div>
              )}
            </TableCell>
            <TableCell>{localize(item.title, "en")}</TableCell>
            <TableCell className="flex flex-wrap gap-1">
              {item.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </TableCell>
            <TableCell>
              <RegionBadges regions={item.regions} localized={[item.title, item.description]} />
            </TableCell>
            <TableCell>
              <Switch
                disabled={Boolean(contentLockReason(viewer, item.regions))}
                checked={item.featured}
                onCheckedChange={(checked) => toggleFeatured(item.id, checked)}
              />
            </TableCell>
            <TableCell>
              <Switch
                disabled={Boolean(contentLockReason(viewer, item.regions))}
                checked={item.active}
                onCheckedChange={(checked) => togglePortfolioActive(item.id, checked)}
              />
            </TableCell>
            <TableCell className="flex justify-end gap-2">
              {contentLockReason(viewer, item.regions) ? (
                <LockedNote reason={contentLockReason(viewer, item.regions)!} />
              ) : (
                <>
                  <PortfolioFormDialog
                    key={`${item.id}-${item.updatedAt.toISOString()}`}
                    item={item}
                    variant="outline"
                    size="icon"
                  >
                    <Pencil className="h-4 w-4" />
                  </PortfolioFormDialog>
                  <AlertDialog>
                    <AlertDialogTrigger
                      className={buttonVariants({ variant: "outline", size: "icon" })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this project?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes &quot;{localize(item.title, "en")}&quot; permanently.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deletePortfolioItem(item.id)}>
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
