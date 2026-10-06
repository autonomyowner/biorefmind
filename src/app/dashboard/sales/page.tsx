import type { Metadata } from "next";

import { SalesPage } from "@/components/dashboard/pages/sales";

export const metadata: Metadata = { title: "Sales" };

/** Sales and purchases, with the other side's phone. */
export default function Page() {
  return <SalesPage />;
}
