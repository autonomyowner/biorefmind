import type { Metadata } from "next";

import { AdminPage } from "@/components/admin/admin-page";

export const metadata: Metadata = { title: "Admin — BiorefMind", robots: { index: false, follow: false } };

export default function Admin() {
  return <AdminPage />;
}
