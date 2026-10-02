import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  ClipboardCheck,
  Droplets,
  FlaskConical,
  Layers,
  Leaf,
  MapPin,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Reveal } from "@/components/landing/reveal";
import { Headline, SectionBadge } from "@/components/landing/section-badge";
import type { LandingMessages } from "@/components/landing/messages";
import type { Go } from "@/components/landing/go";

type Quality = LandingMessages["quality"];

// The example batch's readings, in the order of the messages' reading names.
const READINGS: { icon: LucideIcon; value: string; pts: string; width: string }[] = [
  { icon: Leaf, value: "19.4 %", pts: "+34", width: "85%" },
  { icon: Droplets, value: "10.8 %", pts: "+28", width: "70%" },
  { icon: ShieldAlert, value: "0.3 %", pts: "+30", width: "75%" },
];

// Icons for audit trail, certificates, AI assistant and team workspaces.
const TOOL_ICONS: LucideIcon[] = [ClipboardCheck, ShieldCheck, Bot, Users];

/** Quality you can trust: deep royal-blue section, feature cards beside a frosted score card. */
export function QualitySection({ t, go }: { t: Quality; go: Go }) {
  return (
    <section
      id="quality"
      className="relative scroll-mt-6 overflow-hidden bg-[radial-gradient(ellipse_55%_65%_at_72%_45%,rgba(98,120,255,0.38),transparent_70%),linear-gradient(160deg,#0a1650_0%,#0e2275_48%,#070f3c_100%)] py-24 text-primary-foreground sm:py-32"
    >
      {/* Thin light streaks across the corners, as in the design. Decorative and still. */}
      <svg aria-hidden className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 1600 900" preserveAspectRatio="none" fill="none">
        <path d="M820 0 C 1000 120, 1250 160, 1600 90" stroke="url(#q-streak)" strokeWidth="1.2" />
        <path d="M0 640 C 260 560, 520 600, 760 760" stroke="url(#q-streak)" strokeWidth="1" />
        <defs>
          <linearGradient id="q-streak" x1="0" x2="1">
            <stop offset="0" stopColor="#9db2ff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#b7c6ff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#9db2ff" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* minmax(0, …) so long lines can't stretch the columns past a phone screen. */}
      <div className="relative mx-auto grid max-w-[1440px] grid-cols-[minmax(0,1fr)] gap-14 px-5 sm:px-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center lg:gap-16 lg:px-16">
        <Reveal>
          <SectionBadge tone="dark">{t.eyebrow}</SectionBadge>
          <h2 className="mt-6 text-balance text-[38px] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-[54px]">
            <Headline lead={t.titleLead} accent={t.titleAccent} tone="dark" />
          </h2>
          <p className="mt-6 max-w-[520px] text-[17px] leading-relaxed text-[#c3cdf2]">{t.body}</p>

          <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
            {t.tools.map((tool, i) => {
              const Icon = TOOL_ICONS[i];
              return (
                <div
                  key={tool.title}
                  className="rounded-[22px] border border-white/12 bg-white/[0.05] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_25%,#7f96ff,#3d4fd6_60%,#2a2a9e)] text-white shadow-[0_10px_24px_-10px_rgba(90,110,255,0.9),inset_0_1px_0_rgba(255,255,255,0.35)]">
                      <Icon className="size-5" strokeWidth={1.8} />
                    </span>
                    <h3 className="text-[17px] font-semibold">{tool.title}</h3>
                  </div>
                  <p className="mt-3 text-[14px] leading-relaxed text-[#aebae6]">{tool.body}</p>
                </div>
              );
            })}
          </div>

          <Link
            href={go?.href ?? "/signup"}
            className="group mt-9 inline-flex h-14 items-center gap-3.5 rounded-full bg-gradient-to-r from-[#5b7cff] to-violet ps-7 pe-9 text-[17px] font-semibold text-white shadow-[0_16px_36px_-14px_rgba(110,100,255,0.9),inset_0_1px_0_rgba(255,255,255,0.3)] transition-[filter] hover:brightness-110 rtl:bg-gradient-to-l"
          >
            <ArrowRight
              className="size-5 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
              strokeWidth={2.25}
            />
            {go?.label ?? t.cta}
          </Link>
        </Reveal>

        <Reveal delay={0.1}>
          <ScoreCard t={t.card} />
        </Reveal>
      </div>
    </section>
  );
}

