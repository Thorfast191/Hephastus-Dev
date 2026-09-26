"use client";

import { createContext, useContext } from "react";
import { Lock } from "lucide-react";
import type { Viewer } from "@/lib/admin/permissions";

/**
 * The signed-in admin's role and region, for client components that adapt to
 * it (locked rows, hidden "Show on" choices). Display only — every action is
 * re-checked on the server.
 */
const ViewerContext = createContext<Viewer>({ role: "REGION_ADMIN", region: null });

export function ViewerProvider({ viewer, children }: { viewer: Viewer; children: React.ReactNode }) {
  return <ViewerContext.Provider value={viewer}>{children}</ViewerContext.Provider>;
}

export function useViewer() {
  return useContext(ViewerContext);
}

/** Shown in place of edit/delete controls on a row the admin can't change. */
export function LockedNote({ reason }: { reason: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
      title={reason}
    >
      <Lock className="h-3.5 w-3.5" aria-hidden />
      <span className="max-w-40 truncate">{reason}</span>
    </span>
  );
}
