import type { Metadata } from "next";

import { AiSection } from "@/components/admin/admin-page";

export const metadata: Metadata = { title: "AI — BiorefMind Admin" };

export default function Page() {
  return <AiSection />;
}
