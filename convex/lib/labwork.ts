import { ConvexError } from "convex/values";
import { cleanRegion } from "./accounts";
import { ANALYSES, PANEL_ANALYSES, type Analysis } from "./catalog";
import type { Lab } from "./crops";
import { cleanResidue } from "./market";
import { scoreShipment } from "./scoring";

// Design and contract: docs/superpowers/specs/2026-10-06-lab-requests-design.md

const DAY = 24 * 60 * 60 * 1000;
export const REQUEST_EXPIRY_DAYS = 7;
export const SAMPLE_WAIT_DAYS = 30;
export const BADGE_DAYS = 90;

/** Every refusal of the lab-work functions, word for word (the website translates them). */
export const LAB_REFUSE = {
  notLab: "That account is not a lab.",
  role: "Only owners and managers can do this.",
  address: "The address can be up to 200 characters.",
  hours: "Opening hours can be up to 120 characters.",
  retention: "The retention note can be up to 80 characters.",
  price: "Each price must be a whole number of dinars (1 to 1,000,000).",
  days: "Turnaround must be 1 to 90 working days.",
  priceService: "You can only price analyses your lab offers.",
  clientKind: "Only farm and factory accounts can request analyses.",
  labClosed: "This lab is not taking requests.",
  labPaused: "This lab has paused new requests.",
  analyses: "Choose at least one analysis.",
  notPriced: "This lab has no price for one of the analyses you chose.",
  notYourLot: "You can only request an analysis for your own lot.",
  notYourSale: "You can only request an analysis for a lot you bought.",
  listingClosed: "This lot is no longer open.",
  label: "Give the sample a name (2 to 80 characters).",
  state: "Choose fresh, dried or frozen.",
  collected: "Enter the date the sample was collected.",
  collectedFuture: "The collection date cannot be in the future.",
  grams: "Enter how many grams you are sending (1 to 100,000).",
  packaging: "Packaging can be up to 80 characters.",
  notes: "Notes can be up to 1000 characters.",
  tracking: "The tracking number can be up to 60 characters.",
  noRequest: "This request no longer exists.",
  closed: "This request is no longer open.",
  tooLate: "The lab has the sample already; ask the lab to cancel.",
  reason: "Please give a reason (up to 500 characters).",
  condition: "The condition note can be up to 500 characters.",
  dueAt: "The due date must be after the sample arrived and within 180 days.",
  results: "Enter a result for every analysis requested.",
  value: "One of the results is not a valid number.",
  method: "Each method must be 2 to 120 characters.",
  parameter: "Each line needs a name, a value and a unit.",
  testedOrder: "Test dates must fall between the receipt date and today.",
  deviations: "Deviations can be up to 1000 characters.",
  notReleased: "These results have not been released yet.",
  notThisLot: "These results are not about this lot.",
} as const;

type Spec = { unit: string; method: string; max: number };

/** Reported unit, default method and highest believable value per analysis. Panels have units per line. */
export const ANALYSIS_SPECS: Record<Analysis, Spec> = {
  moisture: { unit: "% (wet basis)", method: "Oven drying at 103–105 °C to constant mass", max: 100 },
  polyphenols: { unit: "mg GAE/g DM", method: "Folin–Ciocalteu", max: 500 },
  punicalagin: { unit: "mg/g DM", method: "HPLC-DAD (α + β anomers)", max: 300 },
  pectin: { unit: "% DM", method: "Acid extraction, gravimetric", max: 100 },
  mold: { unit: "CFU/g", method: "Yeasts and moulds, ISO 21527-2 (DG18)", max: 1e9 },
  oxidation: { unit: "meq O₂/kg", method: "Peroxide value, ISO 3960", max: 200 },
  heavy_metals: { unit: "", method: "ICP-OES / AAS", max: 1e9 },
  mycotoxins: { unit: "", method: "HPLC-FLD", max: 1e9 },
  pesticides: { unit: "", method: "LC-MS/MS and GC-MS/MS multi-residue", max: 1e9 },
};

