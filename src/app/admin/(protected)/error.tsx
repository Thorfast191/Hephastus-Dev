"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-start gap-4 py-12">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="max-w-sm text-muted-foreground">
        This admin screen failed to load. This is usually a temporary database
        or network issue.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
