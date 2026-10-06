import type { Metadata } from "next";

import { OffersPage } from "@/components/dashboard/pages/offers";

export const metadata: Metadata = { title: "My offers" };

/** The factory's offers and their answers. */
export default function Page() {
  return <OffersPage />;
}
