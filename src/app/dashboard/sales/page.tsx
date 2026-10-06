import type { Metadata } from "next";

import { SalesPage } from "@/components/dashboard/pages/sales";

export const metadata: Metadata = { title: "Sales" };

/** Sales and purchases. No phones: BiorefMind puts the two sides in touch. */
export default function Page() {
  return <SalesPage />;
}
