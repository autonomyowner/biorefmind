import type { Metadata } from "next";

import { AdminBillingPage } from "@/components/admin/admin-page";

export const metadata: Metadata = { title: "Lab billing — BiorefMind Admin" };

export default function Page() {
  return <AdminBillingPage />;
}
