"use client";

import { BrowseListings } from "@/components/dashboard/market";
import { SimplePage } from "./simple";

/** Browse lots (factory). */
export function BrowsePage() {
  return (
    <SimplePage page="browse">
      <BrowseListings />
    </SimplePage>
  );
}
