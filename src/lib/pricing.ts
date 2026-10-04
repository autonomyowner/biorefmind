import type { Locale } from "@/i18n/locale";
import { LAB_PRICE_DZD, LAB_PRICE_USD, MARKET_FEE_RATE, toDzd, USD_TO_DZD } from "../../convex/lib/pricing";

export { LAB_PRICE_DZD, LAB_PRICE_USD, MARKET_FEE_RATE, USD_TO_DZD };

/** Prices are set in dollars and shown in dollars or Algerian dinars. */
export type Currency = "usd" | "dzd";

/** Where the visitor's choice is kept (localStorage). */
export const CURRENCY_KEY = "biorefmind.currency";

const group = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** "$100" / "25,000 DA" in English, "100$" / "25,000 دج" in Arabic (Latin digits, like the rest of the site). */
export function formatPrice(usd: number, currency: Currency, locale: Locale): string {
  if (currency === "usd") return locale === "ar" ? `${group.format(usd)}$` : `$${group.format(usd)}`;
  return `${group.format(toDzd(usd))} ${locale === "ar" ? "دج" : "DA"}`;
}

/** A saved choice wins; otherwise English pages show dollars and Arabic pages dinars. */
export function parseCurrency(saved: string | null | undefined, locale: Locale): Currency {
  if (saved === "usd" || saved === "dzd") return saved;
  return locale === "ar" ? "dzd" : "usd";
}

const dinars = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

/** Marketplace amounts are set in dinars: "30,000 DA" / "30,000 دج", "15.5 DA". */
export function formatDzd(dzd: number, locale: Locale): string {
  return `${dinars.format(dzd)} ${locale === "ar" ? "دج" : "DA"}`;
}

/** "2,000 kg" / "2,000 كغ". */
export function formatKg(kg: number, locale: Locale): string {
  return `${dinars.format(kg)} ${locale === "ar" ? "كغ" : "kg"}`;
}
