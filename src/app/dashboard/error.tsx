"use client";

import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/errors";

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <p className="text-[15px] text-muted-foreground">{errorMessage(error)}</p>
      <Button variant="link" onClick={reset} className="text-[17px]">
        Try Again
      </Button>
    </div>
  );
}
