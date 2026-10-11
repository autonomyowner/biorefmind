"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Mail, MapPin, UserRound } from "lucide-react";
import { toast } from "sonner";

import {
  AREA,
  CategoryBadge,
  Chips,
  EMPTY,
  fmtTime,
  LotStatusPill,
  PhoneActions,
  QUIET,
  RESIDUE_EN,
  ROW,
  SECTION,
  TelLink,
} from "@/components/admin/admin-shared";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/backend";
import { residueLabel } from "@/lib/catalog-labels";
import { errorMessage } from "@/lib/errors";
import { formatDzd, formatKg } from "@/lib/pricing";
import type { AdminInquiry, InquiryStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<InquiryStatus, string> = { new: "New", contacted: "Contacted", closed: "Closed" };
const STATUS_TONE: Record<InquiryStatus, string> = {
  new: "bg-azure text-white",
  contacted: "bg-[#efe9ff] text-violet",
  closed: "bg-foreground/10 text-muted-foreground",
};

/** Interest requests on BiorefMind lots: who wants what, the farmer behind it, and the follow-up. */
export function InquiriesSection() {
  const [status, setStatus] = useState<InquiryStatus | null>(null);
  const rows = useQuery(api.inquiries.list, status ? { status } : {});

  return (
    <section id="interest" className={SECTION}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-semibold">
            Interest requests {rows ? <span className="text-muted-foreground tabular-nums">· {rows.length}</span> : null}
          </h2>
          <p className="mt-1 max-w-[620px] text-[14px] text-muted-foreground">
            People who tapped “I&apos;m interested” on a BiorefMind lot. Call them back, then call the farmer to arrange the sale.
          </p>
        </div>
      </div>
      <div className="mt-4">
        <Chips
          value={status}
          onChange={setStatus}
          options={[
            { value: null, label: "All" },
            { value: "new", label: "New" },
            { value: "contacted", label: "Contacted" },
            { value: "closed", label: "Closed" },
          ]}
        />
      </div>
      {!rows ? (
        <Spinner className="flex py-8" />
      ) : rows.length === 0 ? (
        <p className={EMPTY}>
          {status
            ? `No ${STATUS_LABEL[status].toLowerCase()} interest requests.`
            : "No interest requests yet. They appear here when someone taps “I'm interested” on a BiorefMind lot."}
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 xl:grid-cols-[repeat(2,minmax(0,1fr))]">
          {rows.map((r) => (
            <InquiryCard key={r.inquiryId} row={r} />
          ))}
        </ul>
      )}
    </section>
  );
}

function InquiryCard({ row }: { row: AdminInquiry }) {
  const setStatus = useMutation(api.inquiries.setStatus);
  const [note, setNote] = useState(row.adminNote ?? "");
  const [busy, setBusy] = useState<InquiryStatus | "note" | null>(null);
  const lot = row.lot;
  const noteChanged = note.trim() !== (row.adminNote ?? "");

  async function save(next: InquiryStatus, which: InquiryStatus | "note" = next) {
    setBusy(which);
    try {
      await setStatus({ inquiryId: row.inquiryId, status: next, adminNote: note });
      toast.success(which === "note" ? "Note saved." : `Marked ${STATUS_LABEL[next].toLowerCase()}.`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <li className={ROW}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold">{row.name}</p>
          <p className="truncate text-[13px] text-muted-foreground">
            {row.company ? `${row.company} · ` : ""}
            {fmtTime(row.createdAt)}
          </p>
        </div>
        <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-medium", STATUS_TONE[row.status])}>
          {STATUS_LABEL[row.status]}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <PhoneActions phone={row.phone} />
        {row.email ? (
          <a href={`mailto:${row.email}`} className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-[#e6edff] px-3 py-1.5 text-[13px] font-medium text-azure">
            <Mail className="size-3.5 shrink-0" /> <span className="truncate">{row.email}</span>
          </a>
        ) : null}
      </div>

      {row.quantityKg ? (
        <p className="mt-3 text-[14px]">
          Wants <span className="font-semibold tabular-nums">{formatKg(row.quantityKg, "en")}</span>
        </p>
      ) : null}
      {row.message ? <p className="mt-2 whitespace-pre-wrap break-words text-[14px]">{row.message}</p> : null}
      {row.signedInAs ? <p className="mt-2 truncate text-[13px] text-muted-foreground">Signed in as {row.signedInAs}</p> : null}

      {lot ? (
        <div className="mt-3 rounded-xl border border-foreground/10 bg-white/60 p-3 text-[13px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{residueLabel(RESIDUE_EN, lot)}</span>
            <CategoryBadge category={lot.category} />
            <LotStatusPill status={lot.status} />
          </div>
          <p className="mt-1 text-muted-foreground">
            Partner farm #{lot.partnerNo ?? "?"} · {formatDzd(lot.priceDzdPerKg, "en")}/kg · {formatKg(lot.remainingKg, "en")} left
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-muted-foreground">
            <MapPin className="size-3 shrink-0" /> {lot.region}
          </p>
          <div className="mt-2 border-t border-foreground/10 pt-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Farmer (private)</p>
            <p className="mt-0.5 flex items-center gap-1 font-medium">
              <UserRound className="size-3.5 shrink-0" /> {lot.farmerName || "—"}
            </p>
            <TelLink phone={lot.farmerPhone} />
          </div>
        </div>
      ) : (
        <p className="mt-3 text-[13px] text-muted-foreground">The lot no longer exists.</p>
      )}

      <label className="mt-3 block text-[13px] font-medium">
        Private note
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="Called, wants delivery to Sétif…"
          className={cn(AREA, "mt-1.5")}
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        {row.status !== "contacted" ? (
          <button type="button" disabled={busy !== null} onClick={() => save("contacted")} className={QUIET}>
            {busy === "contacted" ? <Spinner size="sm" label={null} /> : null}
            Mark contacted
          </button>
        ) : null}
        {row.status !== "closed" ? (
          <button type="button" disabled={busy !== null} onClick={() => save("closed")} className={QUIET}>
            {busy === "closed" ? <Spinner size="sm" label={null} /> : null}
            Close
          </button>
        ) : null}
        {row.status !== "new" ? (
          <button type="button" disabled={busy !== null} onClick={() => save("new")} className={QUIET}>
            {busy === "new" ? <Spinner size="sm" label={null} /> : null}
            Back to new
          </button>
        ) : null}
        {noteChanged ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => save(row.status, "note")}
            className="btn-navy inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-4 text-[13px] font-semibold disabled:opacity-80"
          >
            {busy === "note" ? <Spinner size="sm" label={null} /> : null}
            Save note
          </button>
        ) : null}
      </div>
    </li>
  );
}
