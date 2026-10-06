"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "motion/react";
import {
  CalendarClock,
  CircleAlert,
  CircleCheck,
  Clock,
  ExternalLink,
  FileCheck2,
  Hash,
  Hourglass,
  MapPin,
  Phone,
  Search,
  TestTubes,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useDashboard } from "@/components/dashboard/shell";
import { fill } from "@/components/dashboard/messages";
import { useMyListings } from "@/components/dashboard/market";
import { Panel } from "@/components/dashboard/profile-card";
import { labtestsMessages, type LabtestsMessages } from "@/components/dashboard/labtests/labtests-messages";
import { useMySales } from "@/components/dashboard/labtests/request-dialog";
import { expiredWhy } from "@/components/dashboard/labtests/format";
import { SAMPLE_REQUESTS } from "@/components/dashboard/labtests/samples";
import { CARD, Chip, FIELD, PRIMARY, QUIET, telHref, useFail, useGuestToast, useLabFormat } from "@/components/dashboard/labtests/shared";
import { useLocale, useMessages } from "@/i18n/provider";
import { api } from "@/lib/backend";
import { catalogLabels, labelOf, residueLabel } from "@/lib/catalog-labels";
import { formatKg } from "@/lib/pricing";
import type { LabRequestStatus, MyLabRequest, MyListing, Sale } from "@/lib/types";
import { cn } from "@/lib/utils";

// Design: docs/superpowers/specs/2026-10-06-lab-requests-design.md ("Client side")

/** The farm's or factory's lab requests, newest first (sample requests in the guest preview). */
export function useMyLabRequests(): MyLabRequest[] | undefined {
  const { workspace, guest } = useDashboard();
  const live = useQuery(api.labwork.myRequests, guest ? "skip" : { companyId: workspace.companyId });
  return guest ? SAMPLE_REQUESTS : live;
}

const TONE: Record<LabRequestStatus, Parameters<typeof Chip>[0]["tone"]> = {
  requested: "amber",
  accepted: "blue",
  received: "violet",
  released: "green",
  declined: "red",
  cancelled: "grey",
  expired: "grey",
  lab_unavailable: "grey",
};

const ICON: Record<LabRequestStatus, LucideIcon> = {
  requested: Hourglass,
  accepted: Truck,
  received: TestTubes,
  released: CircleCheck,
  declined: CircleAlert,
  cancelled: CircleAlert,
  expired: Clock,
  lab_unavailable: CircleAlert,
};

/** The plain sentence for a request's status. */
function explain(t: LabtestsMessages, r: MyLabRequest): string {
  const s = t.list.status;
  switch (r.status) {
    case "cancelled":
      return r.cancelledBy === "lab" ? s.cancelledByLab : s.cancelledByYou;
    case "expired":
      return expiredWhy(r.respondedAt) === "noAnswer" ? s.expiredNoAnswer : s.expiredNoSample;
    default:
      return s[r.status];
  }
}

