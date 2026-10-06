"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { motion } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Check,
  FlaskConical,
  HandCoins,
  Inbox,
  PackageSearch,
  Receipt,
  Sprout,
  type LucideIcon,
} from "lucide-react";

import { CountUp, FadeIn, Skeleton } from "@/components/motion";
import { RingCard, WeekCard } from "@/components/dashboard/insights/overview-cards";
import { pendingOfferCount } from "@/components/dashboard/frame/badges-count";
import { SAMPLE_LABS } from "@/components/dashboard/lab-directory";
import { labMessages } from "@/components/dashboard/lab/lab-messages";
import { useMonthStats } from "@/components/dashboard/lab/month-stats";
import { StatusChip, useLabQueue } from "@/components/dashboard/lab/ui";
import { DASH } from "@/components/dashboard/links";
import { useMyListings, useMyOffers, useOpenListings, useSales } from "@/components/dashboard/market";
import { dashboardMessages, fill } from "@/components/dashboard/messages";
import { pagesMessages } from "@/components/dashboard/pages-messages";
import { Panel } from "@/components/dashboard/profile-card";
import { useDashboard } from "@/components/dashboard/shell";
import { useDashHref } from "@/components/dashboard/use-dash-href";
import { useLocale, useMessages } from "@/i18n/provider";
import { api } from "@/lib/backend";
import { catalogLabels, residueLabel } from "@/lib/catalog-labels";
import { formatDzd, formatKg } from "@/lib/pricing";
import type { DirectoryLab } from "@/lib/types";
import { cn } from "@/lib/utils";
import { timeAgo } from "./time-ago";

// Design: docs/superpowers/specs/2026-10-06-dashboard-pages-design.md §4 (Overview)

const NAVY_CARD =
  "rounded-[28px] bg-[linear-gradient(135deg,#1b2f94_0%,#26208a_60%,#3d2bb0_100%)] p-5 text-white shadow-[0_24px_50px_-28px_rgba(40,40,170,0.9)] sm:p-6";
const LIFT = "transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_-22px_rgba(40,60,170,0.55)]";
const GRID = "grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-3";

/** The Overview for the account's type. */
export function OverviewPage() {
  const { workspace } = useDashboard();
  if (workspace.kind === "lab") return <LabOverview />;
  if (workspace.kind === "factory") return <FactoryOverview />;
  return <FarmOverview />;
}

/* ---------- Shared pieces ---------- */

function Greeting() {
  const { viewer, workspace, guest } = useDashboard();
  const t = useMessages(dashboardMessages);
  return (
    <FadeIn className="mb-6">
      {guest ? (
        <p className="mb-4 rounded-2xl border border-white/80 bg-white/60 px-4 py-2.5 text-[14px] text-[#24366a]">{t.guestBanner}</p>
      ) : null}
      <h1 className="text-[30px] font-semibold tracking-[-0.03em] sm:text-[36px]">{fill(t.hello, { name: viewer.name })}</h1>
      <p className="mt-1.5 text-[15px] text-muted-foreground">{t.sub[workspace.kind]}</p>
    </FadeIn>
  );
}

function Dash() {
  return <span className="opacity-50">–</span>;
}

/** A whole number that counts up, or a dash while loading. */
function Num({ value }: { value: number | undefined }) {
  return value === undefined ? <Dash /> : <CountUp value={value} />;
}

type Tile = { icon: LucideIcon; label: string; value: React.ReactNode; href: string; page: string };

