import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-page";
import { I18nProvider } from "@/i18n/provider";

export const metadata: Metadata = { title: "Admin — BiorefMind", robots: { index: false, follow: false } };

/** The admin area is English and left to right, whatever language the visitor chose. One page per section. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider locale="en">
      <div lang="en" dir="ltr" className="flex min-h-dvh flex-1 flex-col">
        <AdminShell>{children}</AdminShell>
      </div>
    </I18nProvider>
  );
}
