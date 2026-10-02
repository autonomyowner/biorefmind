import type { Metadata } from "next";

import { I18nProvider } from "@/i18n/provider";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

/** The admin page is English and left to right, whatever language the visitor chose. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider locale="en">
      <div lang="en" dir="ltr" className="flex min-h-dvh flex-1 flex-col">
        {children}
      </div>
    </I18nProvider>
  );
}