/** Four figures; the first is the navy lead tile. Each has a round arrow to its page. */
function StatTiles({ tiles }: { tiles: Tile[] }) {
  const t = useMessages(pagesMessages);
  const href = useDashHref();
  return (
    <ul className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {tiles.map((s, i) => {
        const lead = i === 0;
        return (
          <FadeIn
            as="li"
            key={s.label}
            index={i + 1}
            className={cn("relative min-w-0 rounded-[24px] p-4 sm:p-5", LIFT, lead ? "btn-navy text-white" : "glass")}
          >
            <div className="flex items-start justify-between gap-2">
              <span className={cn("flex size-9 items-center justify-center rounded-full", lead ? "bg-white/12 text-white" : "orb")}>
                <s.icon className="size-4" strokeWidth={1.9} />
              </span>
              <Link
                href={href(s.href)}
                aria-label={fill(t.overview.goTo, { page: s.page })}
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors",
                  lead ? "bg-white text-[#04173a] hover:bg-white/85" : "border border-foreground/15 bg-white/70 hover:bg-white",
                )}
              >
                <ArrowUpRight className="size-4 rtl:-scale-x-100" />
              </Link>
            </div>
            <p className="mt-4 truncate text-[28px] leading-none font-semibold tracking-[-0.03em] tabular-nums sm:text-[34px]">{s.value}</p>
            <p className={cn("mt-2 truncate text-[13px]", lead ? "text-white/70" : "text-muted-foreground")}>{s.label}</p>
          </FadeIn>
        );
      })}
    </ul>
  );
}

type Next = { title: string; detail?: string; href: string; button: string } | null;

