import { Suspense } from "react";
import type { Metadata } from "next";

import { DashboardShell } from "@/components/dashboard/shell";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

/** The dashboard follows the visitor's language (English or Arabic, right to left) from the root layout. */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <Suspense>
        <DashboardShell>{children}</DashboardShell>
      </Suspense>
    </div>
  );
}
