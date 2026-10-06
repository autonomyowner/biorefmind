import type { Locale } from "@/i18n/locale";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "2 hours ago" / "منذ ساعتين" (Latin digits, like the rest of the site); "now" under a minute. */
export function timeAgo(ms: number, now: number, locale: Locale): string {
  const rtf = new Intl.RelativeTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "en", { numeric: "auto" });
  const diff = Math.max(0, now - ms);
  if (diff < MINUTE) return rtf.format(0, "second");
  if (diff < HOUR) return rtf.format(-Math.floor(diff / MINUTE), "minute");
  if (diff < DAY) return rtf.format(-Math.floor(diff / HOUR), "hour");
  if (diff < 30 * DAY) return rtf.format(-Math.floor(diff / DAY), "day");
  if (diff < 365 * DAY) return rtf.format(-Math.floor(diff / (30 * DAY)), "month");
  return rtf.format(-Math.floor(diff / (365 * DAY)), "year");
}
