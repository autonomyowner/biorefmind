"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Plus, ScanText, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Spinner } from "@/components/ui/spinner";
import { useDashboard } from "@/components/dashboard/shell";
import { labMessages } from "@/components/dashboard/lab/lab-messages";
import { ReadSheet } from "@/components/dashboard/lab/read-sheet";
import { fill } from "@/components/dashboard/messages";
import {
  applyReading,
  isPanel,
  makeForm,
  newLine,
  toResults,
  type ItemState,
  type LineState,
  type QualifierChoice,
  type ResultsForm,
} from "@/components/dashboard/lab/lab-logic";
import { AREA, Confirm, Field, FIELD, PRIMARY, QUIET, useFail, useGuestBlock, useLabRole } from "@/components/dashboard/lab/ui";
import { useLocale, useMessages } from "@/i18n/provider";
import { api } from "@/lib/backend";
import { ANALYSIS_METHODS, ANALYSIS_UNITS, catalogLabels, labelOf } from "@/lib/catalog-labels";
import type { LabQueueRow, LabReading, LabResults } from "@/lib/types";
import { cn } from "@/lib/utils";

type Mode = "release" | "amend";

/** A field the results reader filled, until the analyst edits it. */
const AI_FILLED = "border-violet/60 bg-violet/[0.07] ring-2 ring-violet/15";

/**
 * Entering results for a sample in the lab. "release" works from the saved draft; "amend" starts from the
 * current certificate's results (read through its public verify code) and needs a reason.
 */
export function ResultsFormCard({ row, mode, onDone }: { row: LabQueueRow; mode: Mode; onDone: () => void }) {
  const { guest } = useDashboard();
  const t = useMessages(labMessages);
  const code = mode === "amend" ? row.reports[0]?.code : undefined;
  const cert = useQuery(api.labwork.certificate, code && !guest ? { code } : "skip");

  if (mode === "amend" && code && !guest && cert === undefined) {
    return (
      <p className="flex items-center gap-2 py-6 text-[14px] text-muted-foreground">
        <Spinner size="sm" label={null} /> {t.results.loading}
      </p>
    );
  }
  const from: LabResults | undefined = mode === "amend" ? (cert?.results ?? undefined) : (row.draft ?? undefined);
  return <FormBody key={`${row.requestId}-${mode}`} row={row} mode={mode} from={from} onDone={onDone} />;
}

const QUALIFIERS: { value: QualifierChoice; key: "none" | "lt" | "gt" | "nd" }[] = [
  { value: "", key: "none" },
  { value: "<", key: "lt" },
  { value: ">", key: "gt" },
  { value: "nd", key: "nd" },
];

function QualifierSelect({ value, onChange, label }: { value: QualifierChoice; onChange: (v: QualifierChoice) => void; label: string }) {
  const t = useMessages(labMessages);
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value as QualifierChoice)} className={cn(FIELD, "px-2.5")}>
      {QUALIFIERS.map((q) => (
        <option key={q.key} value={q.value}>
          {t.results.qualifiers[q.key]}
        </option>
      ))}
    </select>
  );
}

