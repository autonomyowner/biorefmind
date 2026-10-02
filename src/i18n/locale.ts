/** The site's languages. English is the default; Arabic reads right to left. */
export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Cookie that remembers the visitor's language (no cookie = English). */
export const LOCALE_COOKIE = "biorefmind.lang";

export function parseLocale(value: string | null | undefined): Locale {
  return value === "ar" ? "ar" : DEFAULT_LOCALE;
}

export function dirOf(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}
