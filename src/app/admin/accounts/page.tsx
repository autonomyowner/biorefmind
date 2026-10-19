import type { Metadata } from "next";

import { AdminAccountsPage } from "@/components/admin/admin-page";

export const metadata: Metadata = { title: "Accounts — BiorefMind Admin" };

export default function Page() {
  return <AdminAccountsPage />;
}