const PANELS: readonly string[] = PANEL_ANALYSES;
export const isPanel = (a: string) => PANELS.includes(a);

export type Price = { analysis: string; priceDzd: number; days: number };
export type Qualifier = "<" | ">" | "nd";
export type ResultItem = { analysis: string; value: number; qualifier?: Qualifier; uncertainty?: number; method: string };
export type PanelLine = {
  name: string;
  value: number;
  qualifier?: Qualifier;
  unit: string;
  limit?: number;
  limitRef?: string;
  pass?: boolean;
};
export type Panel = { analysis: string; method: string; lines: PanelLine[] };
export type Results = {
  items: ResultItem[];
  panels: Panel[];
  testedFrom: number;
  testedTo: number;
  deviations?: string;
};
export type SampleState = "fresh" | "dried" | "frozen";
export type Sample = {
  residue: string;
  residueName?: string;
  label: string;
  state: SampleState;
  collectedAt: number;
  region: string;
  grams: number;
  packaging?: string;
  notes?: string;
};

/** Optional text: trimmed, empty → undefined, longer than `max` refused. */
export function optionalText(raw: string | undefined, max: number, refusal: string): string | undefined {
  const s = raw?.trim();
  if (!s) return undefined;
  if (s.length > max) throw new ConvexError(refusal);
  return s;
}

function requiredText(raw: string | undefined, min: number, max: number, refusal: string): string {
  const s = raw?.trim() ?? "";
  if (s.length < min || s.length > max) throw new ConvexError(refusal);
  return s;
}

/** Labs that ticked "contamination" before 2026-10-06 now offer heavy metals. Catalog order, no repeats. */
export function normalizeServices(services: readonly string[] | undefined): Analysis[] {
  const wanted = new Set((services ?? []).map((s) => (s === "contamination" ? "heavy_metals" : s)));
  return ANALYSES.filter((a) => wanted.has(a));
}

/** The lab's price list: only analyses it offers, whole dinars, 1–90 working days; catalog order. */
export function cleanPrices(prices: readonly Price[], services: readonly string[]): Price[] {
  const byKey = new Map<string, Price>();
  for (const p of prices) {
    if (!services.includes(p.analysis)) throw new ConvexError(LAB_REFUSE.priceService);
    if (!Number.isInteger(p.priceDzd) || p.priceDzd < 1 || p.priceDzd > 1_000_000) throw new ConvexError(LAB_REFUSE.price);
    if (!Number.isInteger(p.days) || p.days < 1 || p.days > 90) throw new ConvexError(LAB_REFUSE.days);
    byKey.set(p.analysis, { analysis: p.analysis, priceDzd: p.priceDzd, days: p.days });
  }
  return ANALYSES.filter((a) => byKey.has(a)).map((a) => byKey.get(a)!);
}

export function cleanSample(
  raw: {
    residue: string;
    residueName?: string;
    label: string;
    state: string;
    collectedAt: number;
    region: string;
    grams: number;
    packaging?: string;
    notes?: string;
  },
  now: number,
): Sample {
  const { residue, residueName } = cleanResidue(raw.residue, raw.residueName);
  const label = requiredText(raw.label, 2, 80, LAB_REFUSE.label);
  if (raw.state !== "fresh" && raw.state !== "dried" && raw.state !== "frozen") throw new ConvexError(LAB_REFUSE.state);
  if (!Number.isFinite(raw.collectedAt) || raw.collectedAt < now - 730 * DAY) throw new ConvexError(LAB_REFUSE.collected);
  if (raw.collectedAt > now + DAY) throw new ConvexError(LAB_REFUSE.collectedFuture);
  if (!Number.isInteger(raw.grams) || raw.grams < 1 || raw.grams > 100_000) throw new ConvexError(LAB_REFUSE.grams);
  const out: Sample = {
    residue,
    label,
    state: raw.state,
    collectedAt: raw.collectedAt,
    region: cleanRegion(raw.region),
    grams: raw.grams,
  };
  if (residueName) out.residueName = residueName;
  const packaging = optionalText(raw.packaging, 80, LAB_REFUSE.packaging);
  if (packaging) out.packaging = packaging;
  const notes = optionalText(raw.notes, 1000, LAB_REFUSE.notes);
  if (notes) out.notes = notes;
  return out;
}

