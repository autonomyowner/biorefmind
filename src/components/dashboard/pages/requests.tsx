"use client";

import { LabQueue } from "@/components/dashboard/lab/queue";
import { SimplePage } from "./simple";

/** Requests (lab). */
export function RequestsPage() {
  return (
    <SimplePage page="requests">
      <LabQueue />
    </SimplePage>
  );
}
