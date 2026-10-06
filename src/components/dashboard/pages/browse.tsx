"use client";

import { useEffect, useState } from "react";

import { useAssistantCard } from "@/components/dashboard/assistant/use-card";
import { BrowseListings, useOpenListings, type OfferDraft } from "@/components/dashboard/market";
import { SimplePage } from "./simple";

/** Browse lots (factory). `?card=…` (from the assistant) opens the offer form on that lot, pre-filled. */
export function BrowsePage() {
  const lots = useOpenListings();
  const { card, done } = useAssistantCard("offer");
  const [offer, setOffer] = useState<OfferDraft | null>(null);
  if (card && offer?.listingId !== card.listingId) setOffer({ listingId: card.listingId, quantityKg: card.quantityKg, priceDzdPerKg: card.priceDzdPerKg });
  useEffect(() => {
    if (offer) done();
  }, [offer, done]);
  return (
    <SimplePage page="browse" loading={lots === undefined}>
      <BrowseListings offer={offer} />
    </SimplePage>
  );
}