/** "Lab tests": every request the account sent, with status, the lab's contact and actions. */
export function LabTests({ id }: { id?: string }) {
  const t = useMessages(labtestsMessages);
  const requests = useMyLabRequests();
  const listings = useMyListings();
  const sales = useMySales();
  return (
    <Panel id={id} title={t.list.title}>
      {requests === undefined ? (
        <Spinner className="flex py-8" />
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-azure/25 bg-white/40 px-6 py-9 text-center">
          <span className="orb flex size-11 items-center justify-center rounded-full">
            <TestTubes className="size-5" strokeWidth={1.8} />
          </span>
          <p className="mt-3 text-[17px] font-semibold">{t.list.emptyTitle}</p>
          <p className="mt-1.5 max-w-[420px] text-[14px] leading-relaxed text-muted-foreground">{t.list.emptyBody}</p>
          <a href="#labs" className={cn(QUIET, "mt-4 h-9 px-4 text-[13px]")}>
            <Search className="size-4" /> {t.list.toDirectory}
          </a>
        </div>
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => (
            <RequestCard
              key={r.requestId}
              request={r}
              listing={listings?.find((l) => l.listingId === r.listingId)}
              sale={sales?.find((s) => s.saleId === r.saleId)}
            />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function RequestCard({ request: r, listing, sale }: { request: MyLabRequest; listing?: MyListing; sale?: Sale }) {
  const { workspace, guest } = useDashboard();
  const t = useMessages(labtestsMessages);
  const labels = useMessages(catalogLabels);
  const locale = useLocale();
  const f = useLabFormat();
  const fail = useFail();
  const guestToast = useGuestToast();
  const cancel = useMutation(api.labwork.cancel);
  const attach = useMutation(api.market.attachLabReport);
  const detach = useMutation(api.market.detachLabReport);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const canAct = workspace.role !== "inspector";
  const open = r.status === "requested" || r.status === "accepted";
  const Icon = ICON[r.status];

  /** Runs a client action; the guest preview only invites to sign up. */
  async function run(action: () => Promise<unknown>, done: string) {
    if (guest) {
      guestToast();
      return;
    }
    setBusy(true);
    try {
      await action();
      toast.success(done);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  const lot = listing
    ? fill(t.list.lotFarm, { residue: residueLabel(labels.residues, listing), kg: formatKg(listing.quantityKg, locale) })
    : sale
      ? fill(t.list.lotFactory, { residue: residueLabel(labels.residues, sale), kg: formatKg(sale.quantityKg, locale), name: sale.otherName })
      : r.listingId
        ? t.list.lotUnknown
        : t.list.noLot;
  // Only a farm publishes results, only on its own lot, while that lot is open (or to take them off).
  const lotActions = workspace.kind === "farm" && r.status === "released" && r.listingId && (r.attached || listing?.status === "open");

  return (
    <li className={CARD}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold">{r.labName}</p>
          <p className="truncate text-[13px] text-muted-foreground">
            <bdi>{r.sample.label}</bdi> · {residueLabel(labels.residues, r.sample)}
          </p>
        </div>
        <Chip tone={TONE[r.status]}>{t.list.chip[r.status]}</Chip>
      </div>

      {/* What is happening, in plain words */}
      <div className="mt-3 rounded-xl bg-white/70 px-3 py-2.5 text-[14px]">
        <p className="flex items-start gap-2 font-medium">
          <Icon className="mt-0.5 size-4 shrink-0 text-azure" /> {explain(t, r)}
        </p>
        {r.status === "received" ? (
          <div className="mt-1 space-y-0.5 ps-6 text-[13px] text-muted-foreground">
            {r.dueAt ? (
              <p className="flex items-center gap-1.5">
                <CalendarClock className="size-3.5 shrink-0" /> {fill(t.list.dueAround, { date: f.date(r.dueAt) })}
              </p>
            ) : null}
            {r.sampleNo ? (
              <p className="flex items-center gap-1.5">
                <Hash className="size-3.5 shrink-0" /> {t.list.sampleNo}: <bdi dir="ltr" className="font-medium text-foreground">{r.sampleNo}</bdi>
              </p>
            ) : null}
          </div>
        ) : null}
        {(r.status === "declined" || r.status === "cancelled") && r.reason ? (
          <p className="mt-1 ps-6 text-[13px] text-muted-foreground">{fill(t.list.reason, { reason: r.reason })}</p>
        ) : null}
      </div>

      {/* Analyses and total */}
      <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[13px]">
        <dt className="text-muted-foreground">{t.list.analyses}</dt>
        <dd className="min-w-0">{r.analyses.map((a) => labelOf(labels.analyses, a.analysis)).join(" · ")}</dd>
        <dt className="text-muted-foreground">{t.list.total}</dt>
        <dd className="font-semibold">
          <bdi>{f.dzd(r.totalDzd)}</bdi>
        </dd>
        <dt className="text-muted-foreground">{t.list.lot}</dt>
        <dd className="min-w-0">{lot}</dd>
        {r.sampleNo && r.status !== "received" ? (
          <>
            <dt className="text-muted-foreground">{t.list.sampleNo}</dt>
            <dd>
              <bdi dir="ltr">{r.sampleNo}</bdi>
            </dd>
          </>
        ) : null}
        <dt className="text-muted-foreground">
          <Clock className="inline size-3.5" />
        </dt>
        <dd className="text-muted-foreground">{fill(t.list.sent, { date: f.date(r.createdAt) })}</dd>
      </dl>

      {/* Certificates, latest first */}
      {r.reports.length > 0 ? (
        <div className="mt-3">
          <p className="mb-1.5 text-[13px] font-medium text-muted-foreground">{t.list.certificates}</p>
          <ul className="flex flex-wrap gap-2">
            {r.reports.map((rep, i) => (
              <li key={rep.code}>
                <a
                  href={`/verify/${rep.code}`}
                  target="_blank"
                  rel="noopener"
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
                    i === 0 ? "bg-[#e6edff] text-azure hover:bg-[#d9e3ff]" : "bg-foreground/[0.05] text-muted-foreground hover:bg-foreground/[0.08]",
                  )}
                >
                  <FileCheck2 className="size-3.5" />
                  {t.list.certificate}
                  <bdi dir="ltr">{rep.reportNo}</bdi>
                  {i > 0 ? <span className="text-[12px]">({t.list.replaced})</span> : null}
                  <ExternalLink className="size-3 rtl:-scale-x-100" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Show the results on the farm's lot */}
      {lotActions && canAct ? (
        <div className="mt-3 rounded-xl border border-violet/15 bg-[#f6f3ff] px-3 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {r.attached ? <Chip tone="violet">{t.list.onLot}</Chip> : null}
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                r.attached
                  ? run(() => detach({ listingId: r.listingId! }), t.list.detached)
                  : run(() => attach({ listingId: r.listingId!, requestId: r.requestId }), t.list.attached)
              }
              className={cn(r.attached ? QUIET : PRIMARY, "h-9 px-4 text-[13px]")}
            >
              {busy ? <Spinner size="sm" label={null} /> : r.attached ? t.list.removeFromLot : t.list.showOnLot}
            </button>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{t.list.attachNote}</p>
        </div>
      ) : null}

      {/* The lab's contact */}
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3 border-t border-foreground/[0.07] pt-3">
        <div className="min-w-0 text-[13px] text-muted-foreground">
          <p className="font-medium text-foreground">{t.list.contact}</p>
          {r.labAddress ? (
            <p className="mt-0.5 flex items-start gap-1.5">
              <MapPin className="mt-0.5 size-3.5 shrink-0" /> <span className="min-w-0 break-words">{r.labAddress}</span>
            </p>
          ) : null}
          {r.labHours ? (
            <p className="mt-0.5 flex items-start gap-1.5">
              <Clock className="mt-0.5 size-3.5 shrink-0" /> <span className="min-w-0 break-words">{r.labHours}</span>
            </p>
          ) : null}
          {r.labPhone ? (
            <p dir="ltr" className="mt-0.5 rtl:text-end">
              {r.labPhone}
            </p>
          ) : null}
        </div>
        {r.labPhone ? (
          <a href={telHref(r.labPhone)} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#e6edff] px-3 py-1.5 text-[13px] font-medium text-azure">
            <Phone className="size-3.5" /> {t.list.call}
          </a>
        ) : null}
      </div>

      {/* Delivery and the client's actions while the request is open */}
      {open ? (
        <div className="mt-3 border-t border-foreground/[0.07] pt-3">
          <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
            {r.delivery === "courier" ? <Truck className="size-3.5" /> : <MapPin className="size-3.5" />}
            {r.delivery === "courier" ? t.list.courier : t.list.dropoff}
          </p>
          {r.delivery === "courier" && canAct ? <TrackingEditor request={r} /> : null}
          {r.delivery === "courier" && !canAct && r.tracking ? <TrackingLine tracking={r.tracking} /> : null}
          {canAct ? (
            confirming ? (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-xl bg-[#eef2ff] p-3">
                <p className="text-[14px] leading-relaxed">{t.list.cancelConfirm}</p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(() => cancel({ requestId: r.requestId }), t.list.cancelled)}
                    className={cn(PRIMARY, "h-9 px-4")}
                  >
                    {busy ? <Spinner size="sm" label={null} /> : t.list.cancel}
                  </button>
                  <button type="button" disabled={busy} onClick={() => setConfirming(false)} className={cn(QUIET, "h-9")}>
                    {t.list.keep}
                  </button>
                </div>
              </motion.div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="mt-3 text-[13px] font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {t.list.cancel}
              </button>
            )
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function TrackingLine({ tracking }: { tracking: string }) {
  const t = useMessages(labtestsMessages);
  return (
    <p className="mt-1 text-[13px]">
      <span className="text-muted-foreground">{t.list.tracking}: </span>
      <bdi dir="ltr" className="font-medium">
        {tracking}
      </bdi>
    </p>
  );
}

/** Add or change the courier tracking number. */
function TrackingEditor({ request: r }: { request: MyLabRequest }) {
  const { guest } = useDashboard();
  const t = useMessages(labtestsMessages);
  const fail = useFail();
  const guestToast = useGuestToast();
  const save = useMutation(api.labwork.setTracking);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(r.tracking ?? "");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (guest) {
      guestToast();
      return;
    }
    setBusy(true);
    try {
      await save({ requestId: r.requestId, tracking: value });
      toast.success(t.list.trackingSaved);
      setEditing(false);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {r.tracking ? <TrackingLine tracking={r.tracking} /> : null}
        <button
          type="button"
          onClick={() => {
            setValue(r.tracking ?? "");
            setEditing(true);
          }}
          className="mt-1 text-[13px] font-medium text-azure underline-offset-4 hover:underline"
        >
          {r.tracking ? t.list.editTracking : t.list.addTracking}
        </button>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="mt-2 flex flex-wrap items-end gap-2">
      <label className="min-w-0 flex-1 basis-[180px] text-[13px] font-medium">
        {t.list.tracking}
        <Input dir="ltr" value={value} onChange={(e) => setValue(e.target.value)} maxLength={60} autoFocus className={cn(FIELD, "mt-1 h-10 rtl:text-end")} />
      </label>
      <button type="submit" disabled={busy} className={cn(PRIMARY, "h-10 px-4")}>
        {busy ? <Spinner size="sm" label={null} /> : t.list.saveTracking}
      </button>
      <button type="button" disabled={busy} onClick={() => setEditing(false)} className={cn(QUIET, "h-10")}>
        {t.list.close}
      </button>
    </form>
  );
}
