import type { Metadata } from "next";

import { HouseLotsSection } from "@/components/admin/admin-page";

export const metadata: Metadata = { title: "BiorefMind lots — BiorefMind Admin" };

export default function Page() {
  return <HouseLotsSection />;
}
