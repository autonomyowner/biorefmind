import type { Metadata } from "next";

import { LabsPage } from "@/components/dashboard/pages/labs";

export const metadata: Metadata = { title: "Labs" };

/** Lab tests sent, and the labs to send them to. */
export default function Page() {
  return <LabsPage />;
}
