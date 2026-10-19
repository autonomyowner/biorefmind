import type { Metadata } from "next";

import { LabWorkSection } from "@/components/admin/admin-page";

export const metadata: Metadata = { title: "Lab requests — BiorefMind Admin" };

export default function Page() {
  return <LabWorkSection />;
}
