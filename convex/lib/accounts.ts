import { ConvexError } from "convex/values";

export const LAB_TRIAL_MS = 14 * 24 * 60 * 60 * 1000;

/** Every refusal of the account functions, word for word (the website translates them). */
export const REFUSE = {
  name: "Name must be 2–80 characters.",
  region: "Please enter your region.",
  phone: "Please enter a phone number.",
  services: "Choose at least one analysis your lab offers.",
  oneFarm: "You already have a farm account.",
  farmInvite: "Farm accounts are for one person.",
  admin: "Only BiorefMind admins can do this.",
  notLab: "That account is not a lab.",
  months: "Choose between 1 and 12 months.",
  enterpriseKind: "Only factory accounts can request enterprise pricing.",
  enterpriseMessage: "Please write a short message (up to 1000 characters).",
} as const;

type Listable = { kind: string; plan: string; trialEndsAt?: number; paidUntil?: number };

/** A lab shows in the directory while its trial runs or its paid period lasts. */
export function labListed(c: Listable, now: number): boolean {
  if (c.kind !== "lab") return false;
  if (c.plan === "lab_paid") return (c.paidUntil ?? 0) > now;
  if (c.plan === "lab_trial") return (c.trialEndsAt ?? 0) > now;
  return false;
}

/** Admins are the emails in the Convex env var ADMIN_EMAILS (comma-separated). Unset → nobody. */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}

export function cleanName(raw: string): string {
  const s = raw.trim();
  if (s.length < 2 || s.length > 80) throw new ConvexError(REFUSE.name);
  return s;
}

export function cleanRegion(raw: string): string {
  const s = raw.trim();
  if (s.length < 2 || s.length > 80) throw new ConvexError(REFUSE.region);
  return s;
}

/** 7–20 digits once spaces, "+", "-" and brackets are removed; stored as typed (trimmed). */
export function cleanPhone(raw: string): string {
  const s = raw.trim();
  const digits = s.replace(/[\s+\-()]/g, "");
  if (!/^\d{7,20}$/.test(digits) || s.length > 30) throw new ConvexError(REFUSE.phone);
  return s;
}

/** Only keys from `catalog`, each once, in catalog order. */
export function pickKnown<T extends string>(keys: readonly string[], catalog: readonly T[]): T[] {
  const wanted = new Set(keys);
  return catalog.filter((k) => wanted.has(k));
}
