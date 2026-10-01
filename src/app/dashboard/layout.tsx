import { Suspense } from "react";
import type { Metadata } from "next";

import { DashboardShell } from "@/components/dashboard-shell";
import { I18nProvider } from "@/i18n/provider";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

/**
 * The dashboard is English-only for now (it is being rebuilt), so it stays
 * left-to-right in English even when the visitor chose Arabic.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider locale="en">
      <div lang="en" dir="ltr" className="flex min-h-dvh flex-1 flex-col">
        <Suspense>
          <DashboardShell>{children}</DashboardShell>
        </Suspense>
      </div>
    </I18nProvider>
  );
}
