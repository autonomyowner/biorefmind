import type { Metadata } from "next";

import { AnalyticsPage } from "@/components/dashboard/insights/analytics-page";

export const metadata: Metadata = { title: "Analytics" };

/** Sales, purchases or lab work over 7, 30 or 90 days. */
export default function Page() {
  return <AnalyticsPage />;
}
