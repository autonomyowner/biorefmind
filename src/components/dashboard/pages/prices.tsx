"use client";

import { LabSettings } from "@/components/dashboard/lab/settings";
import { SimplePage } from "./simple";

/** Prices (lab). */
export function PricesPage() {
  return (
    <SimplePage page="prices">
      <LabSettings />
    </SimplePage>
  );
}
