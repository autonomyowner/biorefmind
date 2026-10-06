"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "motion/react";
import {
  BadgeCheck,
  CalendarClock,
  Check,
  EyeOff,
  FlaskConical,
  MapPin,
  PackageSearch,
  Percent,
  Send,
  Sprout,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { CountUp, FadeIn } from "@/components/motion";
import { CurrencySwitch, Price } from "@/components/currency";
import { useDashboard } from "@/components/dashboard/shell";
import { dashboardMessages, fill } from "@/components/dashboard/messages";
import { LabDirectory, SAMPLE_LABS } from "@/components/dashboard/lab-directory";
import { LabTests } from "@/components/dashboard/labtests/my-requests";
import { labMessages } from "@/components/dashboard/lab/lab-messages";
import { useMonthStats } from "@/components/dashboard/lab/month-stats";
import { LabQueue } from "@/components/dashboard/lab/queue";
import { LabSettings } from "@/components/dashboard/lab/settings";
import { BrowseListings, MyListings, MyOffers, SalesPanel, useMyListings, useMyOffers, useOpenListings } from "@/components/dashboard/market";
import { Panel, ProfileCard } from "@/components/dashboard/profile-card";
import { Spinner } from "@/components/ui/spinner";
import { localizeBackendError } from "@/i18n/backend-errors";
import { useLocale, useMessages } from "@/i18n/provider";
import { api } from "@/lib/backend";
import { errorMessage } from "@/lib/errors";
import { LAB_PRICE_USD } from "@/lib/pricing";
import type { DirectoryLab } from "@/lib/types";
import { cn } from "@/lib/utils";

const DAY = 86_400_000;
const TWO_COLS = "grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]";
const NAVY_CARD =
  "rounded-[28px] bg-[linear-gradient(135deg,#1b2f94_0%,#26208a_60%,#3d2bb0_100%)] p-5 text-white shadow-[0_24px_50px_-28px_rgba(40,40,170,0.9)] sm:p-6";

/** The right home for the account's type. */
export function DashboardHome() {
  const { workspace } = useDashboard();
  if (workspace.kind === "lab") return <LabHome />;
  if (workspace.kind === "factory") return <FactoryHome />;
  return <FarmHome />;
}

function Greeting() {
  const { viewer, workspace, guest } = useDashboard();
  const t = useMessages(dashboardMessages);
  return (
    <FadeIn className="mb-6">
      {guest ? (
        <p className="mb-4 rounded-2xl border border-white/80 bg-white/60 px-4 py-2.5 text-[14px] text-[#24366a]">{t.guestBanner}</p>
      ) : null}
      <p className="text-[14px] font-medium text-azure">{t.kinds[workspace.kind]}</p>
      <h1 className="mt-1 text-[30px] font-semibold tracking-[-0.03em] sm:text-[36px]">
        {fill(t.hello, { name: viewer.name })}
      </h1>
      <p className="mt-1.5 text-[15px] text-muted-foreground">{t.sub[workspace.kind]}</p>
    </FadeIn>
  );
}

/* ---------- Building blocks ---------- */

type Stat = { icon: LucideIcon; label: string; value: React.ReactNode };

/** A row of figures; numbers count up once. */
function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <ul className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {stats.map((s, i) => (
        <FadeIn
          as="li"
          key={s.label}
          index={i + 1}
          className="glass min-w-0 rounded-[22px] p-4 transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_-22px_rgba(40,60,170,0.55)] sm:p-5"
        >
          <span className="orb flex size-9 items-center justify-center rounded-full">
            <s.icon className="size-4" strokeWidth={1.9} />
          </span>
          <p className="mt-3 truncate text-[26px] font-semibold leading-none tracking-[-0.03em] tabular-nums sm:text-[30px]">{s.value}</p>
          <p className="mt-1.5 truncate text-[13px] text-muted-foreground">{s.label}</p>
        </FadeIn>
      ))}
    </ul>
  );
}

type Step = { label: string; done?: boolean; href?: string; soon?: boolean };

