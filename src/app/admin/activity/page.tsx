import type { Metadata } from "next";

import { ActivitySection } from "@/components/admin/admin-page";

export const metadata: Metadata = { title: "Activity — BiorefMind Admin" };

export default function Page() {
  return <ActivitySection />;
}