function FormBody({ row, mode, from, onDone }: { row: LabQueueRow; mode: Mode; from?: LabResults; onDone: () => void }) {
  const t = useMessages(labMessages);
  const labels = useMessages(catalogLabels);
  const fail = useFail();
  const blocked = useGuestBlock();
  const { canManage } = useLabRole();
  const saveDraft = useMutation(api.labwork.saveDraft);
  const release = useMutation(api.labwork.release);
  const amend = useMutation(api.labwork.amend);

  const analyses = row.analyses.map((a) => a.analysis);
  const [form, setForm] = useState<ResultsForm>(() =>
    makeForm({ analyses, methods: ANALYSIS_METHODS, receivedAt: row.receivedAt ?? Date.now(), now: Date.now(), from }),
  );
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<"draft" | "release" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const locale = useLocale();
  const [aiFilled, setAiFilled] = useState<ReadonlySet<string>>(new Set());
  const [aiRead, setAiRead] = useState<{ count: number; notes: LabReading["notes"] } | null>(null);
  const seen = (key: string) =>
    setAiFilled((s) => {
      if (!s.has(key)) return s;
      const next = new Set(s);
      next.delete(key);
      return next;
    });
  const ai = (key: string) => (aiFilled.has(key) ? AI_FILLED : undefined);

  function onRead(reading: LabReading) {
    const { form: next, filled } = applyReading(form, reading);
    setForm(next);
    setAiFilled(new Set(filled));
    setAiRead({ count: filled.filter((k) => k.startsWith("item:") || k.startsWith("line:")).length, notes: reading.notes });
  }

  const setItem = (a: string, patch: Partial<ItemState>) => {
    seen(`item:${a}`);
    setForm((f) => ({ ...f, items: { ...f.items, [a]: { ...f.items[a], ...patch } } }));
  };
  const setPanel = (a: string, fn: (p: ResultsForm["panels"][string]) => ResultsForm["panels"][string]) =>
    setForm((f) => ({ ...f, panels: { ...f.panels, [a]: fn(f.panels[a]) } }));
  const setLine = (a: string, key: string, patch: Partial<LineState>) => {
    seen(`line:${key}`);
    setPanel(a, (p) => ({ ...p, lines: p.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)) }));
  };

  async function onDraft() {
    if (blocked()) return;
    setBusy("draft");
    try {
      await saveDraft({ requestId: row.requestId, results: toResults(form, analyses) });
      toast.success(t.results.draftSaved);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  }

  async function onRelease() {
    if (blocked()) return;
    setBusy("release");
    try {
      const results = toResults(form, analyses);
      if (mode === "amend") {
        await amend({ requestId: row.requestId, results, reason });
        toast.success(t.results.amended);
      } else {
        await release({ requestId: row.requestId, results });
        toast.success(t.results.released);
      }
      onDone();
    } catch (err) {
      fail(err);
      setConfirming(false);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-[16px] font-semibold">{mode === "amend" ? t.results.amendTitle : t.results.title}</p>

      {mode === "release" ? <ReadSheet requestId={row.requestId} onRead={onRead} /> : null}
      {aiRead ? (
        <div role="status" className="rounded-2xl border border-violet/20 bg-white/80 p-3.5 text-[13px] leading-relaxed text-[#2e2a6b]">
          <p className="flex items-start gap-2 font-medium">
            <ScanText className="mt-0.5 size-4 shrink-0 text-violet" />
            {aiRead.count > 0 ? fill(t.reader.done, { n: aiRead.count }) : t.reader.none}
          </p>
          {aiRead.notes.length > 0 ? (
            <>
              <p className="mt-2 ps-6 font-semibold">{t.reader.notes}</p>
              <ul className="mt-1 list-disc space-y-0.5 ps-10">
                {aiRead.notes.map((n, i) => (
                  <li key={i}>{n[locale]}</li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}

      {analyses.map((a) =>
        isPanel(a) ? (
          <PanelBlock
            key={a}
            title={labelOf(labels.analyses, a)}
            panel={form.panels[a]}
            onMethod={(method) => setPanel(a, (p) => ({ ...p, method }))}
            onLine={(key, patch) => setLine(a, key, patch)}
            onAdd={() => setPanel(a, (p) => ({ ...p, lines: [...p.lines, newLine()] }))}
            onRemove={(key) => setPanel(a, (p) => ({ ...p, lines: p.lines.filter((l) => l.key !== key) }))}
            aiFilled={aiFilled}
          />
        ) : (
          <fieldset key={a} className="min-w-0 rounded-2xl border border-white bg-white/60 p-3.5 sm:p-4">
            <legend className="sr-only">{labelOf(labels.analyses, a)}</legend>
            <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[15px] font-semibold">{labelOf(labels.analyses, a)}</p>
              <span dir="ltr" className="text-[13px] text-muted-foreground">
                {ANALYSIS_UNITS[a]}
              </span>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2.5 sm:grid-cols-[8.5rem_minmax(0,1fr)_minmax(0,1fr)]">
              <Field label={t.results.qualifier}>
                <QualifierSelect label={t.results.qualifier} value={form.items[a].qualifier} onChange={(qualifier) => setItem(a, { qualifier })} />
              </Field>
              <Field label={t.results.value} hint={a === "mold" ? t.results.moldHint : undefined}>
                <input
                  inputMode="decimal"
                  dir="ltr"
                  value={form.items[a].value}
                  onChange={(e) => setItem(a, { value: e.target.value })}
                  placeholder={form.items[a].qualifier === "nd" ? "–" : a === "mold" ? "2500" : "0.0"}
                  title={aiFilled.has(`item:${a}`) ? t.reader.filledHint : undefined}
                  className={cn(FIELD, "rtl:text-end", ai(`item:${a}`))}
                />
              </Field>
              <Field label={t.results.uncertainty} className="col-span-2 sm:col-span-1">
                <input
                  inputMode="decimal"
                  dir="ltr"
                  value={form.items[a].uncertainty}
                  onChange={(e) => setItem(a, { uncertainty: e.target.value })}
                  className={cn(FIELD, "rtl:text-end", ai(`item:${a}`))}
                />
              </Field>
              <Field label={t.results.method} className="col-span-2 sm:col-span-3">
                <input dir="auto" value={form.items[a].method} maxLength={120} onChange={(e) => setItem(a, { method: e.target.value })} className={FIELD} />
              </Field>
            </div>
          </fieldset>
        ),
      )}

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2.5">
        <Field label={t.results.testedFrom}>
          <input
            type="date"
            dir="ltr"
            value={form.testedFrom}
            onChange={(e) => {
              seen("testedFrom");
              setForm((f) => ({ ...f, testedFrom: e.target.value }));
            }}
            className={cn(FIELD, ai("testedFrom"))}
          />
        </Field>
        <Field label={t.results.testedTo}>
          <input
            type="date"
            dir="ltr"
            value={form.testedTo}
            onChange={(e) => {
              seen("testedTo");
              setForm((f) => ({ ...f, testedTo: e.target.value }));
            }}
            className={cn(FIELD, ai("testedTo"))}
          />
        </Field>
      </div>
      <Field label={t.results.deviations}>
        <textarea
          rows={2}
          maxLength={1000}
          value={form.deviations}
          onChange={(e) => setForm((f) => ({ ...f, deviations: e.target.value }))}
          placeholder={t.results.deviationsPlaceholder}
          className={AREA}
        />
      </Field>

      {mode === "amend" ? (
        <Field label={t.results.amendReason}>
          <textarea rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t.results.amendReasonPlaceholder} className={AREA} />
        </Field>
      ) : null}

      {confirming ? (
        <Confirm
          text={mode === "amend" ? t.results.amendConfirm : t.results.releaseConfirm}
          yes={mode === "amend" ? t.results.amend : t.results.releaseYes}
          no={t.results.cancel}
          busy={busy === "release"}
          onYes={onRelease}
          onNo={() => setConfirming(false)}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          {mode === "release" ? (
            <button type="button" disabled={busy !== null} onClick={onDraft} className={QUIET}>
              {busy === "draft" ? <Spinner size="sm" label={null} /> : t.results.saveDraft}
            </button>
          ) : null}
          {canManage ? (
            <button
              type="button"
              disabled={busy !== null || (mode === "amend" && !reason.trim())}
              onClick={() => (blocked() ? undefined : setConfirming(true))}
              className={PRIMARY}
            >
              {mode === "amend" ? t.results.amend : t.results.release}
            </button>
          ) : null}
          {mode === "amend" ? (
            <button type="button" onClick={onDone} className={QUIET}>
              {t.results.cancel}
            </button>
          ) : null}
        </div>
      )}
      {!canManage ? <p className="text-[13px] text-muted-foreground">{t.detail.rolesNote}</p> : null}
    </div>
  );
}

function PanelBlock({
  title,
  panel,
  onMethod,
  onLine,
  onAdd,
  onRemove,
  aiFilled,
}: {
  aiFilled: ReadonlySet<string>;
  title: string;
  panel: ResultsForm["panels"][string];
  onMethod: (m: string) => void;
  onLine: (key: string, patch: Partial<LineState>) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
}) {
  const t = useMessages(labMessages);
  return (
    <fieldset className="min-w-0 rounded-2xl border border-white bg-white/60 p-3.5 sm:p-4">
      <legend className="sr-only">{title}</legend>
      <p className="mb-2.5 text-[15px] font-semibold">{title}</p>
      <Field label={t.results.method}>
        <input dir="auto" value={panel.method} maxLength={120} onChange={(e) => onMethod(e.target.value)} className={FIELD} />
      </Field>
      <ul className="mt-3 space-y-2.5">
        {panel.lines.map((l, i) => {
          const canJudge = l.limit.trim() !== "" && l.limitRef.trim() !== "";
          const byAi = aiFilled.has(`line:${l.key}`);
          return (
            <li key={l.key} title={byAi ? t.reader.filledHint : undefined} className={cn("rounded-xl bg-[#eef2ff]/70 p-3", byAi && AI_FILLED)}>
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 sm:grid-cols-[minmax(0,1.6fr)_7.5rem_minmax(0,1fr)_minmax(0,0.8fr)]">
                <Field label={t.results.lineName} className="col-span-2 sm:col-span-1">
                  <input dir="auto" value={l.name} maxLength={80} placeholder={t.results.namePlaceholder} onChange={(e) => onLine(l.key, { name: e.target.value })} className={FIELD} />
                </Field>
                <Field label={t.results.qualifier}>
                  <QualifierSelect label={t.results.qualifier} value={l.qualifier} onChange={(qualifier) => onLine(l.key, { qualifier })} />
                </Field>
                <Field label={t.results.value}>
                  <input
                    inputMode="decimal"
                    dir="ltr"
                    value={l.value}
                    placeholder={l.qualifier === "nd" ? "–" : "0.00"}
                    onChange={(e) => onLine(l.key, { value: e.target.value })}
                    className={cn(FIELD, "rtl:text-end")}
                  />
                </Field>
                <Field label={t.results.unit}>
                  <input dir="ltr" value={l.unit} maxLength={30} onChange={(e) => onLine(l.key, { unit: e.target.value })} className={cn(FIELD, "rtl:text-end")} />
                </Field>
                <Field label={t.results.limit}>
                  <input inputMode="decimal" dir="ltr" value={l.limit} onChange={(e) => onLine(l.key, { limit: e.target.value })} className={cn(FIELD, "rtl:text-end")} />
                </Field>
                <Field label={t.results.limitRef} className="sm:col-span-2">
                  <input dir="auto" value={l.limitRef} maxLength={120} placeholder={t.results.refPlaceholder} onChange={(e) => onLine(l.key, { limitRef: e.target.value })} className={FIELD} />
                </Field>
                <Field label={t.results.conformity}>
                  <select
                    aria-label={t.results.conformity}
                    disabled={!canJudge}
                    title={canJudge ? undefined : t.results.conformityHint}
                    value={canJudge ? l.pass : ""}
                    onChange={(e) => onLine(l.key, { pass: e.target.value as LineState["pass"] })}
                    className={cn(FIELD, "px-2.5")}
                  >
                    <option value="">{t.results.noVerdict}</option>
                    <option value="pass">{t.results.pass}</option>
                    <option value="fail">{t.results.fail}</option>
                  </select>
                </Field>
              </div>
              {panel.lines.length > 1 ? (
                <button
                  type="button"
                  onClick={() => onRemove(l.key)}
                  aria-label={`${t.results.removeLine} ${i + 1}`}
                  className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
                >
                  <Trash2 className="size-3.5" /> {t.results.removeLine}
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[12px] text-muted-foreground">{t.results.conformityHint}</p>
      <button type="button" onClick={onAdd} className={cn(QUIET, "mt-2.5 h-9 px-3.5 text-[13px]")}>
        <Plus className="size-4" /> {t.results.addLine}
      </button>
    </fieldset>
  );
}
