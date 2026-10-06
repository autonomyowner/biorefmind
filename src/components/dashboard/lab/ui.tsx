"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { motion } from "motion/react";
import { toast } from "sonner";

import { Spinner } from "@/components/ui/spinner";
import { useDashboard } from "@/components/dashboard/shell";
import { labMessages } from "@/components/dashboard/lab/lab-messages";
import { DAY } from "@/components/dashboard/lab/lab-logic";
import { localizeBackendError } from "@/i18n/backend-errors";
import { useLocale, useMessages } from "@/i18n/provider";
import { api } from "@/lib/backend";
import { errorMessage } from "@/lib/errors";
import { formatDzd } from "@/lib/pricing";
import type { LabQueueRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { Id } from "../../../../convex/_generated/dataModel";

// Shared pieces of the lab workspace. Design: docs/superpowers/specs/2026-10-06-lab-requests-design.md

export const FIELD =
  "h-11 w-full min-w-0 rounded-xl border border-foreground/10 bg-white/90 px-3.5 text-[15px] outline-none focus-visible:border-azure/60 focus-visible:ring-3 focus-visible:ring-azure/20 disabled:opacity-60";
export const AREA =
  "w-full resize-none rounded-xl border border-foreground/10 bg-white/90 px-3.5 py-2.5 text-[15px] outline-none focus-visible:border-azure/60 focus-visible:ring-3 focus-visible:ring-azure/20 disabled:opacity-60";
export const CARD = "min-w-0 rounded-2xl border border-white bg-white/70 p-4 shadow-[0_10px_24px_-20px_rgba(20,30,120,0.6)]";
export const PRIMARY =
  "btn-navy inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-[14px] font-semibold disabled:opacity-70";
export const QUIET =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-foreground/15 bg-white/60 px-4 text-[14px] font-medium transition-colors hover:bg-white disabled:opacity-60";

/** Dates and money in the page's language (Latin digits, like the rest of the site). */
export function useFormat() {
  const locale = useLocale();
  const tag = locale === "ar" ? "ar-DZ-u-nu-latn" : "en-GB";
  return {
    dzd: (n: number) => formatDzd(n, locale),
    date: (ms: number) => new Intl.DateTimeFormat(tag, { day: "numeric", month: "short", year: "numeric" }).format(ms),
    short: (ms: number) => new Intl.DateTimeFormat(tag, { day: "numeric", month: "short" }).format(ms),
  };
}

/** Backend refusals, translated, as a toast. */
export function useFail() {
  const locale = useLocale();
  return (err: unknown) => toast.error(localizeBackendError(errorMessage(err), locale));
}

/** In the guest preview, actions only explain that an account is needed. Returns true when blocked. */
export function useGuestBlock() {
  const { guest } = useDashboard();
  const t = useMessages(labMessages);
  return () => {
    if (guest) toast(t.guest);
    return guest;
  };
}

/** Owners and managers run the lab; inspectors (analysts) receive samples and save drafts. */
export function useLabRole() {
  const { workspace } = useDashboard();
  return { canManage: workspace.role !== "inspector" };
}

export function Chip({ tone, children, className }: { tone: "green" | "blue" | "violet" | "grey" | "amber" | "red"; children: React.ReactNode; className?: string }) {
  const tones = {
    green: "bg-[#dcf7ea] text-[#12a26a]",
    blue: "bg-[#e6edff] text-azure",
    violet: "bg-[#efe9ff] text-violet",
    grey: "bg-foreground/[0.06] text-muted-foreground",
    amber: "bg-[#fff1d6] text-[#a8620a]",
    red: "bg-[#ffe4e0] text-[#c2321f]",
  };
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium", tones[tone], className)}>{children}</span>
  );
}

export function StatusChip({ status }: { status: LabQueueRow["status"] }) {
  const t = useMessages(labMessages);
  const tone = (
    {
      requested: "violet",
      accepted: "amber",
      received: "blue",
      released: "green",
      declined: "grey",
      cancelled: "grey",
      expired: "grey",
      lab_unavailable: "grey",
    } as const
  )[status];
  return <Chip tone={tone}>{t.status[status]}</Chip>;
}

