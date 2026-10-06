"use client";

import { MyOffers, useMyOffers } from "@/components/dashboard/market";
import { SimplePage } from "./simple";

/** My offers (factory). */
export function OffersPage() {
  const offers = useMyOffers();
  return (
    <SimplePage page="offers" loading={offers === undefined}>
      <MyOffers />
    </SimplePage>
  );
}
