"use client";

import { useMyListings } from "@/components/dashboard/market";
import { useLabQueue } from "@/components/dashboard/lab/ui";
import type { DashPage } from "@/components/dashboard/links";
import { useDashboard } from "@/components/dashboard/shell";
import { labWaitingCount, pendingOfferCount } from "./badges-count";

// Design: docs/superpowers/specs/2026-10-06-dashboard-pages-design.md §2 (count badges)

export type Badges = Partial<Record<DashPage, number>>;
type Render = { children: (badges: Badges) => React.ReactNode };

/** Hands the sidebar counts for the account's type to `children` (factories have none). */
export function WithBadges({ children }: Render) {
  const { workspace } = useDashboard();
  if (workspace.kind === "farm") return <FarmBadges>{children}</FarmBadges>;
  if (workspace.kind === "lab") return <LabBadges>{children}</LabBadges>;
  return children({});
}

function FarmBadges({ children }: Render) {
  return children({ listings: pendingOfferCount(useMyListings()) });
}

function LabBadges({ children }: Render) {
  return children({ requests: labWaitingCount(useLabQueue()) });
}
