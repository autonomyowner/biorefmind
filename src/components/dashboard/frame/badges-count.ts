import type { LabQueueRow, MyListing } from "@/lib/types";

// Design: docs/superpowers/specs/2026-10-06-dashboard-pages-design.md §2 (count badges)

/** Offers waiting for the farm's answer, on lots still open. */
export function pendingOfferCount(listings: readonly MyListing[] | undefined): number {
  let n = 0;
  for (const l of listings ?? []) {
    if (l.status !== "open") continue;
    for (const o of l.offers) if (o.status === "pending") n += 1;
  }
  return n;
}

/** Lab requests to accept or to receive. */
export function labWaitingCount(rows: readonly LabQueueRow[] | undefined): number {
  return (rows ?? []).filter((r) => r.status === "requested" || r.status === "accepted").length;
}
