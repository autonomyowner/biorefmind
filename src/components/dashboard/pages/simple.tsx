"use client";

import { FadeIn, Skeleton } from "@/components/motion";
import { dashboardMessages } from "@/components/dashboard/messages";
import { pagesMessages } from "@/components/dashboard/pages-messages";
import { useMessages } from "@/i18n/provider";
import { PageHeader } from "./page-header";

type Page = "sales" | "browse" | "offers" | "requests" | "prices";

/**
 * A page that is one existing panel, full width, under its header.
 * While `loading`, a grey panel in the same shape stands in for it.
 */
export function SimplePage({ page, loading = false, children }: { page: Page; loading?: boolean; children: React.ReactNode }) {
  const t = useMessages(pagesMessages);
  const nav = useMessages(dashboardMessages).nav.pages;
  return (
    <>
      <PageHeader title={nav[page]} description={t.headers[page]} />
      <FadeIn index={1}>{loading ? <PanelSkeleton /> : children}</FadeIn>
    </>
  );
}

/** A frosted panel in grey: a title bar and a few card rows. */
export function PanelSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-busy="true" className="glass rounded-[28px] p-5 sm:p-7">
      <Skeleton className="mb-5 h-6 w-44 rounded-lg" />
      <div className="space-y-3">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
