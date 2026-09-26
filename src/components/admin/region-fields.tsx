"use client";

import { useRef } from "react";
import type { Region } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { hasTranslation } from "@/lib/site/localized";
import { lockedRegion } from "@/lib/admin/permissions";
import { useViewer } from "./viewer-context";

const OPTIONS: { value: Region; label: string }[] = [
  { value: "EU", label: "Europe site" },
  { value: "BD", label: "Bangladesh site" },
];

/** "Show on" checkboxes, named `regions` for `readRegions()`. */
export function RegionCheckboxes({ value }: { value?: Region[] }) {
  const selected = value ?? ["EU", "BD"];
  const groupRef = useRef<HTMLDivElement>(null);
  const locked = lockedRegion(useViewer());

  // HTML can't require "at least one of these checkboxes", so flag the first
  // box invalid when none is ticked; the browser then blocks the submit with
  // this message instead of the save failing on the server.
  function validate() {
    const boxes = groupRef.current?.querySelectorAll<HTMLInputElement>('input[name="regions"]');
    if (!boxes?.length) return;
    const anyChecked = Array.from(boxes).some((box) => box.checked);
    boxes[0].setCustomValidity(anyChecked ? "" : "Choose at least one site to show this on.");
  }

  // Region admins don't choose: the server saves their items to their own
  // site regardless, so say so instead of offering a choice it would ignore.
  if (locked) {
    const label = OPTIONS.find((option) => option.value === locked)?.label;
    return (
      <p className="text-sm text-muted-foreground">
        Shown on the <span className="font-medium text-foreground">{label}</span> only.
      </p>
    );
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium leading-none">Show on</legend>
      <div ref={groupRef} className="flex flex-wrap gap-4">
        {OPTIONS.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="regions"
              value={option.value}
              defaultChecked={selected.includes(option.value)}
              onChange={validate}
              className="h-4 w-4 accent-primary"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Where a row is shown, plus a warning when it appears on the EU site
 * without French text (French visitors would see English there).
 */
export function RegionBadges({
  regions,
  localized,
}: {
  regions: Region[];
  /** Json values that should have French, e.g. [item.title, item.description]. */
  localized: unknown[];
}) {
  const missingFrench =
    regions.includes("EU") && localized.some((value) => !hasTranslation(value, "fr"));

  return (
    <div className="flex flex-wrap gap-1">
      {regions.map((region) => (
        <Badge key={region} variant="outline">
          {region}
        </Badge>
      ))}
      {regions.length === 0 && <Badge variant="destructive">Hidden</Badge>}
      {missingFrench && <Badge variant="destructive">FR missing</Badge>}
    </div>
  );
}
