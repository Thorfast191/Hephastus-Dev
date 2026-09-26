"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { setAdminRegion } from "@/app/admin/(protected)/region-actions";
import { ADMIN_REGION_LABELS, type AdminRegion } from "@/lib/admin/region";

const OPTIONS: AdminRegion[] = ["ALL", "EU", "BD"];

/** Segmented control in the admin header that scopes leads, meetings, settings… */
export function RegionSwitcher({ value }: { value: AdminRegion }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="radiogroup"
      aria-label="Site"
      className={cn("inline-flex rounded-lg border bg-muted/40 p-0.5", pending && "opacity-60")}
    >
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={value === option}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await setAdminRegion(option);
              router.refresh();
            })
          }
          className={cn(
            "rounded-md px-3 py-1 text-xs font-medium transition-colors",
            value === option
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {ADMIN_REGION_LABELS[option]}
        </button>
      ))}
    </div>
  );
}
