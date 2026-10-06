"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { Check, ExternalLink, FilePenLine, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { fill } from "@/components/dashboard/messages";
import { labMessages } from "@/components/dashboard/lab/lab-messages";
import { defaultDue, fromDateInput, toDateInput } from "@/components/dashboard/lab/lab-logic";
import { ResultsFormCard } from "@/components/dashboard/lab/results-form";
import { SampleLabel } from "@/components/dashboard/lab/sample-label";
import { AREA, Chip, Field, FIELD, PRIMARY, QUIET, StatusChip, useFail, useFormat, useGuestBlock, useLabRole } from "@/components/dashboard/lab/ui";
import { useMessages } from "@/i18n/provider";
import { api } from "@/lib/backend";
import { catalogLabels, labelOf, residueLabel } from "@/lib/catalog-labels";
import type { LabQueueRow } from "@/lib/types";
import { cn } from "@/lib/utils";

/** The request detail as a dialog; keeps showing the last request while it animates closed. */
export function RequestDialog({ row, onClose }: { row: LabQueueRow | null; onClose: () => void }) {
  const [shown, setShown] = useState<LabQueueRow | null>(row);
  if (row && row !== shown) setShown(row);
  return (
    <Dialog open={row !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-[28px] border border-white/80 bg-[#eef4fa] p-0 ring-0 sm:max-w-[760px]">
        {shown ? <RequestDetail key={shown.requestId} row={shown} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-white bg-white/70 p-4", className)}>
      <h3 className="mb-2.5 text-[13px] font-semibold tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-1 text-[14px]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-end font-medium">{children}</dd>
    </div>
  );
}

function RequestDetail({ row }: { row: LabQueueRow }) {
  const t = useMessages(labMessages);
  const labels = useMessages(catalogLabels);
  const f = useFormat();
  const s = row.sample;
  const residue = residueLabel(labels.residues, s);

  return (
    <div className="p-5 sm:p-7">
      <div className="pe-8">
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip status={row.status} />
          {row.overdue ? <Chip tone="red">{t.queue.overdue}</Chip> : null}
          {row.sampleNo ? (
            <span dir="ltr" className="text-[13px] font-semibold text-azure">
              {row.sampleNo}
            </span>
          ) : null}
        </div>
        <DialogTitle className="mt-2 text-[22px] font-semibold tracking-[-0.02em]">{s.label}</DialogTitle>
        <DialogDescription className="mt-1 text-[14px]">
          {residue} · {row.clientName}
        </DialogDescription>
      </div>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
        <Section title={t.detail.client}>
          <p className="text-[16px] font-semibold">{row.clientName}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[13px] text-muted-foreground">
            {t.kinds[row.clientKind]}
            {row.clientRegion ? (
              <>
                {" · "}
                <MapPin className="size-3.5" /> {row.clientRegion}
              </>
            ) : null}
          </p>
          {row.clientPhone ? (
            <a
              href={`tel:${row.clientPhone.replace(/[^\d+]/g, "")}`}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#e6edff] px-3 py-1.5 text-[13px] font-medium text-azure"
            >
              <Phone className="size-3.5" /> {t.detail.call} <bdi dir="ltr">{row.clientPhone}</bdi>
            </a>
          ) : row.clientKind === "farm" ? (
            <p className="mt-3 rounded-xl bg-[#eef2ff] px-3 py-2 text-[13px] leading-relaxed text-[#24366a]">{t.detail.farmerContact}</p>
          ) : null}
        </Section>

        <Section title={t.detail.sample}>
          <dl>
            <Row label={t.detail.label}>{s.label}</Row>
            <Row label={t.detail.state}>{t.detail.states[s.state]}</Row>
            <Row label={t.detail.collected}>{f.date(s.collectedAt)}</Row>
            <Row label={t.detail.region}>{s.region}</Row>
            <Row label={t.detail.grams}>
              <bdi dir="ltr">{s.grams.toLocaleString("en-US")} g</bdi>
            </Row>
            {s.packaging ? <Row label={t.detail.packaging}>{s.packaging}</Row> : null}
            <Row label={t.detail.delivery}>{t.detail.deliveries[row.delivery]}</Row>
            {row.tracking ? (
              <Row label={t.detail.tracking}>
                <bdi dir="ltr">{row.tracking}</bdi>
              </Row>
            ) : null}
          </dl>
          {s.notes ? <p className="mt-2 rounded-xl bg-[#eef2ff] px-3 py-2 text-[14px] leading-relaxed">{s.notes}</p> : null}
        </Section>

        <Section title={t.detail.analyses}>
          <ul className="space-y-1.5">
            {row.analyses.map((a) => (
              <li key={a.analysis} className="flex items-baseline justify-between gap-3 text-[14px]">
                <span className="min-w-0">
                  <span className="font-medium">{labelOf(labels.analyses, a.analysis)}</span>
                  <span className="block text-[12px] text-muted-foreground">{fill(t.detail.days, { days: a.days })}</span>
                </span>
                <bdi dir="ltr" className="shrink-0">
                  {f.dzd(a.priceDzd)}
                </bdi>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 flex items-baseline justify-between gap-3 border-t border-foreground/10 pt-2 text-[15px] font-semibold">
            {t.detail.total} <bdi dir="ltr">{f.dzd(row.totalDzd)}</bdi>
          </p>
          <PaidTick row={row} />
        </Section>

        {row.receivedAt || row.reason || row.status === "expired" || row.status === "lab_unavailable" ? (
          <Section title={row.receivedAt ? t.queue.tabs.inLab : t.status[row.status]}>
            <dl>
              {row.sampleNo ? (
                <Row label={t.detail.sampleNo}>
                  <bdi dir="ltr">{row.sampleNo}</bdi>
                </Row>
              ) : null}
              {row.receivedAt ? <Row label={t.detail.received}>{f.date(row.receivedAt)}</Row> : null}
              {row.dueAt && row.status === "received" ? <Row label={t.detail.due}>{f.date(row.dueAt)}</Row> : null}
            </dl>
            {row.condition ? (
              <p className="mt-2 text-[14px]">
                <span className="text-muted-foreground">{t.detail.condition}: </span>
                {row.condition}
              </p>
            ) : null}
            {row.status === "cancelled" ? (
              <p className="mt-2 text-[14px] text-muted-foreground">{row.cancelledBy === "client" ? t.detail.cancelledByClient : t.detail.cancelledByLab}</p>
            ) : null}
            {row.reason ? (
              <p className="mt-2 text-[14px]">
                <span className="text-muted-foreground">{t.detail.reason}: </span>
                {row.reason}
              </p>
            ) : null}
            {row.status === "expired" ? <p className="mt-2 text-[14px] text-muted-foreground">{t.detail.expiredNote}</p> : null}
            {row.status === "lab_unavailable" ? <p className="mt-2 text-[14px] text-muted-foreground">{t.detail.unavailableNote}</p> : null}
          </Section>
        ) : null}
      </div>

      <div className="mt-4">
        <Actions row={row} />
      </div>
    </div>
  );
}

/** The lab's own bookkeeping: has the client paid? Owners and managers only. */
function PaidTick({ row }: { row: LabQueueRow }) {
  const t = useMessages(labMessages);
  const fail = useFail();
  const blocked = useGuestBlock();
  const { canManage } = useLabRole();
  const setPaid = useMutation(api.labwork.setPaid);
  const [busy, setBusy] = useState(false);

  async function toggle(paid: boolean) {
    if (blocked()) return;
    setBusy(true);
    try {
      await setPaid({ requestId: row.requestId, paid });
      toast.success(t.detail.paidSaved);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-[#eef2ff] px-3 py-2.5 text-[14px] font-medium">
      {t.detail.paid}
      <Switch checked={row.paid} disabled={!canManage || busy} onCheckedChange={(v) => void toggle(v)} />
    </label>
  );
}

/** A button that opens a reason box, then sends the reason. */
function ReasonAction({
  button,
  prompt,
  placeholder,
  confirm,
  onSubmit,
}: {
  button: string;
  prompt: string;
  placeholder: string;
  confirm: string;
  onSubmit: (reason: string) => Promise<boolean>;
}) {
  const t = useMessages(labMessages);
  const blocked = useGuestBlock();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => (blocked() ? undefined : setOpen(true))} className={QUIET}>
        {button}
      </button>
    );
  }
  return (
    <div className="w-full space-y-2.5 rounded-xl bg-[#eef2ff] p-3">
      <Field label={prompt}>
        <textarea rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={placeholder} className={AREA} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !reason.trim()}
          onClick={async () => {
            setBusy(true);
            const ok = await onSubmit(reason);
            setBusy(false);
            if (ok) setOpen(false);
          }}
          className={cn(PRIMARY, "h-9 px-4")}
        >
          {busy ? <Spinner size="sm" label={null} /> : confirm}
        </button>
        <button type="button" disabled={busy} onClick={() => setOpen(false)} className={cn(QUIET, "h-9")}>
          {t.actions.back}
        </button>
      </div>
    </div>
  );
}

/** What can be done with the request in its current state. */
function Actions({ row }: { row: LabQueueRow }) {
  const t = useMessages(labMessages);
  const fail = useFail();
  const blocked = useGuestBlock();
  const { canManage } = useLabRole();
  const respond = useMutation(api.labwork.respond);
  const reject = useMutation(api.labwork.reject);
  const [busy, setBusy] = useState(false);
  const [amending, setAmending] = useState(false);
  // An accepted request whose 30-day sample wait ran out: the sample may still arrive, so receipt stays open.
  const lateAccepted = row.status === "expired" && row.respondedAt !== undefined;

  const send = async (fn: () => Promise<unknown>, done: string) => {
    try {
      await fn();
      toast.success(done);
      return true;
    } catch (err) {
      fail(err);
      return false;
    }
  };

  const managersOnly = !canManage ? <p className="text-[13px] text-muted-foreground">{t.detail.rolesNote}</p> : null;

  if (row.status === "requested") {
    return (
      <div className="space-y-3">
        {canManage ? (
          <div className="flex flex-wrap items-start gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                if (blocked()) return;
                setBusy(true);
                await send(() => respond({ requestId: row.requestId, accept: true }), t.actions.accepted);
                setBusy(false);
              }}
              className={PRIMARY}
            >
              {busy ? <Spinner size="sm" label={null} /> : <Check className="size-4" strokeWidth={2.5} />} {t.actions.accept}
            </button>
            <ReasonAction
              button={t.actions.decline}
              prompt={t.actions.declineReason}
              placeholder={t.actions.declinePlaceholder}
              confirm={t.actions.decline}
              onSubmit={(reason) => send(() => respond({ requestId: row.requestId, accept: false, reason }), t.actions.declined)}
            />
          </div>
        ) : null}
        {managersOnly}
      </div>
    );
  }

  if (row.status === "accepted" || lateAccepted) {
    return (
      <div className="space-y-3">
        {lateAccepted ? <p className="text-[13px] text-muted-foreground">{t.actions.lateSample}</p> : null}
        <ReceiveForm row={row} />
        {canManage ? (
          <ReasonAction
            button={t.actions.cancel}
            prompt={t.actions.cancelReason}
            placeholder={t.actions.cancelPlaceholder}
            confirm={t.actions.cancel}
            onSubmit={(reason) => send(() => reject({ requestId: row.requestId, reason }), t.actions.cancelled)}
          />
        ) : null}
      </div>
    );
  }

  if (row.status === "received") {
    return (
      <div className="space-y-4">
        <SampleLabel row={row} className="rounded-2xl border border-white bg-white/70 p-4" />
        <div className="rounded-2xl border border-white bg-white/50 p-4">
          <ResultsFormCard row={row} mode="release" onDone={() => {}} />
        </div>
        {canManage ? (
          <ReasonAction
            button={t.actions.unsuitable}
            prompt={t.actions.unsuitableReason}
            placeholder={t.actions.unsuitablePlaceholder}
            confirm={t.actions.unsuitable}
            onSubmit={(reason) => send(() => reject({ requestId: row.requestId, reason }), t.actions.cancelled)}
          />
        ) : null}
      </div>
    );
  }

  if (row.status === "released") {
    return (
      <div className="space-y-4">
        <Certificates row={row} />
        {amending ? (
          <div className="rounded-2xl border border-white bg-white/50 p-4">
            <ResultsFormCard row={row} mode="amend" onDone={() => setAmending(false)} />
          </div>
        ) : canManage ? (
          <button type="button" onClick={() => (blocked() ? undefined : setAmending(true))} className={QUIET}>
            <FilePenLine className="size-4" /> {t.certificates.amend}
          </button>
        ) : null}
      </div>
    );
  }

  return null;
}

function Certificates({ row }: { row: LabQueueRow }) {
  const t = useMessages(labMessages);
  const f = useFormat();
  return (
    <Section title={t.certificates.title}>
      <ul className="space-y-2">
        {row.reports.map((r, i) => (
          <li key={r.code} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/80 px-3 py-2.5">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-[14px] font-semibold">
                <bdi dir="ltr">{r.reportNo}</bdi>
                <Chip tone={i === 0 ? "green" : "grey"}>{i === 0 ? t.certificates.current : t.certificates.replaced}</Chip>
              </p>
              <p className="text-[12px] text-muted-foreground">
                {fill(t.certificates.version, { v: r.version })} · {f.date(r.releasedAt)}
              </p>
              {r.amendReason ? <p className="mt-0.5 text-[12px] text-muted-foreground">{fill(t.certificates.reason, { reason: r.amendReason })}</p> : null}
            </div>
            <a href={`/verify/${r.code}`} target="_blank" rel="noopener noreferrer" className={cn(i === 0 ? PRIMARY : QUIET, "h-9 px-4 text-[13px]")}>
              {t.certificates.open} <ExternalLink className="size-3.5 rtl:-scale-x-100" />
            </a>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** Mark the sample received: optional condition and a due date (defaults to the backend's formula). */
function ReceiveForm({ row }: { row: LabQueueRow }) {
  const t = useMessages(labMessages);
  const fail = useFail();
  const blocked = useGuestBlock();
  const receive = useMutation(api.labwork.receive);
  const [open, setOpen] = useState(false);
  const [condition, setCondition] = useState("");
  const [defaultDate] = useState(() => toDateInput(defaultDue(Date.now(), row.analyses)));
  const [due, setDue] = useState(defaultDate);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (blocked()) return;
    setBusy(true);
    try {
      // Only an edited date is sent; otherwise the backend works it out from the turnaround.
      const dueAt = due !== defaultDate ? Math.max(fromDateInput(due), Date.now() + 60_000) : undefined;
      await receive({ requestId: row.requestId, condition, dueAt: Number.isNaN(dueAt) ? undefined : dueAt });
      toast.success(t.actions.receivedToast);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => (blocked() ? undefined : setOpen(true))} className={PRIMARY}>
        <Check className="size-4" strokeWidth={2.5} /> {t.actions.receive}
      </button>
    );
  }
  return (
    <div className="space-y-3 rounded-2xl border border-white bg-white/70 p-4">
      <Field label={t.actions.condition}>
        <textarea rows={2} maxLength={500} value={condition} onChange={(e) => setCondition(e.target.value)} placeholder={t.actions.conditionPlaceholder} className={AREA} />
      </Field>
      <Field label={t.actions.dueAt} hint={t.actions.dueHint} className="sm:max-w-[260px]">
        <input type="date" dir="ltr" value={due} onChange={(e) => setDue(e.target.value)} className={FIELD} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={submit} className={PRIMARY}>
          {busy ? <Spinner size="sm" label={null} /> : t.actions.confirmReceive}
        </button>
        <button type="button" disabled={busy} onClick={() => setOpen(false)} className={QUIET}>
          {t.actions.back}
        </button>
      </div>
    </div>
  );
}