/** A short checklist; ticks come from the account's own data. */
function Steps({ steps }: { steps: Step[] }) {
  const t = useMessages(dashboardMessages);
  const done = steps.filter((s) => s.done).length;
  return (
    <Panel title={t.steps.title} action={<span className="text-[13px] text-muted-foreground">{fill(t.steps.progress, { done, total: steps.length })}</span>}>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/70">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-azure to-violet rtl:bg-gradient-to-l"
          initial={{ width: 0 }}
          animate={{ width: `${(done / steps.length) * 100}%` }}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <ol className="space-y-1">
        {steps.map((s) => {
          const body = (
            <>
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border",
                  s.done ? "border-transparent bg-azure text-white" : "border-foreground/20 bg-white/70",
                )}
              >
                {s.done ? <Check className="size-3.5" strokeWidth={3} /> : null}
              </span>
              <span className={cn("flex-1", s.done && "text-muted-foreground line-through decoration-foreground/25")}>{s.label}</span>
              {s.soon ? <span className="rounded-full bg-[#e6edff] px-2 py-0.5 text-[11px] font-medium text-azure">{t.steps.soon}</span> : null}
            </>
          );
          return (
            <li key={s.label}>
              {s.href && !s.done ? (
                <a href={s.href} className="flex items-center gap-3 rounded-xl px-2 py-2 text-[15px] transition-colors hover:bg-white/70">
                  {body}
                </a>
              ) : (
                <div className="flex items-center gap-3 px-2 py-2 text-[15px]">{body}</div>
              )}
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

/** Listed labs for the stat tiles (same query as the directory, so it is shared). */
function useListedLabs(): DirectoryLab[] | undefined {
  const { guest } = useDashboard();
  const live = useQuery(api.labs.directory, guest ? "skip" : {}) as DirectoryLab[] | undefined;
  return guest ? SAMPLE_LABS : live;
}

function LabCount() {
  const labs = useListedLabs();
  return labs ? <CountUp value={labs.length} /> : <Dash />;
}

function Dash() {
  return <span className="text-muted-foreground">–</span>;
}

/* ---------- Farmer ---------- */

function FarmHome() {
  const { workspace } = useDashboard();
  const t = useMessages(dashboardMessages);
  const listings = useMyListings();
  const open = listings?.filter((l) => l.status === "open").length;
  return (
    <>
      <Greeting />
      <StatStrip
        stats={[
          { icon: FlaskConical, label: t.stats.labsListed, value: <LabCount /> },
          { icon: Sprout, label: t.stats.yourOpen, value: open === undefined ? <Dash /> : <CountUp value={open} /> },
          { icon: Percent, label: t.stats.yourFee, value: <span dir="ltr">0%</span> },
          { icon: MapPin, label: t.stats.region, value: <span className="text-[20px] sm:text-[22px]">{workspace.region || "–"}</span> },
        ]}
      />
      <div className={TWO_COLS}>
        <FadeIn index={5}>
          <MyListings id="listings" />
        </FadeIn>
        <FadeIn index={6} className="space-y-5">
          <Steps
            steps={[
              { label: t.steps.account, done: true },
              { label: t.steps.profile, done: Boolean(workspace.region && workspace.phone) },
              { label: t.steps.list, done: (listings?.length ?? 0) > 0, href: "#listings" },
              { label: t.steps.findLab, href: "#labs" },
            ]}
          />
          <div className={NAVY_CARD}>
            <p className="flex items-center gap-2 text-[17px] font-semibold">
              <BadgeCheck className="size-5 text-[#a9bcff]" /> {t.farm.freeTitle}
            </p>
            <p className="mt-2 text-[14px] leading-relaxed text-white/75">{t.farm.freeBody}</p>
          </div>
        </FadeIn>
      </div>
      <FadeIn index={7} className={cn(TWO_COLS, "mt-5")}>
        <SalesPanel id="sales" />
        <ProfileCard title={t.profile.title} />
      </FadeIn>
      <FadeIn index={8} className="mt-5">
        <LabTests id="labtests" />
      </FadeIn>
      <FadeIn index={9} className="mt-5">
        <LabDirectory id="labs" title={t.directory.title} />
      </FadeIn>
    </>
  );
}

/* ---------- Lab ---------- */

function LabHome() {
  const { workspace } = useDashboard();
  const t = useMessages(dashboardMessages);
  const lt = useMessages(labMessages);
  const monthStats = useMonthStats();
  const [now] = useState(() => Date.now());

  const paid = workspace.plan === "lab_paid" && (workspace.paidUntil ?? 0) > now;
  const trial = !paid && workspace.plan === "lab_trial" && (workspace.trialEndsAt ?? 0) > now;
  const end = paid ? workspace.paidUntil! : trial ? workspace.trialEndsAt! : 0;
  const daysLeft = end ? Math.max(0, Math.ceil((end - now) / DAY)) : 0;

  // Lab workspace (queue, request detail, results, prices): src/components/dashboard/lab/*
  return (
    <>
      <Greeting />
      <StatStrip stats={monthStats} />
      <FadeIn index={5}>
        <LabQueue id="requests" />
      </FadeIn>
      <FadeIn index={6} className={cn(TWO_COLS, "mt-5")}>
        <LabSettings id="prices" />
        <div className="self-start">
          <Steps
            steps={[
              { label: t.steps.account, done: true },
              { label: t.steps.services, done: (workspace.services?.length ?? 0) > 0, href: "#profile" },
              { label: lt.steps.prices, done: (workspace.prices?.length ?? 0) > 0, href: "#prices" },
              { label: t.steps.visible, done: Boolean(workspace.listed) },
              { label: t.steps.paid, done: paid, href: "#plan" },
            ]}
          />
        </div>
      </FadeIn>
      <div className={cn(TWO_COLS, "mt-5")}>
        <FadeIn index={7}>
          <ProfileCard id="profile" title={t.profile.publicTitle} />
        </FadeIn>
        <FadeIn index={8}>
          <LabPlanCard paid={paid} trial={trial} end={end} daysLeft={daysLeft} />
        </FadeIn>
      </div>
    </>
  );
}

export function LabPlanCard({ paid, trial, end, daysLeft }: { paid: boolean; trial: boolean; end: number; daysLeft: number }) {
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
    <section id="plan" className={cn(NAVY_CARD, "scroll-mt-24 sm:p-7")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-white/70">{t.lab.planTitle}</p>
        <CurrencySwitch tone="dark" />
      </div>
      <p className="mt-4 flex items-baseline gap-2">
        <Price usd={LAB_PRICE_USD} className="text-[44px] font-semibold leading-none tracking-[-0.04em]" />
        <span className="text-[14px] text-white/70">{t.lab.perMonth}</span>
      </p>
      <p className="mt-5 flex items-start gap-2 text-[18px] font-semibold leading-snug">
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
      <p
        className={cn(
          "mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium",
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
    </section>
  );
}

/* ---------- Factory ---------- */

function FactoryHome() {
  const { workspace } = useDashboard();
  const t = useMessages(dashboardMessages);
  const offers = useMyOffers();
  const lots = useOpenListings();
  return (
    <>
      <Greeting />
      <StatStrip
        stats={[
          { icon: PackageSearch, label: t.stats.openLots, value: lots === undefined ? <Dash /> : <CountUp value={lots.length} /> },
          { icon: FlaskConical, label: t.stats.labsListed, value: <LabCount /> },
          { icon: Sprout, label: t.stats.buys, value: <CountUp value={workspace.buys?.length ?? 0} /> },
          { icon: Percent, label: t.stats.platformFee, value: <span dir="ltr">5%</span> },
        ]}
      />
      <FadeIn index={5}>
        <BrowseListings id="browse" />
      </FadeIn>
      <FadeIn index={6} className={cn(TWO_COLS, "mt-5")}>
        <MyOffers id="offers" />
        <Steps
          steps={[
            { label: t.steps.account, done: true },
            { label: t.steps.buys, done: (workspace.buys?.length ?? 0) > 0 },
            { label: t.steps.firstOffer, done: (offers?.length ?? 0) > 0, href: "#browse" },
            { label: t.steps.browseLabs, href: "#labs" },
            { label: t.steps.enterprise, href: "#enterprise" },
          ]}
        />
      </FadeIn>
      <FadeIn index={7} className={cn(TWO_COLS, "mt-5")}>
        <SalesPanel id="sales" />
        <ProfileCard title={t.profile.title} />
      </FadeIn>
      <FadeIn index={8} className="mt-5">
        <LabTests id="labtests" />
      </FadeIn>
      <FadeIn index={9} className={cn(TWO_COLS, "mt-5")}>
        <LabDirectory id="labs" title={t.directory.titleFactory} />
        <EnterpriseCard />
      </FadeIn>
    </>
  );
}

export function EnterpriseCard() {
  const { workspace, guest } = useDashboard();
  const t = useMessages(dashboardMessages);
  const locale = useLocale();
  const send = useMutation(api.enterprise.request);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (guest) return;
    setBusy(true);
    try {
      await send({ companyId: workspace.companyId, message });
      toast.success(t.factory.enterpriseThanks);
      setMessage("");
      setSent(true);
    } catch (err) {
      toast.error(localizeBackendError(errorMessage(err), locale));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      id="enterprise"
      className="scroll-mt-24 self-start rounded-[28px] bg-[linear-gradient(160deg,#0a1650_0%,#0e2275_55%,#1b1d7a_100%)] p-5 text-white shadow-[0_24px_50px_-28px_rgba(20,30,120,0.9)] sm:p-7"
    >
      <h2 className="text-[19px] font-semibold">{t.factory.enterpriseTitle}</h2>
      <p className="mt-2 text-[14px] leading-relaxed text-[#c3cdf2]">{t.factory.enterpriseBody}</p>
      {sent ? (
        <motion.p
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-5 flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-[15px]"
        >
          <BadgeCheck className="size-5 text-[#a9bcff]" /> {t.factory.enterpriseThanks}
        </motion.p>
      ) : (
        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={1000}
            aria-label={t.factory.enterpriseTitle}
            placeholder={t.factory.enterprisePlaceholder}
            className="w-full resize-none rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-[15px] text-white outline-none placeholder:text-white/45 focus-visible:border-[#a9bcff] focus-visible:ring-2 focus-visible:ring-[#a9bcff]/30"
          />
          <button
            type="submit"
            disabled={busy || guest}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-[#5b7cff] to-violet px-6 text-[15px] font-semibold shadow-[0_14px_30px_-12px_rgba(110,100,255,0.9)] transition-transform hover:-translate-y-0.5 disabled:opacity-80 rtl:bg-gradient-to-l"
          >
            {busy ? <Spinner size="sm" label={null} /> : <Send className="size-4 rtl:-scale-x-100" />}
            {t.factory.enterpriseSend}
          </button>
        </form>
      )}
    </section>
  );
}
