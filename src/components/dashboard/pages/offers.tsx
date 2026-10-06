"use client";

import { MyOffers } from "@/components/dashboard/market";
import { SimplePage } from "./simple";

/** My offers (factory). */
export function OffersPage() {
  return (
    <SimplePage page="offers">
      <MyOffers />
    </SimplePage>
  );
}
