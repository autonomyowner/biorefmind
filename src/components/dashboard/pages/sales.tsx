"use client";

import { SalesPanel } from "@/components/dashboard/market";
import { SimplePage } from "./simple";

/** Sales (farm and factory). */
export function SalesPage() {
  return (
    <SimplePage page="sales">
      <SalesPanel />
    </SimplePage>
  );
}
