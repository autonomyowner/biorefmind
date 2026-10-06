import type { LabReading, LabResults } from "@/lib/types";
import { PANEL_ANALYSES } from "../../../../convex/lib/catalog";

// Pure helpers for the lab workspace (no React), so they can be tested on their own.
// Design: docs/superpowers/specs/2026-10-06-lab-requests-design.md

export const DAY = 86_400_000;

/** Queue tabs: New · Awaiting sample · In lab · Done. */
export type QueueTab = "new" | "waiting" | "inLab" | "done";
export const QUEUE_TABS: QueueTab[] = ["new", "waiting", "inLab", "done"];

export function tabOf(status: string): QueueTab {
  if (status === "requested") return "new";
  if (status === "accepted") return "waiting";
  if (status === "received") return "inLab";
  return "done"; // released, declined, cancelled, expired, lab_unavailable
}

const PANELS: readonly string[] = PANEL_ANALYSES;
export const isPanel = (analysis: string) => PANELS.includes(analysis);

type StatRow = {
  status: string;
  createdAt: number;
  totalDzd: number;
  paid: boolean;
  dueAt?: number;
  reports: { version: number; releasedAt: number }[];
};

export type MonthStats = {
  received: number;
  released: number;
  /** Share of this month's releases that were on time, 0–100; null when nothing was released. */
  onTimePct: number | null;
  requestedDzd: number;
  paidDzd: number;
};

const DEAD = new Set(["declined", "cancelled", "expired", "lab_unavailable"]);

/** "This month" figures, worked out in the browser from the lab's queue (month in local time). */
export function monthStats(rows: readonly StatRow[], now: number): MonthStats {
  const d = new Date(now);
  const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
  const inMonth = (ms: number) => ms >= start && ms < end;

  let received = 0;
  let released = 0;
  let onTime = 0;
  let requestedDzd = 0;
  let paidDzd = 0;
  for (const r of rows) {
    if (inMonth(r.createdAt)) {
      received += 1;
      if (!DEAD.has(r.status)) {
        requestedDzd += r.totalDzd;
        if (r.paid) paidDzd += r.totalDzd;
      }
    }
    // The first release counts (amendments are not new work).
    const first = r.reports.reduce<{ version: number; releasedAt: number } | null>(
      (min, x) => (min === null || x.version < min.version ? x : min),
      null,
    );
    if (first && inMonth(first.releasedAt)) {
      released += 1;
      if (r.dueAt !== undefined && first.releasedAt <= r.dueAt) onTime += 1;
    }
  }
  return {
    received,
    released,
    onTimePct: released === 0 ? null : Math.round((onTime / released) * 100),
    requestedDzd,
    paidDzd,
  };
}

/** The backend's default due date: received + the longest turnaround (working days ×7/5, rounded up). */
export function defaultDue(receivedAt: number, analyses: readonly { days: number }[]): number {
  const days = Math.max(1, ...analyses.map((a) => a.days));
  return receivedAt + Math.ceil((days * 7) / 5) * DAY;
}

