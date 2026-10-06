"use client";

import { FadeIn } from "@/components/motion";
import { dashboardMessages } from "@/components/dashboard/messages";
import { pagesMessages } from "@/components/dashboard/pages-messages";
import { useMessages } from "@/i18n/provider";
import { PageHeader } from "./page-header";

type Page = "sales" | "browse" | "offers" | "requests" | "prices";

/** A page that is one existing panel, full width, under its header. */
export function SimplePage({ page, children }: { page: Page; children: React.ReactNode }) {
  const t = useMessages(pagesMessages);
  const nav = useMessages(dashboardMessages).nav.pages;
  return (
    <>
      <PageHeader title={nav[page]} description={t.headers[page]} />
      <FadeIn index={1}>{children}</FadeIn>
    </>
  );
}
