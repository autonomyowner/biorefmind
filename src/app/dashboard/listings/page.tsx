import type { Metadata } from "next";

import { ListingsPage } from "@/components/dashboard/pages/listings";

export const metadata: Metadata = { title: "Listings" };

/** The farm's lots and the offers on them. */
export default function Page() {
  return <ListingsPage />;
}