/** A timestamp as a date field's value ("2026-10-06"), in local time. */
export function toDateInput(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** A date field's value as noon UTC that day (safe against time zones); invalid → NaN. */
export function fromDateInput(s: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return Number.NaN;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
}

/** Parses a number field; empty → NaN (the backend refuses it with a readable message). Accepts "1,5" and "2e4". */
export function num(s: string): number {
  return s.trim() === "" ? Number.NaN : Number(s.trim().replace(",", "."));
}

/* ---------- Results form ---------- */

export type QualifierChoice = "" | "<" | ">" | "nd";
export type PassChoice = "" | "pass" | "fail";

export type ItemState = { value: string; qualifier: QualifierChoice; uncertainty: string; method: string };
export type LineState = {
  key: string;
  name: string;
  value: string;
  qualifier: QualifierChoice;
  unit: string;
  limit: string;
  limitRef: string;
  pass: PassChoice;
};
export type PanelState = { method: string; lines: LineState[] };
export type ResultsForm = {
  items: Record<string, ItemState>;
  panels: Record<string, PanelState>;
  testedFrom: string;
  testedTo: string;
  deviations: string;
};

let lineSeq = 0;
export function newLine(partial: Partial<LineState> = {}): LineState {
  lineSeq += 1;
  return { key: `l${lineSeq}`, name: "", value: "", qualifier: "", unit: "mg/kg", limit: "", limitRef: "", pass: "", ...partial };
}

const str = (n: number | undefined) => (n === undefined ? "" : String(n));

/** The form for the analyses requested, prefilled from earlier results (a draft or the last certificate) when given. */
export function makeForm(opts: {
  analyses: readonly string[];
  methods: Record<string, string>;
  receivedAt: number;
  now: number;
  from?: LabResults;
}): ResultsForm {
  const { analyses, methods, from } = opts;
  const items: Record<string, ItemState> = {};
  const panels: Record<string, PanelState> = {};
  for (const a of analyses) {
    if (isPanel(a)) {
      const p = from?.panels.find((x) => x.analysis === a);
      panels[a] = {
        method: p?.method ?? methods[a] ?? "",
        lines: p
          ? p.lines.map((l) =>
              newLine({
                name: l.name,
                value: l.qualifier === "nd" && l.value === 0 ? "" : str(l.value),
                qualifier: l.qualifier ?? "",
                unit: l.unit,
                limit: str(l.limit),
                limitRef: l.limitRef ?? "",
                pass: l.pass === undefined ? "" : l.pass ? "pass" : "fail",
              }),
            )
          : [newLine()],
      };
    } else {
      const it = from?.items.find((x) => x.analysis === a);
      items[a] = {
        value: it ? (it.qualifier === "nd" && it.value === 0 ? "" : str(it.value)) : "",
        qualifier: it?.qualifier ?? "",
        uncertainty: str(it?.uncertainty),
        method: it?.method ?? methods[a] ?? "",
      };
    }
  }
  return {
    items,
    panels,
    testedFrom: from ? toDateInput(from.testedFrom) : toDateInput(opts.receivedAt),
    testedTo: from ? toDateInput(from.testedTo) : toDateInput(opts.now),
    deviations: from?.deviations ?? "",
  };
}

const filled = (v: { value: string; qualifier: QualifierChoice }) => v.value.trim() !== "" || v.qualifier === "nd";
/** "not detected" may be sent without a number: it counts as 0. */
const valueOf = (v: { value: string; qualifier: QualifierChoice }) => (v.qualifier === "nd" && v.value.trim() === "" ? 0 : num(v.value));
const lineEmpty = (l: LineState) => !l.name.trim() && !l.value.trim() && l.qualifier === "" && !l.limit.trim() && !l.limitRef.trim();

/**
 * What the backend receives. Analyses with no value are left out (a draft may skip them; a release
 * is then refused with "Enter a result for every analysis requested."). Blank panel lines are dropped.
 */
export function toResults(form: ResultsForm, analyses: readonly string[]): LabResults {
  const items: LabResults["items"] = [];
  const panels: LabResults["panels"] = [];
  for (const a of analyses) {
    if (isPanel(a)) {
      const p = form.panels[a];
      if (!p) continue;
      const lines = p.lines.filter((l) => !lineEmpty(l));
      if (lines.length === 0) continue;
      panels.push({
        analysis: a,
        method: p.method,
        lines: lines.map((l) => {
          const out: LabResults["panels"][number]["lines"][number] = {
            name: l.name,
            value: valueOf(l),
            unit: l.unit,
          };
          if (l.qualifier) out.qualifier = l.qualifier;
          if (l.limit.trim()) out.limit = num(l.limit);
          if (l.limitRef.trim()) out.limitRef = l.limitRef.trim();
          if (out.limit !== undefined && out.limitRef && l.pass) out.pass = l.pass === "pass";
          return out;
        }),
      });
    } else {
      const it = form.items[a];
      if (!it || !filled(it)) continue;
      const out: LabResults["items"][number] = { analysis: a, value: valueOf(it), method: it.method };
      if (it.qualifier) out.qualifier = it.qualifier;
      if (it.uncertainty.trim()) out.uncertainty = num(it.uncertainty);
      items.push(out);
    }
  }
  const results: LabResults = {
    items,
    panels,
    testedFrom: fromDateInput(form.testedFrom),
    testedTo: fromDateInput(form.testedTo),
  };
  if (form.deviations.trim()) results.deviations = form.deviations.trim();
  return results;
}

/**
 * Puts what the results reader read into the form. Methods, limits and verdicts are never touched; values and
 * lines the analyst already typed are kept (never overwritten). `filled` lists the fields it set ("item:moisture", "line:<key>", "testedFrom"…),
 * so the form can highlight them until the analyst edits them.
 */
export function applyReading(form: ResultsForm, reading: LabReading): { form: ResultsForm; filled: string[] } {
  const done: string[] = [];
  const items = { ...form.items };
  for (const it of reading.items) {
    const cur = items[it.analysis];
    if (!cur || filled(cur)) continue;
    items[it.analysis] = {
      ...cur,
      value: it.qualifier === "nd" ? "" : String(it.value),
      qualifier: it.qualifier ?? "",
      uncertainty: it.uncertainty === undefined ? "" : String(it.uncertainty),
    };
    done.push(`item:${it.analysis}`);
  }
  const panels = { ...form.panels };
  for (const p of reading.panels) {
    const cur = panels[p.analysis];
    if (!cur) continue;
    const added = p.lines.map((l) =>
      newLine({ name: l.name, value: l.qualifier === "nd" ? "" : String(l.value), qualifier: l.qualifier ?? "", unit: l.unit }),
    );
    panels[p.analysis] = { ...cur, lines: [...cur.lines.filter((l) => !lineEmpty(l)), ...added] };
    for (const l of added) done.push(`line:${l.key}`);
  }
  const next = { ...form, items, panels };
  if (reading.testedFrom) {
    next.testedFrom = reading.testedFrom;
    done.push("testedFrom");
  }
  if (reading.testedTo) {
    next.testedTo = reading.testedTo;
    done.push("testedTo");
  }
  return { form: next, filled: done };
}
