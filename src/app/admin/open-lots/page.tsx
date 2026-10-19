import type { Metadata } from "next";

import { ModerationSection } from "@/components/admin/admin-page";

export const metadata: Metadata = { title: "All open lots — BiorefMind Admin" };

export default function Page() {
  return <ModerationSection />;
}
