import type { Metadata } from "next";

import { PlanPage } from "@/components/dashboard/pages/plan";

export const metadata: Metadata = { title: "Plan" };

/** The lab's plan and directory listing. */
export default function Page() {
  return <PlanPage />;
}
