"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useDashboard } from "@/components/dashboard/shell";
import { fill } from "@/components/dashboard/messages";
import { labtestsMessages, type LabtestsMessages } from "@/components/dashboard/labtests/labtests-messages";
import { localizeBackendError } from "@/i18n/backend-errors";
import { useLocale, useMessages } from "@/i18n/provider";
import { errorMessage } from "@/lib/errors";
import { formatDzd } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { pluralClass } from "@/components/dashboard/labtests/format";

export { inputToMs, todayInput } from "@/components/dashboard/labtests/format";

export const FIELD = "h-11 rounded-xl border-foreground/10 bg-white/90 px-3.5 text-[15px] focus-visible:border-azure/60 focus-visible:ring-azure/20";
export const AREA =
  "w-full resize-none rounded-xl border border-foreground/10 bg-white/90 px-3.5 py-2.5 text-[15px] outline-none focus-visible:border-azure/60 focus-visible:ring-3 focus-visible:ring-azure/20";
export const CARD = "min-w-0 rounded-2xl border border-white bg-white/70 p-4 shadow-[0_10px_24px_-20px_rgba(20,30,120,0.6)]";
export const PRIMARY = "btn-navy inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-[14px] font-semibold disabled:opacity-80";
export const QUIET =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-foreground/15 bg-white/60 px-4 text-[14px] font-medium transition-colors hover:bg-white disabled:opacity-60";

/** "1 working day", "3 أيام عمل", "11 يوم عمل": Arabic needs its plural classes. */
export function daysText(t: LabtestsMessages, n: number): string {
  return fill(t.days[pluralClass(n)], { n });
}

/** Lab prices are whole dinars: "4,000 DA" / "4,000 دج"; dates in the page's language. */
export function useLabFormat() {
  const locale = useLocale();
  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-DZ" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
  return {
    dzd: (n: number) => formatDzd(n, locale),
    date: (ms: number) => dateFmt.format(ms),
  };
}

/** A failed backend call as a toast, in the page's language. */
export function useFail() {
  const locale = useLocale();
  return (err: unknown) => toast.error(localizeBackendError(errorMessage(err), locale));
}

/** The guest preview cannot send anything: invite the visitor to sign up instead. */
export function useGuestToast() {
  const router = useRouter();
  const { workspace } = useDashboard();
  const t = useMessages(labtestsMessages);
  return () =>
    toast(t.guestToast, {
      action: { label: t.guestAction, onClick: () => router.push(`/signup?as=${workspace.kind}`) },
    });
}

export function Chip({ tone, children }: { tone: "green" | "blue" | "violet" | "grey" | "amber" | "red"; children: React.ReactNode }) {
  const tones = {
    green: "bg-[#dcf7ea] text-[#12a26a]",
    blue: "bg-[#e6edff] text-azure",
    violet: "bg-[#efe9ff] text-violet",
    grey: "bg-foreground/[0.06] text-muted-foreground",
    amber: "bg-[#fff1d6] text-[#a8620a]",
    red: "bg-destructive/10 text-destructive",
  };
  return <span className={cn("inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium", tones[tone])}>{children}</span>;
}

/** "tel:" href from a printed phone number. */
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;
