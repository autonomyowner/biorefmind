"use client";

import { useId, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";

import { useLocale } from "@/i18n/provider";
import { CURRENCY_KEY, formatPrice, parseCurrency, type Currency } from "@/lib/pricing";
import { cn } from "@/lib/utils";

const CHANGED = "biorefmind:currency";

function read(): string | null {
  try {
    return window.localStorage.getItem(CURRENCY_KEY);
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGED, onChange);
  };
}

/** The visitor's currency: their saved choice, else dollars in English and dinars in Arabic. */
export function useCurrency(): [Currency, (next: Currency) => void] {
  const locale = useLocale();
  const saved = useSyncExternalStore(subscribe, read, () => null);
  function set(next: Currency) {
    try {
      window.localStorage.setItem(CURRENCY_KEY, next);
    } catch {
      // Private mode: the choice lasts until the page is left.
    }
    window.dispatchEvent(new Event(CHANGED));
  }
  return [parseCurrency(saved, locale), set];
}

/** A dollar amount in the visitor's currency, as text. */
export function usePrice(usd: number): string {
  const locale = useLocale();
  const [currency] = useCurrency();
  return formatPrice(usd, currency, locale);
}

/** A dollar amount in the visitor's currency; crossfades when the currency changes. */
export function Price({ usd, className }: { usd: number; className?: string }) {
  const locale = useLocale();
  const [currency] = useCurrency();
  return (
    <span className={cn("inline-grid", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={currency}
          dir="ltr"
          className="col-start-1 row-start-1 whitespace-nowrap"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          {formatPrice(usd, currency, locale)}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

const LABELS: Record<"en" | "ar", Record<Currency, string>> = {
  en: { usd: "USD", dzd: "DZD" },
  ar: { usd: "دولار", dzd: "دينار" },
};

/** USD | DZD toggle; the choice is shared by every price on the site. */
export function CurrencySwitch({ className, tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  const locale = useLocale();
  const [currency, setCurrency] = useCurrency();
  const id = useId();
  return (
    <div
      role="group"
      aria-label={locale === "ar" ? "العملة" : "Currency"}
      className={cn(
        "inline-flex h-9 items-center rounded-full border p-1 text-[13px] font-medium",
        tone === "dark" ? "border-white/20 bg-white/10" : "border-foreground/15 bg-white/50",
        className,
      )}
    >
      {(["usd", "dzd"] as const).map((c) => (
        <button
          key={c}
          type="button"
          aria-pressed={currency === c}
          onClick={() => setCurrency(c)}
          className={cn(
            "relative h-full rounded-full px-3 transition-colors duration-200",
            currency === c
              ? tone === "dark"
                ? "text-primary"
                : "text-background"
              : tone === "dark"
                ? "text-white/70 hover:text-white"
                : "text-foreground/70 hover:text-foreground",
          )}
        >
          {currency === c ? (
            <motion.span
              layoutId={`currency-${id}`}
              className={cn("absolute inset-0 rounded-full", tone === "dark" ? "bg-white" : "bg-foreground")}
              transition={{ type: "spring", stiffness: 500, damping: 40 }}
            />
          ) : null}
          <span className="relative">{LABELS[locale][c]}</span>
        </button>
      ))}
    </div>
  );
}
