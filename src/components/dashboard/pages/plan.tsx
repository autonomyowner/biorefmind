"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { CalendarClock, EyeOff } from "lucide-react";

import { CurrencySwitch, Price } from "@/components/currency";
import { FadeIn } from "@/components/motion";
import { dashboardMessages, fill } from "@/components/dashboard/messages";
import { pagesMessages } from "@/components/dashboard/pages-messages";
import { useDashboard } from "@/components/dashboard/shell";
import { useLocale, useMessages } from "@/i18n/provider";
import { LAB_PRICE_USD } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { PageHeader } from "./page-header";

const DAY = 86_400_000;

/** Plan (lab): price, trial or paid period, directory visibility. */
export function PlanPage() {
  const { workspace } = useDashboard();
  const t = useMessages(pagesMessages);
  const nav = useMessages(dashboardMessages).nav.pages;
  const [now] = useState(() => Date.now());
  const paid = workspace.plan === "lab_paid" && (workspace.paidUntil ?? 0) > now;
  const trial = !paid && workspace.plan === "lab_trial" && (workspace.trialEndsAt ?? 0) > now;
  const end = paid ? workspace.paidUntil! : trial ? workspace.trialEndsAt! : 0;
  const daysLeft = end ? Math.max(0, Math.ceil((end - now) / DAY)) : 0;
  return (
    <>
      <PageHeader title={nav.plan} description={t.headers.plan} />
      <FadeIn index={1}>
        <LabPlanCard paid={paid} trial={trial} end={end} daysLeft={daysLeft} />
      </FadeIn>
    </>
  );
}

function LabPlanCard({ paid, trial, end, daysLeft }: { paid: boolean; trial: boolean; end: number; daysLeft: number }) {
  const { workspace } = useDashboard();
  const t = useMessages(dashboardMessages);
  const locale = useLocale();
  const date = (ms: number) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-DZ" : "en-GB", { day: "numeric", month: "long", year: "numeric" }).format(ms);

  const status = paid
    ? fill(t.lab.paid, { date: date(end) })
    : trial
      ? daysLeft <= 1
        ? t.lab.trialLastDay
        : fill(t.lab.trial, { days: daysLeft })
      : t.lab.hidden;
  // How much of the current period is left (trial: 14 days; paid: shown against a month).
  const span = trial ? 14 : 30;
  const left = paid || trial ? Math.min(1, daysLeft / span) : 0;

  return (
    <section className="grid gap-6 rounded-[28px] bg-[linear-gradient(135deg,#1b2f94_0%,#26208a_60%,#3d2bb0_100%)] p-5 text-white shadow-[0_24px_50px_-28px_rgba(40,40,170,0.9)] sm:p-7 lg:grid-cols-2 lg:gap-10">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-white/70">{t.lab.planTitle}</p>
          <CurrencySwitch tone="dark" />
        </div>
        <p className="mt-4 flex items-baseline gap-2">
          <Price usd={LAB_PRICE_USD} className="text-[44px] leading-none font-semibold tracking-[-0.04em]" />
          <span className="text-[14px] text-white/70">{t.lab.perMonth}</span>
        </p>
        <p className="mt-5 flex items-start gap-2 text-[18px] leading-snug font-semibold">
          {workspace.listed ? (
            <CalendarClock className="mt-0.5 size-5 shrink-0 text-[#a9bcff]" />
          ) : (
            <EyeOff className="mt-0.5 size-5 shrink-0 text-[#ffb4a8]" />
          )}
          {status}
        </p>
        {paid || trial ? (
          <>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
              <motion.div
                className="h-full rounded-full bg-[#a9bcff]"
                initial={{ width: 0 }}
                animate={{ width: `${left * 100}%` }}
                transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <p className="mt-2 text-[13px] text-white/65">{fill(paid ? t.lab.planEnds : t.lab.trialEnds, { date: date(end) })}</p>
          </>
        ) : null}
      </div>
      <div>
        <p
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium",
            workspace.listed ? "bg-[#dcf7ea] text-[#12a26a]" : "bg-white/15 text-white/85",
          )}
        >
          <span className={cn("size-2 rounded-full", workspace.listed ? "bg-[#12a26a]" : "bg-white/60")} />
          {workspace.listed ? t.lab.visible : t.lab.notVisible}
        </p>
        <p className="mt-4 text-[14px] leading-relaxed text-white/70">{t.lab.planNote}</p>
        <div className="mt-5 rounded-2xl bg-white/10 p-4">
          <p className="text-[14px] font-semibold">{t.lab.renewTitle}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-white/70">{t.lab.renewBody}</p>
        </div>
      </div>
    </section>
  );
}
