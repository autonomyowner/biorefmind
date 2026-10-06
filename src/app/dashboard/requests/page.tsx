import type { Metadata } from "next";

import { RequestsPage } from "@/components/dashboard/pages/requests";

export const metadata: Metadata = { title: "Requests" };

/** Analysis requests the lab receives. */
export default function Page() {
  return <RequestsPage />;
}