/** Asks once more before an action that cannot be undone. */
export function Confirm({
  text,
  yes,
  no,
  busy,
  onYes,
  onNo,
}: {
  text: string;
  yes: string;
  no: string;
  busy: boolean;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-[#eef2ff] p-3">
      <p className="text-[14px] leading-relaxed">{text}</p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={onYes} className={cn(PRIMARY, "h-9 px-4")}>
          {busy ? <Spinner size="sm" label={null} /> : yes}
        </button>
        <button type="button" disabled={busy} onClick={onNo} className={cn(QUIET, "h-9")}>
          {no}
        </button>
      </div>
    </motion.div>
  );
}

/** A label above a field. */
export function Field({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn("block min-w-0 text-[13px] font-medium", className)}>
      <span className="mb-1 block">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[12px] font-normal text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

/* ---------- The lab's queue (live, or sample rows in the guest preview) ---------- */

/** Realistic rows for the guest preview: one per tab. */
export function sampleQueue(now: number): LabQueueRow[] {
  const base = {
    clientKind: "farm" as const,
    delivery: "dropoff" as const,
    tracking: undefined,
    sampleNo: undefined,
    receivedAt: undefined,
    dueAt: undefined,
    condition: undefined,
    reason: undefined,
    cancelledBy: undefined,
    draft: undefined,
    reports: [],
    paid: false,
  };
  return [
    {
      ...base,
      requestId: "gq1" as Id<"labRequests">,
      status: "requested",
      overdue: false,
      clientName: "Ferme Saïd",
      clientPhone: "+213 555 12 34 56",
      clientRegion: "Sétif",
      analyses: [
        { analysis: "moisture", priceDzd: 1500, days: 2 },
        { analysis: "punicalagin", priceDzd: 12000, days: 7 },
      ],
      totalDzd: 13500,
      sample: { residue: "pomegranate_peels", label: "Lot A — sun-dried", state: "dried", collectedAt: now - 2 * DAY, region: "Sétif", grams: 400 },
      createdAt: now - 3 * 3_600_000,
    },
    {
      ...base,
      requestId: "gq2" as Id<"labRequests">,
      status: "accepted",
      overdue: false,
      clientName: "Extraits du Hodna",
      clientPhone: "+213 35 00 00 00",
      clientRegion: "M'Sila",
      clientKind: "factory",
      delivery: "courier",
      tracking: "YAL-458812",
      analyses: [{ analysis: "mold", priceDzd: 3000, days: 5 }],
      totalDzd: 3000,
      sample: { residue: "citrus_peels", label: "Orange peel, batch 12", state: "fresh", collectedAt: now - DAY, region: "Blida", grams: 1200, packaging: "Cool box" },
      createdAt: now - 2 * DAY,
    },
    {
      ...base,
      requestId: "gq3" as Id<"labRequests">,
      status: "received",
      overdue: true,
      clientName: "Coopérative El Baraka",
      clientPhone: "+213 555 98 76 54",
      clientRegion: "Béjaïa",
      analyses: [
        { analysis: "polyphenols", priceDzd: 4000, days: 5 },
        { analysis: "heavy_metals", priceDzd: 8000, days: 10 },
      ],
      totalDzd: 12000,
      sample: { residue: "olive_pomace", label: "Pomace, October press", state: "fresh", collectedAt: now - 20 * DAY, region: "Béjaïa", grams: 1000 },
      sampleNo: `S-${new Date(now).getFullYear()}-0007`,
      receivedAt: now - 16 * DAY,
      dueAt: now - 2 * DAY,
      condition: "Chilled, sealed bag",
      paid: true,
      createdAt: now - 18 * DAY,
    },
    {
      ...base,
      requestId: "gq4" as Id<"labRequests">,
      status: "released",
      overdue: false,
      clientName: "Ferme Saïd",
      clientPhone: "+213 555 12 34 56",
      clientRegion: "Sétif",
      analyses: [{ analysis: "pectin", priceDzd: 4000, days: 7 }],
      totalDzd: 4000,
      sample: { residue: "citrus_peels", label: "Lemon peel", state: "dried", collectedAt: now - 15 * DAY, region: "Sétif", grams: 350 },
      sampleNo: `S-${new Date(now).getFullYear()}-0005`,
      receivedAt: now - 12 * DAY,
      dueAt: now - 2 * DAY,
      reports: [{ code: "PREVIEW00000", version: 1, reportNo: `S-${new Date(now).getFullYear()}-0005-R1`, releasedAt: now - 3 * DAY, amendReason: undefined }],
      paid: true,
      createdAt: now - 14 * DAY,
    },
  ];
}

/** The lab's requests, newest first; `undefined` while loading. */
export function useLabQueue(): LabQueueRow[] | undefined {
  const { workspace, guest } = useDashboard();
  const [now] = useState(() => Date.now());
  const [samples] = useState(() => sampleQueue(now));
  const live = useQuery(api.labwork.labQueue, guest ? "skip" : { companyId: workspace.companyId });
  return guest ? samples : live;
}
