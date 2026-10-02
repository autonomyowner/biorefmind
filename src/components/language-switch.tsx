"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { saveLocale } from "@/i18n/actions";
import { LOCALE_COOKIE, type Locale } from "@/i18n/locale";
import { useLocale } from "@/i18n/provider";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Locale; label: string; lang: string }[] = [
  { value: "en", label: "EN", lang: "en" },
  { value: "ar", label: "عربي", lang: "ar" },
];

/** EN | عربي toggle. Saves the choice in a cookie and re-renders the page in place. */
export function LanguageSwitch({ className }: { className?: string }) {
  const router = useRouter();
  const locale = useLocale();
  const [shown, setShown] = useState<Locale>(locale);
  const [, startTransition] = useTransition();

  // Follow the page when it re-renders in the new language.
  const [seen, setSeen] = useState(locale);
  if (seen !== locale) {
    setSeen(locale);
    setShown(locale);
  }

  function change(next: Locale) {
    if (next === shown) return;
    setShown(next);
    startTransition(async () => {
      try {
        await saveLocale(next);
        router.refresh();
      } catch {
        // The server action failed: set the cookie here and reload instead.
        document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        window.location.reload();
      }
    });
  }

  return (
    <div
      role="group"
      aria-label={locale === "ar" ? "اللغة" : "Language"}
      className={cn("inline-flex h-11 items-center rounded-full border border-foreground/15 bg-white/40 p-1 text-[14px]", className)}
    >
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          lang={o.lang}
          aria-pressed={shown === o.value}
          onClick={() => change(o.value)}
          className={cn(
            "h-full rounded-full px-3 transition-colors duration-200",
            shown === o.value ? "bg-foreground text-background" : "text-foreground/70 hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
