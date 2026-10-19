import type { Metadata } from "next";

import { InquiriesSection } from "@/components/admin/admin-page";

export const metadata: Metadata = { title: "Interest requests — BiorefMind Admin" };

export default function Page() {
  return <InquiriesSection />;
}
