import type { Metadata } from "next";

import { SettingsPage } from "@/components/dashboard/pages/settings";

export const metadata: Metadata = { title: "Settings" };

/** Profile, language and currency. */
export default function Page() {
  return <SettingsPage />;
}
