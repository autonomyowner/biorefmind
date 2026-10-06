"use client";

import { SalesPanel, useSales } from "@/components/dashboard/market";
import { SimplePage } from "./simple";

/** Sales (farm and factory). */
export function SalesPage() {
  const sales = useSales();
  return (
    <SimplePage page="sales" loading={sales === undefined}>
      <SalesPanel />
    </SimplePage>
  );
}
