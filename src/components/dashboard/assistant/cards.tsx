"use client";

import Link from "next/link";
import { ArrowRight, FlaskConical, HandCoins, ScanText, Sprout, type LucideIcon } from "lucide-react";

import { assistantMessages } from "@/components/dashboard/assistant/assistant-messages";
import { DASH } from "@/components/dashboard/links";
import { fill } from "@/components/dashboard/messages";
import { useDashHref } from "@/components/dashboard/use-dash-href";
import { useLocale, useMessages } from "@/i18n/provider";
import { catalogLabels, labelOf, residueLabel } from "@/lib/catalog-labels";
import { formatDzd, formatKg } from "@/lib/pricing";
import type { AssistantCard, AssistantMessage } from "@/lib/types";

// Design: docs/superpowers/specs/2026-10-06-ai-assistant-design.md ("Action cards").

/** Where a card opens: the normal page, which reads `card=<messageId>.<index>` and opens its form pre-filled. */
export function cardHref(card: AssistantCard, messageId: string, index: number): string {
  const ref = `card=${messageId}.${index}`;
  if (card.type === "listing") return `${DASH.listings}?${ref}`;
  if (card.type === "lab_request") return `${DASH.labs}?tab=find&${ref}`;
  if (card.type === "offer") return `${DASH.browse}?${ref}`;
  return `${DASH.requests}?${ref}`;
}

const ICON: Record<AssistantCard["type"], LucideIcon> = { listing: Sprout, lab_request: FlaskConical, offer: HandCoins, results: ScanText };

/** "card=<messageId>.<index>" from a page's search params, or null. */
export function cardRef(value: string | null): { messageId: string; index: number } | null {
  const m = value ? /^([a-z0-9]+)\.(\d{1,2})$/i.exec(value) : null;
  return m ? { messageId: m[1], index: Number(m[2]) } : null;
}

export function CardView({ card, message, index, photos }: { card: AssistantCard; message: AssistantMessage; index: number; photos: { storageId: string; url: string }[] }) {
  const t = useMessages(assistantMessages);
  const labels = useMessages(catalogLabels);
  const locale = useLocale();
  const href = useDashHref();
  const Icon = ICON[card.type];

  let title: string = t.cards[card.type].title;
  const lines: string[] = [];
  if (card.type === "listing") {
    lines.push(residueLabel(labels.residues, card));
    const numbers = [card.quantityKg !== undefined ? formatKg(card.quantityKg, locale) : "", card.priceDzdPerKg !== undefined ? fill(t.cards.perKg, { price: formatDzd(card.priceDzdPerKg, locale) }) : ""].filter(Boolean);
    if (numbers.length) lines.push(numbers.join(" · "));
    if (card.note) lines.push(`“${card.note}”`);
  } else if (card.type === "lab_request") {
    lines.push(card.analyses.map((a) => labelOf(labels.analyses, a)).join(" · "));
  } else if (card.type === "offer") {
    const numbers = [card.quantityKg !== undefined ? formatKg(card.quantityKg, locale) : "", card.priceDzdPerKg !== undefined ? fill(t.cards.perKg, { price: formatDzd(card.priceDzdPerKg, locale) }) : ""].filter(Boolean);
    if (numbers.length) lines.push(numbers.join(" · "));
  } else {
    title = fill(t.cards.results.title, { sample: card.sampleNo });
    const items = card.reading.items.map((i) => labelOf(labels.analyses, i.analysis));
    const panels = card.reading.panels.map((p) => labelOf(labels.analyses, p.analysis));
    lines.push([...items, ...panels].join(" · "));
  }
  const cardPhotos = card.type === "listing" ? photos.filter((p) => card.photoIds.includes(p.storageId as never)) : [];

  return (
    <div className="glass flex min-w-0 flex-col gap-3 rounded-[22px] p-4 sm:flex-row sm:items-center">
      <span className="orb flex size-10 shrink-0 items-center justify-center rounded-full">
        <Icon className="size-[18px]" strokeWidth={1.9} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold">{title}</p>
        {lines.map((l, i) => (
          <p key={i} dir="auto" className="truncate text-[13px] text-muted-foreground">
            {l}
          </p>
        ))}
        {cardPhotos.length ? (
          <div className="mt-2 flex gap-1.5">
            {cardPhotos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element -- a small Convex storage thumbnail
              <img key={p.storageId} src={p.url} alt="" className="size-10 rounded-lg border border-white object-cover" />
            ))}
          </div>
        ) : null}
        <p className="mt-1.5 text-[12px] text-muted-foreground/80">{t.cards.check}</p>
      </div>
      <Link
        href={href(cardHref(card, message.messageId, index))}
        className="btn-navy inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full px-4 text-[14px] font-semibold"
      >
        {t.cards[card.type].open}
        <ArrowRight className="size-4 rtl:-scale-x-100" />
      </Link>
    </div>
  );
}
