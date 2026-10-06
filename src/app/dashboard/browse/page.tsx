import type { Metadata } from "next";

import { BrowsePage } from "@/components/dashboard/pages/browse";

export const metadata: Metadata = { title: "Browse lots" };

/** Open lots to buy, for factories. */
export default function Page() {
  return <BrowsePage />;
}
