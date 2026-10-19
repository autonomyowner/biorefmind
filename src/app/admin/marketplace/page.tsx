import type { Metadata } from "next";

import { MarketSection } from "@/components/admin/admin-page";

export const metadata: Metadata = { title: "Marketplace — BiorefMind Admin" };

export default function Page() {
  return <MarketSection />;
}