export function cleanReason(raw: string | undefined): string {
  return requiredText(raw, 1, 500, LAB_REFUSE.reason);
}

/** Received + the longest turnaround (working days → calendar days ×7/5, rounded up). */
export function dueDate(receivedAt: number, workingDays: number): number {
  return receivedAt + Math.ceil((workingDays * 7) / 5) * DAY;
}

/** The lab may set its own due date at receipt (holidays, Ramadan hours); otherwise the formula. */
export function cleanDueAt(dueAt: number | undefined, receivedAt: number, workingDays: number): number {
  if (dueAt === undefined) return dueDate(receivedAt, workingDays);
  if (!Number.isFinite(dueAt) || dueAt < receivedAt || dueAt > receivedAt + 180 * DAY) {
    throw new ConvexError(LAB_REFUSE.dueAt);
  }
  return dueAt;
}

const QUALIFIERS: readonly string[] = ["<", ">", "nd"];

function cleanValue(value: number, qualifier: string | undefined, max: number) {
  if (!Number.isFinite(value) || value < 0 || value > max) throw new ConvexError(LAB_REFUSE.value);
  if (qualifier !== undefined && !QUALIFIERS.includes(qualifier)) throw new ConvexError(LAB_REFUSE.value);
  return { value, qualifier: qualifier as Qualifier | undefined };
}

const cleanMethod = (raw: string) => requiredText(raw, 2, 120, LAB_REFUSE.method);

/**
 * Results for the analyses requested, in request order (others are dropped).
 * A draft may leave analyses out; a release may not. Test dates lie between receipt and today.
 */
export function cleanResults(
  raw: Results,
  analyses: readonly string[],
  receivedAt: number,
  now: number,
  opts: { draft?: boolean } = {},
): Results {
  const items: ResultItem[] = [];
  const panels: Panel[] = [];
  for (const a of analyses) {
    if (isPanel(a)) {
      const p = raw.panels.find((x) => x.analysis === a);
      if (!p || p.lines.length === 0) {
        if (opts.draft) continue;
        throw new ConvexError(LAB_REFUSE.results);
      }
      if (p.lines.length > 60) throw new ConvexError(LAB_REFUSE.parameter);
      const lines = p.lines.map((l): PanelLine => {
        const name = l.name?.trim() ?? "";
        const unit = l.unit?.trim() ?? "";
        if (name.length < 1 || name.length > 80 || unit.length < 1 || unit.length > 30) {
          throw new ConvexError(LAB_REFUSE.parameter);
        }
        const out: PanelLine = { name, unit, ...cleanValue(l.value, l.qualifier, 1e9) };
        if (out.qualifier === undefined) delete out.qualifier;
        if (l.limit !== undefined) {
          if (!Number.isFinite(l.limit) || l.limit < 0) throw new ConvexError(LAB_REFUSE.value);
          out.limit = l.limit;
          const ref = optionalText(l.limitRef, 120, LAB_REFUSE.parameter);
          if (ref) {
            out.limitRef = ref;
            // A conformity statement only against a stated limit and its reference (ISO/IEC 17025 §7.8.6).
            if (typeof l.pass === "boolean") out.pass = l.pass;
          }
        }
        return out;
      });
      panels.push({ analysis: a, method: cleanMethod(p.method), lines });
    } else {
      const it = raw.items.find((x) => x.analysis === a);
      if (!it) {
        if (opts.draft) continue;
        throw new ConvexError(LAB_REFUSE.results);
      }
      const spec = ANALYSIS_SPECS[a as Analysis];
      const out: ResultItem = { analysis: a, ...cleanValue(it.value, it.qualifier, spec?.max ?? 1e9), method: cleanMethod(it.method) };
      if (out.qualifier === undefined) delete out.qualifier;
      if (it.uncertainty !== undefined) {
        if (!Number.isFinite(it.uncertainty) || it.uncertainty < 0) throw new ConvexError(LAB_REFUSE.value);
        out.uncertainty = it.uncertainty;
      }
      items.push(out);
    }
  }
  const { testedFrom, testedTo } = raw;
  if (
    !Number.isFinite(testedFrom) ||
    !Number.isFinite(testedTo) ||
    testedFrom > testedTo ||
    testedFrom < receivedAt - DAY ||
    testedTo > now + DAY
  ) {
    throw new ConvexError(LAB_REFUSE.testedOrder);
  }
  const out: Results = { items, panels, testedFrom, testedTo };
  const deviations = optionalText(raw.deviations, 1000, LAB_REFUSE.deviations);
  if (deviations) out.deviations = deviations;
  return out;
}

