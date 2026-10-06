"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import { FadeIn } from "@/components/motion";
import { useAssistantCard } from "@/components/dashboard/assistant/use-card";
import { MyListings, useMyListings, type ListingDraft } from "@/components/dashboard/market";
import { dashboardMessages } from "@/components/dashboard/messages";
import { pagesMessages } from "@/components/dashboard/pages-messages";
import { useDashboard } from "@/components/dashboard/shell";
import { useMessages } from "@/i18n/provider";
import { HEADER_PRIMARY, PageHeader } from "./page-header";
import { PanelSkeleton } from "./simple";

/**
 * Listings (farm): the lots and the offers on them. `?new=1` opens the new-listing form on arrival;
 * `?card=…` (from the assistant) opens it pre-filled.
 */
export function ListingsPage() {
  const { workspace, guest } = useDashboard();
  const t = useMessages(pagesMessages);
  const nav = useMessages(dashboardMessages).nav.pages;
  const listings = useMyListings();
  const canSell = !guest && workspace.role !== "inspector";
  const wantsNew = useSearchParams().get("new") === "1";
  const [adding, setAdding] = useState(canSell && wantsNew);
  const [draft, setDraft] = useState<ListingDraft | null>(null);
  // Opened from an assistant card: the form opens pre-filled (once), then the link loses its ?card=.
  const { card, done } = useAssistantCard("listing");
  const [used, setUsed] = useState<typeof card>(null);
  if (card && card !== used && canSell) {
    setUsed(card);
    const { type: _type, photoIds: _ids, ...rest } = card;
    setDraft(rest);
    setAdding(true);
  }
  useEffect(() => {
    if (used) done();
  }, [used, done]);
  return (
    <>
      <PageHeader
        title={nav.listings}
        description={t.headers.listings}
        action={
          canSell && !adding ? (
            <button type="button" onClick={() => setAdding(true)} className={HEADER_PRIMARY}>
              <Plus className="size-4" /> {t.newListing}
            </button>
          ) : null
        }
      />
      <FadeIn index={1}>
        {listings === undefined ? <PanelSkeleton /> : <MyListings adding={adding} onAddingChange={setAdding} draft={draft} />}
      </FadeIn>
    </>
  );
}
