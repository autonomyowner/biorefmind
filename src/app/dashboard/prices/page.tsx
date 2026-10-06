import type { Metadata } from "next";

import { PricesPage } from "@/components/dashboard/pages/prices";

export const metadata: Metadata = { title: "Prices" };

/** The lab's price list and settings. */
export default function Page() {
  return <PricesPage />;
}
