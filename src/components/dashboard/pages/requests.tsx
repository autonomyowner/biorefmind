"use client";

import { LabQueue } from "@/components/dashboard/lab/queue";
import { useLabQueue } from "@/components/dashboard/lab/ui";
import { SimplePage } from "./simple";

/** Requests (lab). */
export function RequestsPage() {
  const rows = useLabQueue();
  return (
    <SimplePage page="requests" loading={rows === undefined}>
      <LabQueue />
    </SimplePage>
  );
}
