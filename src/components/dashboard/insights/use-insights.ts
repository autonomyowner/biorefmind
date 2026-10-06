"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";

import { useDashboard } from "@/components/dashboard/shell";
import { api } from "@/lib/backend";
import type { WorkspaceInsights } from "@/lib/types";
import { sampleInsights, type Range } from "./sample";

export type { Range };

/**
 * The workspace's analytics for the last `days` days (`insights.workspace`).
 * Guest preview: a fixed sample farm, no backend call.
 * While a new range loads, the last answer stays on screen so the charts move to the new numbers.
 */
export function useInsights(days: Range): WorkspaceInsights | undefined {
  const { workspace, guest } = useDashboard();
  const [now] = useState(() => Date.now());
  const live = useQuery(api.insights.workspace, guest ? "skip" : { companyId: workspace.companyId, days });
  const sample = useMemo(() => (guest ? sampleInsights(days, now) : undefined), [guest, days, now]);

  const [kept, setKept] = useState<WorkspaceInsights | undefined>(undefined);
  if (live !== undefined && live !== kept) setKept(live);

  return guest ? sample : (live ?? kept);
}
