"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setAdminRegion } from "@/app/admin/(protected)/region-actions";

/**
 * Shown by pages that edit one region's data (settings, availability) while
 * the switcher is on "All sites".
 */
export function RegionRequired({ what }: { what: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(region: "EU" | "BD") {
    startTransition(async () => {
      await setAdminRegion(region);
      router.refresh();
    });
  }

  return (
    <div className="max-w-md space-y-4 rounded-lg border p-6">
      <p className="text-sm">
        Each site has its own {what}. Which one do you want to edit?
      </p>
      <div className="flex gap-3">
        <Button disabled={pending} onClick={() => choose("EU")}>
          Europe
        </Button>
        <Button disabled={pending} variant="outline" onClick={() => choose("BD")}>
          Bangladesh
        </Button>
      </div>
    </div>
  );
}