export type StoredStatus = "requested" | "accepted" | "declined" | "received" | "released" | "cancelled";
export type EffectiveStatus = StoredStatus | "expired" | "lab_unavailable";

/** The status people see. Timeouts are worked out when read; nothing runs on a timer. */
export function effectiveStatus(
  req: { status: StoredStatus; createdAt: number; respondedAt?: number },
  now: number,
  labOpen: boolean,
): EffectiveStatus {
  if (req.status === "requested") {
    if (now - req.createdAt > REQUEST_EXPIRY_DAYS * DAY) return "expired";
    if (!labOpen) return "lab_unavailable";
  }
  if (req.status === "accepted" && now - (req.respondedAt ?? req.createdAt) > SAMPLE_WAIT_DAYS * DAY) return "expired";
  return req.status;
}

export function isOverdue(req: { status: string; dueAt?: number }, now: number): boolean {
  return req.status === "received" && req.dueAt !== undefined && req.dueAt < now;
}

export function sampleNo(year: number, seq: number): string {
  return `S-${year}-${String(seq).padStart(4, "0")}`;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** 12 random characters with no look-alikes (no I, O, 0, 1). */
export function verifyCode(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

/** "<x" counts as x and "not detected" as 0. */
const effectiveValue = (v: { value: number; qualifier?: Qualifier }) => (v.qualifier === "nd" ? 0 : v.value);

/**
 * BiorefMind's score for a lot from released results, through the existing engine (unchanged).
 * Pomegranate peels only. Thresholds are placeholders to calibrate (open decision 1).
 */
export function lotScore(
  residue: string,
  state: SampleState,
  results: Results,
): { score: number; route: "A" | "B" | "C"; reasons: string[] } | null {
  if (residue !== "pomegranate_peels") return null;
  const lab: Lab = {};
  for (const it of results.items) {
    const v = effectiveValue(it);
    if (it.analysis === "punicalagin") lab.punicalagin = v / 10; // mg/g → %
    // Fresh and frozen peel are wet by nature; moisture only says something about dried peel.
    if (it.analysis === "moisture" && state === "dried") lab.moisture = v;
    // CFU/g → the engine's mould scale: ≤ 3 log is 0, 5 log reaches its gate (> 5 → C).
    if (it.analysis === "mold") lab.mold = Math.max(0, (Math.log10(Math.max(1, v)) - 3) * 2.5);
  }
  if (Object.keys(lab).length === 0) return null;
  const s = scoreShipment("pomegranate_peel", lab);
  let route = s.route;
  const reasons = [...s.reasons];
  for (const p of results.panels) {
    for (const l of p.lines) {
      if (l.pass === false) {
        route = "C";
        reasons.push(`${l.name} ${l.value} ${l.unit} is above the limit ${l.limit} ${l.unit} (${l.limitRef}) — routed to C.`);
      }
    }
  }
  return { score: s.score, route, reasons };
}

/** A lot shows its lab badge while it is open and the results are under 90 days old. */
export function badgeVisible(listing: { status: string }, report: { releasedAt: number } | null, now: number): boolean {
  return listing.status === "open" && report !== null && now - report.releasedAt <= BADGE_DAYS * DAY;
}
