"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Inbox } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { Panel } from "@/components/dashboard/profile-card";
import { fill } from "@/components/dashboard/messages";
import { labMessages } from "@/components/dashboard/lab/lab-messages";
import { QUEUE_TABS, tabOf, type QueueTab } from "@/components/dashboard/lab/lab-logic";
import { RequestDialog } from "@/components/dashboard/lab/request-detail";
import { PendingReading } from "@/components/dashboard/lab/results-form";
import { useAssistantCard } from "@/components/dashboard/assistant/use-card";
import type { LabReading } from "@/lib/types";
import { Chip, StatusChip, useFormat, useLabQueue } from "@/components/dashboard/lab/ui";
import { useMessages } from "@/i18n/provider";
import { catalogLabels, labelOf, residueLabel } from "@/lib/catalog-labels";
import type { LabQueueRow } from "@/lib/types";
import { cn } from "@/lib/utils";

/** The lab's work queue: New · Awaiting sample · In lab · Done, each request opening its detail. */
export function LabQueue({ id }: { id?: string }) {
  const t = useMessages(labMessages);
  const rows = useLabQueue();
  const [chosen, setChosen] = useState<QueueTab | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  // Opened from an assistant card: that request, with the values read in the chat waiting for its form.
  const { card, done } = useAssistantCard("results");
  const [pending, setPending] = useState<{ requestId: string; reading: LabReading } | null>(null);
  const [usedCard, setUsedCard] = useState<typeof card>(null);
  if (card && card !== usedCard) {
    setUsedCard(card);
    setPending({ requestId: card.requestId, reading: card.reading });
    setChosen("inLab");
    setOpenId(card.requestId);
  }
  useEffect(() => {
    if (usedCard) done();
  }, [usedCard, done]);

  const counts = Object.fromEntries(QUEUE_TABS.map((k) => [k, 0])) as Record<QueueTab, number>;
  for (const r of rows ?? []) counts[tabOf(r.status)] += 1;
  // Until the lab picks a tab, open the first one with work in it.
  const tab = chosen ?? (["new", "inLab", "waiting"] as const).find((k) => counts[k] > 0) ?? "new";
  const shown = (rows ?? []).filter((r) => tabOf(r.status) === tab);
  const open = rows?.find((r) => r.requestId === openId) ?? null;

  return (
    <Panel id={id} title={t.queue.title}>
      <div role="tablist" aria-label={t.queue.title} className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
        {QUEUE_TABS.map((k) => {
          const on = k === tab;
          return (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setChosen(k)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-[14px] font-medium transition-colors",
                on ? "border-transparent bg-primary text-primary-foreground" : "border-foreground/15 bg-white/70 hover:border-azure/50",
              )}
            >
              {t.queue.tabs[k]}
              <span
                dir="ltr"
                className={cn(
                  "min-w-5 rounded-full px-1.5 text-center text-[12px] font-semibold tabular-nums",
                  on ? "bg-white/20" : counts[k] > 0 && k !== "done" ? "bg-azure text-white" : "bg-foreground/[0.07] text-muted-foreground",
                )}
              >
                {counts[k]}
              </span>
            </button>
          );
        })}
      </div>

      {rows === undefined ? (
        <Spinner className="flex py-8" />
      ) : shown.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-azure/25 bg-white/40 px-6 py-9 text-center">
          <span className="orb flex size-11 items-center justify-center rounded-full">
            <Inbox className="size-5" strokeWidth={1.8} />
          </span>
          <p className="mt-3 max-w-[420px] text-[14px] leading-relaxed text-muted-foreground">{t.queue.empty[tab]}</p>
        </div>
      ) : (
        <ul role="tabpanel" className="space-y-2.5">
          {shown.map((r) => (
            <QueueRow key={r.requestId} row={r} onOpen={() => setOpenId(r.requestId)} />
          ))}
        </ul>
      )}

      <PendingReading value={pending ? { ...pending, take: () => setPending(null) } : null}>
        <RequestDialog row={open} onClose={() => setOpenId(null)} />
      </PendingReading>
    </Panel>
  );
}

function QueueRow({ row: r, onOpen }: { row: LabQueueRow; onOpen: () => void }) {
  const t = useMessages(labMessages);
  const labels = useMessages(catalogLabels);
  const f = useFormat();
  const released = r.reports.length > 0 ? r.reports[r.reports.length - 1].releasedAt : undefined;
  const when =
    r.status === "received" && r.dueAt
      ? fill(t.queue.due, { date: f.short(r.dueAt) })
      : released
        ? fill(t.queue.releasedOn, { date: f.short(released) })
        : fill(t.queue.requestedOn, { date: f.short(r.createdAt) });

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="group w-full min-w-0 rounded-2xl border border-white bg-white/70 p-4 text-start shadow-[0_10px_24px_-20px_rgba(20,30,120,0.6)] transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_30px_-22px_rgba(40,60,170,0.55)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-azure/30"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[16px] font-semibold">{r.clientName}</p>
            <p className="truncate text-[13px] text-muted-foreground">
              {r.sample.label} · {residueLabel(labels.residues, r.sample)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <bdi dir="ltr" className="text-[15px] font-semibold">
              {f.dzd(r.totalDzd)}
            </bdi>
            <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
          </div>
        </div>
        <p className="mt-1.5 line-clamp-2 text-[14px]">{r.analyses.map((a) => labelOf(labels.analyses, a.analysis)).join(" · ")}</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <StatusChip status={r.status} />
          {r.overdue ? <Chip tone="red">{t.queue.overdue}</Chip> : null}
          {r.paid ? <Chip tone="green">{t.queue.paid}</Chip> : null}
          {r.sampleNo ? (
            <span dir="ltr" className="text-[13px] font-semibold text-azure">
              {r.sampleNo}
            </span>
          ) : null}
          <span className="text-[13px] text-muted-foreground">{when}</span>
        </div>
      </button>
    </li>
  );
}
