import { ConvexError } from "convex/values";
import { maskPhones } from "./market";

// Design and contract: docs/superpowers/specs/2026-10-06-ai-photo-check-design.md

export const AI_REFUSE = {
  key: "That doesn't look like an OpenRouter key (it starts with sk-or-).",
  model: "Write the model as provider/model, for example google/gemini-3.8-flash.",
  notFailed: "This photo check is not waiting for a retry.",
  retries: "You can try again 3 times a day. Please try tomorrow.",
} as const;

/** Vision model used when the admin has not chosen one (and by the assistant). */
export const DEFAULT_MODEL = "google/gemini-3.8-flash";
/** Photo checks across the whole platform per UTC day; beyond it new lots get none. */
export const DAILY_CAP = 300;
/** "Try again" presses per lot per UTC day. */
export const RETRIES_PER_DAY = 3;
export const OPENROUTER_URL = "https://openrouter.ai/api/v1";

export const CONCERNS = ["mould", "wet", "browning", "foreign_matter", "mixed", "poor_photo"] as const;
export type Concern = (typeof CONCERNS)[number];
export type Bilingual = { en: string; ar: string };
export type PhotoCheckResult = {
  match: "yes" | "unsure" | "no";
  seen: Bilingual;
  state: "fresh" | "dried" | "unclear";
  concerns: Concern[];
  tip: Bilingual;
};

export function cleanKey(raw: string): string {
  const key = raw.trim();
  if (!/^sk-or-[A-Za-z0-9_-]{14,194}$/.test(key)) throw new ConvexError(AI_REFUSE.key);
  return key;
}

/** "sk-or-…9fc9": enough to recognise a key, never enough to use it. */
export function maskKey(key: string | undefined): string {
  return key ? `sk-or-…${key.slice(-4)}` : "";
}

export function cleanModel(raw: string): string {
  const model = raw.trim();
  if (model.length > 100 || !/^~?[a-z0-9-]+\/[A-Za-z0-9._:-]+$/.test(model)) throw new ConvexError(AI_REFUSE.model);
  return model;
}

/** Days since 1970 in UTC: the window for the daily cap and the retry limit. */
export function utcDay(ms: number): number {
  return Math.floor(ms / 86_400_000);
}

const RESIDUE_WORDS: Record<string, string> = {
  pomegranate_peels: "pomegranate peels",
  citrus_peels: "citrus peels",
  olive_pomace: "olive pomace",
  tomato_skins_seeds: "tomato skins and seeds",
  grape_marc: "grape marc (pomace)",
  date_pits: "date pits",
  corn_silk: "corn silk",
};

export function photoCheckPrompt(residue: string, residueName: string | undefined): string {
  const declared = residue === "other" ? (residueName ?? "an agricultural residue") : (RESIDUE_WORDS[residue] ?? residue);
  return `You look at photos of an agricultural residue lot posted for sale on BiorefMind, a marketplace where Algerian farmers sell residues to factories.
The farmer says the lot is "${declared}".
Judge only what is visible. You are not a lab: never guess chemical figures, quality scores or prices.
Answer with JSON only:
- match: "yes" if the photos clearly show ${declared}, "no" if they clearly show something else, "unsure" otherwise (also when photos are too poor).
- seen: one short sentence describing what the photos show, in English (en) and in Algerian-friendly Modern Standard Arabic (ar).
- state: "fresh", "dried" or "unclear".
- concerns: any of "mould" (visible mould or white/green/black fuzz), "wet" (looks wet or soggy), "browning" (browning or rot), "foreign_matter" (plastic, soil, stones, other waste), "mixed" (several residues mixed), "poor_photo" (too blurry, dark or far to judge). Empty list if none.
- tip: one short, kind, practical tip for the farmer to present or keep the lot better, in English (en) and Arabic (ar).
Keep every sentence under 140 characters. Do not mention phone numbers, names or places.`;
}

const textPair = {
  type: "object",
  properties: { en: { type: "string" }, ar: { type: "string" } },
  required: ["en", "ar"],
  additionalProperties: false,
};

/** OpenRouter `response_format` asking for exactly the PhotoCheckResult shape. */
export const PHOTO_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "photo_check",
    strict: true,
    schema: {
      type: "object",
      properties: {
        match: { type: "string", enum: ["yes", "unsure", "no"] },
        seen: textPair,
        state: { type: "string", enum: ["fresh", "dried", "unclear"] },
        concerns: { type: "array", items: { type: "string", enum: [...CONCERNS] } },
        tip: textPair,
      },
      required: ["match", "seen", "state", "concerns", "tip"],
      additionalProperties: false,
    },
  },
} as const;

const MAX_TEXT = 160;

function cleanText(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = maskPhones(v.replace(/\s+/g, " ").trim()).slice(0, MAX_TEXT).trim();
  return s ? s : null;
}

function cleanPair(v: unknown): Bilingual | null {
  if (!v || typeof v !== "object") return null;
  const { en, ar } = v as Record<string, unknown>;
  const e = cleanText(en);
  const a = cleanText(ar);
  return e && a ? { en: e, ar: a } : null;
}

/** The model's answer as a PhotoCheckResult, or null when it doesn't fit the shape. */
export function parsePhotoCheck(text: string): PhotoCheckResult | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (r.match !== "yes" && r.match !== "unsure" && r.match !== "no") return null;
  if (r.state !== "fresh" && r.state !== "dried" && r.state !== "unclear") return null;
  if (!Array.isArray(r.concerns)) return null;
  const seen = cleanPair(r.seen);
  const tip = cleanPair(r.tip);
  if (!seen || !tip) return null;
  const concerns = CONCERNS.filter((c) => (r.concerns as unknown[]).includes(c));
  return { match: r.match, seen, state: r.state, concerns, tip };
}
