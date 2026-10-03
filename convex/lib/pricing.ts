/** The lab subscription, in US dollars per month. */
export const LAB_PRICE_USD = 100;

/** Fixed rate set by BiorefMind (2026-10-03): $100 = 25,000 DA. Not a market rate. */
export const USD_TO_DZD = 250;

export const LAB_PRICE_DZD = toDzd(LAB_PRICE_USD);

export function toDzd(usd: number): number {
  return Math.round(usd * USD_TO_DZD);
}

/** `ms` plus whole calendar months (UTC); the 31st becomes the last day of a shorter month. */
export function addMonths(ms: number, months: number): number {
  const d = new Date(ms);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.getTime();
}

/** Where a lab's next paid period starts: the later of now and its current end (trial or paid). */
export function extendBase(c: { plan: string; trialEndsAt?: number; paidUntil?: number }, now: number): number {
  const end = c.plan === "lab_paid" ? c.paidUntil : c.trialEndsAt;
  return Math.max(now, end ?? 0);
}
