"use client";

import { useState } from "react";

import { LabPlanCard } from "@/components/dashboard/homes";
import { useDashboard } from "@/components/dashboard/shell";

const DAY = 86_400_000;

/** Plan (lab): price, trial or paid period, directory visibility. */
export function PlanPage() {
  const { workspace } = useDashboard();
  const [now] = useState(() => Date.now());
  const paid = workspace.plan === "lab_paid" && (workspace.paidUntil ?? 0) > now;
  const trial = !paid && workspace.plan === "lab_trial" && (workspace.trialEndsAt ?? 0) > now;
  const end = paid ? workspace.paidUntil! : trial ? workspace.trialEndsAt! : 0;
  const daysLeft = end ? Math.max(0, Math.ceil((end - now) / DAY)) : 0;
  return <LabPlanCard paid={paid} trial={trial} end={end} daysLeft={daysLeft} />;
}
