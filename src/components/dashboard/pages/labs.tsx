"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, TestTubes } from "lucide-react";

import { FadeIn } from "@/components/motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LabDirectory } from "@/components/dashboard/lab-directory";
import { LabTests, useMyLabRequests } from "@/components/dashboard/labtests/my-requests";
import { DASH, withGuest } from "@/components/dashboard/links";
import { dashboardMessages } from "@/components/dashboard/messages";
import { pagesMessages } from "@/components/dashboard/pages-messages";
import { useDashboard } from "@/components/dashboard/shell";
import { useMessages } from "@/i18n/provider";
import { PageHeader } from "./page-header";
import { PanelSkeleton } from "./simple";

type Tab = "tests" | "find";

const TRIGGER =
  "h-full flex-none gap-2 rounded-full px-4 text-[14px] font-medium text-foreground/70 hover:text-foreground data-active:btn-navy data-active:text-white data-active:shadow-none";

/** Labs (farm and factory): "My tests" and "Find a lab"; `?tab=find` opens the second. */
export function LabsPage() {
  const { workspace, guest } = useDashboard();
  const router = useRouter();
  const t = useMessages(pagesMessages);
  const d = useMessages(dashboardMessages);
  const tab: Tab = useSearchParams().get("tab") === "find" ? "find" : "tests";
  const requests = useMyLabRequests();

  function choose(next: unknown) {
    const href = next === "find" ? `${DASH.labs}?tab=find` : DASH.labs;
    router.replace(withGuest(href, guest), { scroll: false });
  }

  return (
    <>
      <PageHeader title={d.nav.pages.labs} description={t.headers.labs} />
      <Tabs value={tab} onValueChange={choose} className="gap-5">
        <FadeIn index={1}>
          <TabsList className="h-11 rounded-full border border-white/80 bg-white/60 p-1 group-data-horizontal/tabs:h-11">
            <TabsTrigger value="tests" className={TRIGGER}>
              <TestTubes className="size-4" /> {t.tabs.tests}
            </TabsTrigger>
            <TabsTrigger value="find" className={TRIGGER}>
              <Search className="size-4" /> {t.tabs.find}
            </TabsTrigger>
          </TabsList>
        </FadeIn>
        <TabsContent value="tests">
          <FadeIn index={2}>{requests === undefined ? <PanelSkeleton /> : <LabTests />}</FadeIn>
        </TabsContent>
        <TabsContent value="find">
          <FadeIn index={2}>
            <LabDirectory title={workspace.kind === "factory" ? d.directory.titleFactory : d.directory.title} />
          </FadeIn>
        </TabsContent>
      </Tabs>
    </>
  );
}