/** The example batch, scored: score and route tiles, the three readings, who signed it. */
function ScoreCard({ t }: { t: Quality["card"] }) {
  return (
    <div className="rounded-[32px] border border-white/70 bg-[linear-gradient(160deg,rgba(242,246,255,0.97),rgba(222,230,255,0.94))] p-5 text-card-foreground shadow-[0_50px_100px_-40px_rgba(20,30,120,0.9),0_0_0_8px_rgba(255,255,255,0.06)] sm:p-7">
      <div className="flex items-center justify-between gap-4">
        <p className="flex min-w-0 items-center gap-2 text-[14px] text-muted-foreground">
          <Layers className="size-4 shrink-0 text-azure" strokeWidth={1.8} />
          <span className="truncate">{t.shipment}</span>
        </p>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-white bg-white/80 px-3.5 py-1.5 text-[13px] font-medium shadow-[0_6px_16px_-10px_rgba(20,30,120,0.5)]">
          <span className="size-2 rounded-full bg-[#2fc58a]" /> {t.scored}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Score tile. */}
        <div className="rounded-[24px] border border-white bg-white/75 p-5 shadow-[0_14px_30px_-22px_rgba(20,30,120,0.6)]">
          <div className="flex items-start justify-between gap-3">
            <p dir="ltr" className="text-gradient text-[76px] font-bold leading-[0.9] tracking-[-0.05em] tabular-nums sm:text-[88px]">
              92
            </p>
            <p className="pt-1 text-end text-[13px] leading-snug text-muted-foreground">{t.scoreLabel}</p>
          </div>
          <p className="mt-4 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
            <span dir="ltr" className="inline-flex items-center gap-1 rounded-full bg-[#dcf7ea] px-2.5 py-1 text-[13px] font-semibold text-[#12a26a]">
              <ArrowUpRight className="size-3.5" strokeWidth={2.5} /> +8%
            </span>
            {t.trend}
          </p>
        </div>

        {/* Route tile. */}
        <div className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#1b2f94_0%,#26208a_60%,#3d2bb0_100%)] p-5 text-white shadow-[0_20px_40px_-18px_rgba(40,40,170,0.9),inset_0_1px_0_rgba(255,255,255,0.18)]">
          {/* A still arc in the corner, as in the design. */}
          <span aria-hidden className="absolute -bottom-10 -end-8 size-32 rounded-full border-[14px] border-[#6f7dff]/35" />
          <div className="relative flex h-full items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_25%,#a5b4ff,#5b6cf0_55%,#4a39c8)] shadow-[0_10px_24px_-8px_rgba(130,140,255,0.9),inset_0_1px_0_rgba(255,255,255,0.4)]">
              <FlaskConical className="size-6" strokeWidth={1.8} />
            </span>
            <div>
              <p className="text-[13px] text-white/70">{t.route}</p>
              <p className="text-[26px] font-semibold leading-tight">{t.routeValue}</p>
            </div>
          </div>
        </div>
      </div>

      <ul className="mt-4 space-y-3">
        {READINGS.map((r, i) => (
          <li
            key={t.readings[i]}
            className="flex items-center gap-4 rounded-[20px] border border-white bg-white/70 px-4 py-3.5 shadow-[0_10px_24px_-20px_rgba(20,30,120,0.6)]"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#e6edff] to-[#d9d6fb] text-azure">
              <r.icon className="size-5" strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold">{t.readings[i]}</p>
              <div className="mt-2 h-2 rounded-full bg-[#dfe5fb]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-azure to-violet rtl:bg-gradient-to-l"
                  style={{ width: r.width }}
                />
              </div>
            </div>
            <span dir="ltr" className="w-16 shrink-0 text-end text-[16px] font-semibold tabular-nums">
              {r.value}
            </span>
            <span dir="ltr" className="hidden shrink-0 rounded-full bg-[#e6edff] px-3 py-1 text-[13px] font-medium text-azure sm:inline">
              {r.pts} {t.pts}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center justify-between gap-4 rounded-[18px] bg-white/55 px-4 py-3 text-[14px] text-muted-foreground">
        <span className="flex items-center gap-2">
          <MapPin className="size-4 text-azure" strokeWidth={1.8} /> {t.signed}
        </span>
        <span className="flex items-center gap-2">
          <ScanLine className="size-4 text-azure" strokeWidth={1.8} /> {t.example}
        </span>
      </div>
    </div>
  );
}
