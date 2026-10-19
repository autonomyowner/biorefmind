import type { Metadata } from "next";

import { AdminEnterprisePage } from "@/components/admin/admin-page";

export const metadata: Metadata = { title: "Enterprise requests — BiorefMind Admin" };

export default function Page() {
  return <AdminEnterprisePage />;
}
