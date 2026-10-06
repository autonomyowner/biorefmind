"use client";

import { BrowseListings, useOpenListings } from "@/components/dashboard/market";
import { SimplePage } from "./simple";

/** Browse lots (factory). */
export function BrowsePage() {
  const lots = useOpenListings();
  return (
    <SimplePage page="browse" loading={lots === undefined}>
      <BrowseListings />
    </SimplePage>
  );
}