/** The single most urgent thing, with a button; otherwise a calm "All caught up". `undefined` = loading. */
function NextUp({ next, className }: { next: Next | undefined; className?: string }) {
  const t = useMessages(pagesMessages);
  const href = useDashHref();
  return (
    <section className={cn(NAVY_CARD, "flex min-h-[220px] flex-col", className)}>
      <p className="text-[13px] font-medium text-white/70">{t.overview.next.title}</p>
      {next === undefined ? (
        <div className="mt-4 space-y-2">
          <span className="block h-6 w-4/5 animate-pulse rounded-lg bg-white/15" />
          <span className="block h-4 w-1/2 animate-pulse rounded-lg bg-white/10" />
        </div>
      ) : next === null ? (
        <div className="mt-4 flex flex-1 flex-col">
          <motion.span
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.3 }}
            className="flex size-10 items-center justify-center rounded-full bg-white/15"
          >
            <Check className="size-5" strokeWidth={2.4} />
          </motion.span>
          <p className="mt-3 text-[20px] font-semibold">{t.overview.next.caughtUp}</p>
          <p className="mt-1 text-[14px] text-white/70">{t.overview.next.caughtUpBody}</p>
        </div>
      ) : (
        <div className="mt-3 flex flex-1 flex-col">
          <p className="text-[19px] leading-snug font-semibold">{next.title}</p>
          {next.detail ? <p className="mt-1.5 text-[14px] text-white/70">{next.detail}</p> : null}
          <div className="mt-auto pt-5">
            <Link
              href={href(next.href)}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[15px] font-semibold text-[#04173a] transition-colors hover:bg-white/85"
            >
              {next.button}
              <ArrowRight className="size-4 rtl:-scale-x-100" />
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

type Event = { key: string; icon: LucideIcon; text: string; at: number; chip?: React.ReactNode };

/** The last five events from data already loaded, each with a time ago. `undefined` = loading. */
function RecentActivity({ events, className }: { events: Event[] | undefined; className?: string }) {
  const t = useMessages(pagesMessages);
  const locale = useLocale();
  const [now] = useState(() => Date.now());
  return (
    <Panel title={t.overview.activity.title} className={cn("h-full", className)}>
      {events === undefined ? (
        <ul className="space-y-3">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex items-center gap-3">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <Skeleton className="h-4 flex-1 rounded-lg" />
            </li>
          ))}
        </ul>
      ) : events.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-azure/25 bg-white/40 px-4 py-6 text-center text-[14px] text-muted-foreground">
          {t.overview.activity.empty}
        </p>
      ) : (
        <ul className="divide-y divide-foreground/[0.06]">
          {events.slice(0, 5).map((e, i) => (
            <motion.li
              key={e.key}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.25 + i * 0.06 }}
              className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#e6edff] text-azure">
                <e.icon className="size-4" strokeWidth={1.9} />
              </span>
              <p className="min-w-0 flex-1 truncate text-[14px]">{e.text}</p>
              {e.chip}
              <span className="shrink-0 text-[12px] text-muted-foreground">{timeAgo(e.at, now, locale)}</span>
            </motion.li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/** Newest first. */
function newest(events: Event[]): Event[] {
  return [...events].sort((a, b) => b.at - a.at);
}

type Step = { label: string; done?: boolean; href?: string };

/** A short checklist; ticks come from the account's own data; open steps link to their page. */
function Steps({ steps, className }: { steps: Step[]; className?: string }) {
  const t = useMessages(dashboardMessages);
  const href = useDashHref();
  const done = steps.filter((s) => s.done).length;
  return (
    <Panel
      className={className}
      title={t.steps.title}
      action={<span className="text-[13px] text-muted-foreground">{fill(t.steps.progress, { done, total: steps.length })}</span>}
    >
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/70">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-azure to-violet rtl:bg-gradient-to-l"
          initial={{ width: 0 }}
          animate={{ width: `${(done / steps.length) * 100}%` }}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <ol className="grid gap-1 sm:grid-cols-2">
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
            </>
          );
          return (
            <li key={s.label}>
              {s.href && !s.done ? (
                <Link href={href(s.href)} className="flex items-center gap-3 rounded-xl px-2 py-2 text-[15px] transition-colors hover:bg-white/70">
                  {body}
                </Link>
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

/** Listed labs (same query as the directory, so it is shared). */
function useListedLabs(): DirectoryLab[] | undefined {
  const { guest } = useDashboard();
  const live = useQuery(api.labs.directory, guest ? "skip" : {}) as DirectoryLab[] | undefined;
  return guest ? SAMPLE_LABS : live;
}

/** The charts row and the Next up / activity row, staggered after the tiles. */
function Body({ next, events, steps }: { next: Next | undefined; events: Event[] | undefined; steps: Step[] }) {
  return (
    <>
      <div className={GRID}>
        <FadeIn index={5} className="min-w-0 lg:col-span-2">
          <WeekCard className="h-full" />
        </FadeIn>
        <FadeIn index={6} className="min-w-0">
          <RingCard className="h-full" />
        </FadeIn>
        <FadeIn index={7} className="min-w-0">
          <NextUp next={next} className="h-full" />
        </FadeIn>
        <FadeIn index={8} className="min-w-0 lg:col-span-2">
          <RecentActivity events={events} />
        </FadeIn>
      </div>
      <FadeIn index={9} className="mt-5">
        <Steps steps={steps} />
      </FadeIn>
    </>
  );
}

function useFormat() {
  const locale = useLocale();
  return {
    dzd: (n: number) => formatDzd(n, locale),
    kg: (n: number) => formatKg(n, locale),
    dzdKg: (n: number) => `${formatDzd(n, locale)}/${locale === "ar" ? "كغ" : "kg"}`,
  };
}

function useMonthStart(): number {
  const [start] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  });
  return start;
}

/* ---------- Farmer ---------- */

function FarmOverview() {
  const { workspace } = useDashboard();
  const t = useMessages(pagesMessages);
  const d = useMessages(dashboardMessages);
  const nav = d.nav.pages;
  const labels = useMessages(catalogLabels).residues;
  const f = useFormat();
  const listings = useMyListings();
  const sales = useSales();
  const labs = useListedLabs();
  const monthStart = useMonthStart();

  const open = listings?.filter((l) => l.status === "open");
  const salesMonth = sales?.filter((s) => s.side === "sold" && s.createdAt >= monthStart).length;

  // Next up: the oldest offer waiting for an answer on an open lot.
  let next: Next | undefined;
  if (open) {
    const pending = open
      .flatMap((l) => l.offers.filter((o) => o.status === "pending").map((o) => ({ o, l })))
      .sort((a, b) => a.o.createdAt - b.o.createdAt)[0];
    next = pending
      ? {
          title: fill(t.overview.next.farm, {
            name: pending.o.buyerName,
            total: f.dzd(pending.o.totalDzd),
            kg: f.kg(pending.o.quantityKg),
            residue: residueLabel(labels, pending.l),
          }),
          detail: pending.o.buyerRegion,
          href: DASH.listings,
          button: t.overview.next.farmButton,
        }
      : null;
  }

  const events: Event[] | undefined =
    listings && sales
      ? newest([
          ...sales
            .filter((s) => s.side === "sold")
            .map((s) => ({
              key: `s${s.saleId}`,
              icon: Receipt,
              text: fill(t.overview.activity.sold, { residue: residueLabel(labels, s), name: s.otherName }),
              at: s.createdAt,
            })),
          ...listings.flatMap((l) =>
            l.offers.map((o) => ({
              key: `o${o.offerId}`,
              icon: HandCoins,
              text: fill(t.overview.activity.offerIn, { name: o.buyerName, residue: residueLabel(labels, l) }),
              at: o.createdAt,
            })),
          ),
        ])
      : undefined;

  return (
    <>
      <Greeting />
      <StatTiles
        tiles={[
          { icon: Sprout, label: t.overview.tiles.openLots, value: <Num value={open?.length} />, href: DASH.listings, page: nav.listings },
          { icon: HandCoins, label: t.overview.tiles.pendingOffers, value: <Num value={listings ? pendingOfferCount(listings) : undefined} />, href: DASH.listings, page: nav.listings },
          { icon: Receipt, label: t.overview.tiles.salesMonth, value: <Num value={salesMonth} />, href: DASH.sales, page: nav.sales },
          { icon: FlaskConical, label: t.overview.tiles.labs, value: <Num value={labs?.length} />, href: `${DASH.labs}?tab=find`, page: nav.labs },
        ]}
      />
      <Body
        next={next}
        events={events}
        steps={[
          { label: d.steps.account, done: true },
          { label: d.steps.profile, done: Boolean(workspace.region && workspace.phone), href: DASH.settings },
          { label: d.steps.list, done: (listings?.length ?? 0) > 0, href: `${DASH.listings}?new=1` },
          { label: d.steps.findLab, href: `${DASH.labs}?tab=find` },
        ]}
      />
    </>
  );
}

/* ---------- Factory ---------- */

function FactoryOverview() {
  const { workspace } = useDashboard();
  const t = useMessages(pagesMessages);
  const d = useMessages(dashboardMessages);
  const nav = d.nav.pages;
  const labels = useMessages(catalogLabels).residues;
  const f = useFormat();
  const lots = useOpenListings();
  const offers = useMyOffers();
  const sales = useSales();
  const labs = useListedLabs();

  const waiting = offers?.filter((o) => o.status === "pending").length;
  const purchases = sales?.filter((s) => s.side === "bought").length;

  // Next up: the newest open lot in a residue the factory buys, else the newest open lot.
  let next: Next | undefined;
  if (lots) {
    const buys = workspace.buys ?? [];
    const lot = lots.find((l) => buys.includes(l.residue)) ?? lots[0];
    next = lot
      ? {
          title: fill(t.overview.next.factory, { kg: f.kg(lot.remainingKg), residue: residueLabel(labels, lot), price: f.dzdKg(lot.priceDzdPerKg) }),
          detail: fill(t.overview.next.factoryFrom, { name: lot.sellerName, region: lot.region }),
          href: DASH.browse,
          button: t.overview.next.factoryButton,
        }
      : null;
  }

  const events: Event[] | undefined =
    offers && sales
      ? newest([
          ...sales
            .filter((s) => s.side === "bought")
            .map((s) => ({
              key: `s${s.saleId}`,
              icon: Receipt,
              text: fill(t.overview.activity.bought, { residue: residueLabel(labels, s), name: s.otherName }),
              at: s.createdAt,
            })),
          ...offers.map((o) => ({
            key: `o${o.offerId}`,
            icon: HandCoins,
            text: fill(t.overview.activity.offerOut, { residue: residueLabel(labels, o), name: o.sellerName }),
            at: o.createdAt,
          })),
        ])
      : undefined;

  return (
    <>
      <Greeting />
      <StatTiles
        tiles={[
          { icon: PackageSearch, label: t.overview.tiles.lotsToBuy, value: <Num value={lots?.length} />, href: DASH.browse, page: nav.browse },
          { icon: HandCoins, label: t.overview.tiles.offersWaiting, value: <Num value={waiting} />, href: DASH.offers, page: nav.offers },
          { icon: Receipt, label: t.overview.tiles.purchases, value: <Num value={purchases} />, href: DASH.sales, page: nav.sales },
          { icon: FlaskConical, label: t.overview.tiles.labs, value: <Num value={labs?.length} />, href: DASH.labs, page: nav.labs },
        ]}
      />
      <Body
        next={next}
        events={events}
        steps={[
          { label: d.steps.account, done: true },
          { label: d.steps.buys, done: (workspace.buys?.length ?? 0) > 0, href: DASH.settings },
          { label: d.steps.firstOffer, done: (offers?.length ?? 0) > 0, href: DASH.browse },
          { label: d.steps.browseLabs, href: `${DASH.labs}?tab=find` },
          { label: d.steps.enterprise, href: DASH.settings },
        ]}
      />
    </>
  );
}

/* ---------- Lab ---------- */

function LabOverview() {
  const { workspace } = useDashboard();
  const t = useMessages(pagesMessages);
  const d = useMessages(dashboardMessages);
  const lt = useMessages(labMessages);
  const nav = d.nav.pages;
  const locale = useLocale();
  const rows = useLabQueue();
  const month = useMonthStats();
  const [now] = useState(() => Date.now());

  const paid = workspace.plan === "lab_paid" && (workspace.paidUntil ?? 0) > now;
  const targets = [
    { href: DASH.requests, page: nav.requests },
    { href: DASH.requests, page: nav.requests },
    { href: DASH.analytics, page: nav.analytics },
    { href: DASH.analytics, page: nav.analytics },
  ];

  // Next up: the oldest request waiting to be accepted or for its sample.
  let next: Next | undefined;
  if (rows) {
    const r = rows.filter((x) => x.status === "requested" || x.status === "accepted").sort((a, b) => a.createdAt - b.createdAt)[0];
    next = r
      ? {
          title: fill(r.status === "requested" ? t.overview.next.labAccept : t.overview.next.labReceive, { name: r.clientName }),
          detail: fill(t.overview.next.labAnalyses, { count: r.analyses.length, total: formatDzd(r.totalDzd, locale) }),
          href: DASH.requests,
          button: t.overview.next.labButton,
        }
      : null;
  }

  const events: Event[] | undefined = rows
    ? newest(
        rows.map((r) => ({
          key: r.requestId,
          icon: r.status === "released" ? BadgeCheck : Inbox,
          text: fill(t.overview.activity.request, { name: r.clientName }),
          at: r.createdAt,
          chip: <StatusChip status={r.status} />,
        })),
      )
    : undefined;

  return (
    <>
      <Greeting />
      <StatTiles tiles={month.map((m, i) => ({ ...m, ...targets[i] }))} />
      <Body
        next={next}
        events={events}
        steps={[
          { label: d.steps.account, done: true },
          { label: d.steps.services, done: (workspace.services?.length ?? 0) > 0, href: DASH.settings },
          { label: lt.steps.prices, done: (workspace.prices?.length ?? 0) > 0, href: DASH.prices },
          { label: d.steps.visible, done: Boolean(workspace.listed), href: DASH.plan },
          { label: d.steps.paid, done: paid, href: DASH.plan },
        ]}
      />
    </>
  );
}
