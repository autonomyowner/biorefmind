import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, FlaskConical, Gauge, Recycle, Wheat, type LucideIcon } from "lucide-react";

import { Reveal } from "@/components/landing/reveal";
import { cn } from "@/lib/utils";
import type { LandingMessages } from "@/components/landing/messages";
import type { Locale } from "@/i18n/locale";
import { Headline, SectionBadge } from "@/components/landing/section-badge";

const FACTS: { icon: LucideIcon; value: string }[] = [
  { icon: FlaskConical, value: "80–100" },
  { icon: Wheat, value: "50–79" },
  { icon: Recycle, value: "0–49" },
  { icon: Gauge, value: "0–100" },
];

/**
 * Routes: text and checklist on the left; a preview of the dashboard on the right.
 * Arabic pages show the owner's Arabic dashboard picture; English pages a coded preview in the same style.
 */
export function RoutesSection({ t, locale }: { t: LandingMessages["routes"]; locale: Locale }) {
  return (
    <section id="routes" className="relative scroll-mt-6 overflow-hidden py-24 sm:py-32">
      <div className="relative mx-auto grid max-w-[1440px] items-center gap-16 px-5 sm:px-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14 lg:px-16">
        <Reveal>
          <SectionBadge>{t.eyebrow}</SectionBadge>
          <h2 className="mt-6 text-balance text-[40px] font-semibold leading-[1.04] tracking-[-0.035em] sm:text-[54px]">
            <Headline lead={t.titleLead} accent={t.titleAccent} />
          </h2>
          <p className="mt-6 max-w-[500px] text-[17px] leading-relaxed text-muted-foreground">{t.body}</p>
          <ul className="mt-8 space-y-3.5">
            {t.checks.map((c) => (
              <li key={c} className="flex items-start gap-3 text-[16px]">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-azure text-white">
                  <Check className="size-3" strokeWidth={3} />
                </span>
                {c}
              </li>
            ))}
          </ul>
          <Link
            href="/#quality"
            className="btn-navy group mt-10 inline-flex h-14 items-center gap-3.5 rounded-full ps-7 pe-9 text-[17px] font-semibold transition-[filter] hover:brightness-125"
          >
            <ArrowRight
              className="size-5 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
              strokeWidth={2.25}
            />
            {t.cta}
          </Link>
        </Reveal>

        <Reveal delay={0.1}>
          {locale === "ar" ? (
            // The dashboard panel cut out along its own rounded edge.
            <Image
              src="/art/dashboard-ar.png"
              alt={t.board.imageAlt}
              width={1333}
              height={829}
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="h-auto w-full drop-shadow-[0_40px_50px_rgba(63,108,242,0.3)]"
            />
          ) : (
            <DashboardPreview t={t.board} />
          )}
        </Reveal>
      </div>

      <Reveal className="mx-auto mt-16 max-w-[1100px] px-5 sm:mt-20 sm:px-10">
        <dl className="glass grid grid-cols-2 gap-y-10 rounded-[28px] py-10 md:grid-cols-4">
          {FACTS.map((f, i) => (
            <div
              key={f.value}
              className={cn(
                "flex flex-col items-center px-2 text-center",
                i > 0 && "md:border-s md:border-azure/20",
                i % 2 === 1 && "border-s border-azure/20",
              )}
            >
              <f.icon className="size-6 text-azure" strokeWidth={1.5} />
              {/* A range reads low to high in both languages. */}
              <dd dir="ltr" className="mt-3 text-[30px] font-semibold tracking-[-0.03em] tabular-nums sm:text-[34px]">
                {f.value}
              </dd>
              <dt className="mt-1 text-[14px] text-muted-foreground sm:text-[15px]">{t.facts[i]}</dt>
            </div>
          ))}
        </dl>
      </Reveal>
    </section>
  );
}

/* ---------- A still preview of the dashboard (example figures) ---------- */

// Monthly batches for the bar chart, as a share of the tallest bar.
const BARS = [0.46, 0.58, 0.52, 0.71, 0.83, 1];
// Route split A / B / C, in percent.
const SPLIT = [
  { pct: 48, className: "bg-violet" },
  { pct: 34, className: "bg-azure" },
  { pct: 18, className: "bg-[#2fc58a]" },
];

function DashboardPreview({ t }: { t: LandingMessages["routes"]["board"] }) {
  return (
    <figure
      aria-label={t.label}
      className="overflow-hidden rounded-[26px] border border-white/80 bg-card/80 shadow-[0_50px_100px_-50px_rgba(16,72,160,0.7)] backdrop-blur"
    >
      {/* Window bar. */}
      <div className="flex items-center gap-2 border-b border-border bg-white/50 px-5 py-3">
        <span className="size-2.5 rounded-full bg-[#f07b6c]" />
        <span className="size-2.5 rounded-full bg-[#f2c55c]" />
        <span className="size-2.5 rounded-full bg-[#5ccf86]" />
        <span dir="ltr" lang="en" className="ms-3 flex items-center gap-1.5 text-[12px] font-semibold text-[#08263f]">
          <Image src="/logo-mark.png" alt="" width={77} height={77} className="size-4" />
          BiorefMind
        </span>
      </div>

      <div className="p-5 sm:p-7">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-[17px] font-semibold">{t.title}</p>
          <p className="text-[12px] text-muted-foreground">{t.example}</p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {[
            { label: t.average, value: "84" },
            { label: t.scored, value: "126" },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl bg-background/70 p-4">
              <p className="text-[12px] text-muted-foreground">{k.label}</p>
              <p className="mt-1 text-[30px] font-semibold leading-none tracking-[-0.03em] tabular-nums">{k.value}</p>
            </div>
          ))}
        </div>

        {/* Bars rise left to right in both languages, like the months under them. */}
        <div dir="ltr" className="mt-5 rounded-2xl bg-background/70 p-4">
          {/* Bars are direct children of the fixed-height row so their % heights resolve. */}
          <div className="flex h-32 items-end gap-3 sm:h-40">
            {BARS.map((h, i) => (
              <div key={i} className="flex h-full flex-1 items-end justify-center">
                <div
                  className={cn(
                    "w-full max-w-9 rounded-t-lg",
                    i === BARS.length - 1
                      ? "bg-gradient-to-t from-violet to-[#a58cff] shadow-[0_10px_24px_-10px_rgba(123,92,240,0.8)]"
                      : "bg-gradient-to-t from-azure/80 to-[#9db6ff]",
                  )}
                  style={{ height: `${h * 100}%` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-3">
            {t.months.map((m) => (
              <span key={m} dir="auto" className="flex-1 truncate text-center text-[11px] text-muted-foreground">
                {m}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <p className="text-[12px] text-muted-foreground">{t.split}</p>
          <div className="mt-2 flex h-3 overflow-hidden rounded-full">
            {SPLIT.map((s) => (
              <span key={s.className} className={s.className} style={{ width: `${s.pct}%` }} />
            ))}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px]">
            {t.routes.map((r, i) => (
              <li key={r} className="flex items-center gap-1.5">
                <span className={cn("size-2 rounded-full", SPLIT[i].className)} />
                {r} <span dir="ltr" className="text-muted-foreground">{SPLIT[i].pct}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </figure>
  );
}
