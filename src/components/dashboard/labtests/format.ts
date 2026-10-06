// Pure helpers for the lab-tests screens (no React, no path aliases, so tests can import them).

/** Arabic plural class for a count: 1, 2, 3–10, then 11+ (and 0). English uses one/other. */
export function pluralClass(n: number): "one" | "two" | "few" | "many" {
  if (n === 1) return "one";
  if (n === 2) return "two";
  if (n >= 3 && n <= 10) return "few";
  return "many";
}

/** Today as a date input value (local time). */
export function todayInput(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** A date input value → midday local time in ms (stays on the same calendar day); empty or bad → NaN. */
export function inputToMs(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return Number.NaN;
  return new Date(`${value}T12:00:00`).getTime();
}

/**
 * Why an expired request expired: only accepted requests carry `respondedAt` (a declined one is
 * never "expired"), so with it the sample never came; without it the lab never answered.
 */
export function expiredWhy(respondedAt: number | undefined): "noAnswer" | "noSample" {
  return respondedAt === undefined ? "noAnswer" : "noSample";
}
