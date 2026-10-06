"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  BellRing,
  Building2,
  CircleDollarSign,
  CreditCard,
  FlaskConical,
  HandCoins,
  Inbox,
  LayoutDashboard,
  Mail,
  Phone,
  Search,
  Sprout,
  Users,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { AppFrame, FrameSkeleton } from "@/components/app-frame";
import { CurrencySwitch, Price, useCurrency } from "@/components/currency";
import { CountUp, FadeIn } from "@/components/motion";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/backend";
import { errorMessage } from "@/lib/errors";
import { catalogLabels, residueLabel } from "@/lib/catalog-labels";
import { formatDzd, formatKg, formatPrice, LAB_PRICE_USD } from "@/lib/pricing";
import type { AdminOverview, AdminSales, Kind, Viewer } from "@/lib/types";
import { cn } from "@/lib/utils";

type Account = AdminOverview["accounts"][number];

const KIND: Record<Kind, string> = { farm: "Farmer", lab: "Lab", factory: "Factory" };
const KINDS: Record<Kind, string> = { farm: "Farmers", lab: "Labs", factory: "Factories" };
const KIND_ICON: Record<Kind, LucideIcon> = { farm: Sprout, lab: FlaskConical, factory: Building2 };
const DAY = 86_400_000;

function fmt(ms?: number) {
  return ms ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(ms) : "—";
}

/** When a lab's current period (trial or paid) ends. */
function labEnd(a: Account): number {
  return (a.plan === "lab_paid" ? a.paidUntil : a.trialEndsAt) ?? 0;
}

/** Plan status in plain words, as the admin needs it. */
function status(a: Account, now: number) {
  if (a.kind === "farm") return "Free";
  if (a.kind === "factory") return "Enterprise (custom)";
  if (a.plan === "lab_paid") return (a.paidUntil ?? 0) > now ? `Paid until ${fmt(a.paidUntil)}` : `Ended ${fmt(a.paidUntil)}`;
  if ((a.trialEndsAt ?? 0) > now) return `Trial, ${Math.ceil(((a.trialEndsAt ?? now) - now) / DAY)} days left`;
  return `Trial ended ${fmt(a.trialEndsAt)}`;
}

const NAV = [
  { href: "#top", label: "Overview", icon: LayoutDashboard },
  { href: "#accounts", label: "Accounts", icon: Users },
  { href: "#billing", label: "Lab billing", icon: CreditCard },
  { href: "#market", label: "Marketplace", icon: HandCoins },
  { href: "#labwork", label: "Lab requests", icon: FlaskConical },
  { href: "#requests", label: "Enterprise requests", icon: Inbox },
];

/** Admin dashboard: figures, sign-ups, accounts, lab billing, enterprise requests. Others see "Page not found". */
export function AdminPage() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const viewer = useQuery(api.users.viewer, isAuthenticated ? {} : "skip") as Viewer | undefined;
  const overview = useQuery(api.admin.overview, viewer?.isAdmin ? {} : "skip") as AdminOverview | undefined;
  const [now] = useState(() => Date.now());

  if (isLoading || (isAuthenticated && viewer === undefined)) return <FrameSkeleton />;
  if (!viewer?.isAdmin) {
    return (
      <main className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
        <h1 className="text-[22px] font-semibold">Page Not Found</h1>
        <Link href="/" className="text-[17px] text-azure">
          Home
        </Link>
      </main>
    );
  }

  return (
    <AppFrame
      items={NAV}
      menuLabel="Menu"
      closeLabel="Close menu"
      homeHref="/admin"
      brandSuffix=" · Admin"
      extra={
        <Link
          href="/dashboard"
          className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] text-foreground/80 transition-colors hover:bg-white/70"
        >
          <ArrowLeft className="size-[18px]" strokeWidth={1.8} />
          Back to dashboard
        </Link>
      }
      footer={
        <div className="rounded-2xl border border-white/80 bg-white/55 p-3 text-[13px]">
          <p className="truncate font-semibold">{viewer.name}</p>
          <p className="truncate text-muted-foreground">{viewer.email}</p>
        </div>
      }
      headerStart={<p className="truncate text-[15px] font-medium">Admin</p>}
      headerEnd={<CurrencySwitch />}
    >
      {!overview ? (
        <Spinner className="flex py-20" />
      ) : (
        <AdminBody overview={overview} now={now} />
      )}
    </AppFrame>
  );
}

function AdminBody({ overview, now }: { overview: AdminOverview; now: number }) {
  const { accounts, requests } = overview;
  const labs = accounts.filter((a) => a.kind === "lab");
  const paidLabs = labs.filter((a) => a.plan === "lab_paid" && (a.paidUntil ?? 0) > now).length;
  const trials = labs.filter((a) => a.plan === "lab_trial" && (a.trialEndsAt ?? 0) > now).length;
  const count = (k: Kind) => accounts.filter((a) => a.kind === k).length;

  // Labs whose period ends within 7 days, or ended in the last 14.
  const attention = labs
    .filter((a) => {
      const end = labEnd(a);
      return end > now - 14 * DAY && end < now + 7 * DAY;
    })
    .sort((a, b) => labEnd(a) - labEnd(b));

  const tiles: { icon: LucideIcon; label: string; value: React.ReactNode; note?: string }[] = [
    { icon: Users, label: "Accounts", value: <CountUp value={accounts.length} /> },
    { icon: Sprout, label: "Farmers", value: <CountUp value={count("farm")} /> },
    { icon: FlaskConical, label: "Labs", value: <CountUp value={labs.length} />, note: `${paidLabs} paid · ${trials} on trial` },
    { icon: Building2, label: "Factories", value: <CountUp value={count("factory")} /> },
  ];

  return (
    <>
      <FadeIn>
        <p className="text-[14px] font-medium text-azure">Admin</p>
        <h1 className="mt-1 text-[30px] font-semibold tracking-[-0.03em] sm:text-[36px]">Overview</h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground">Everything happening on BiorefMind, live.</p>
      </FadeIn>

      <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {tiles.map((s, i) => (
          <FadeIn
            as="li"
            key={s.label}
            index={i + 1}
            className="glass min-w-0 rounded-[22px] p-4 transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_-22px_rgba(40,60,170,0.55)] sm:p-5"
          >
            <span className="orb flex size-9 items-center justify-center rounded-full">
              <s.icon className="size-4" strokeWidth={1.9} />
            </span>
            <p className="mt-3 text-[30px] font-semibold leading-none tracking-[-0.03em] tabular-nums">{s.value}</p>
            <p className="mt-1.5 truncate text-[13px] text-muted-foreground">{s.label}</p>
            {s.note ? <p className="mt-0.5 truncate text-[12px] text-muted-foreground/80">{s.note}</p> : null}
          </FadeIn>
        ))}
      </ul>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <FadeIn index={5} className="glass rounded-[28px] p-5 sm:p-7">
          <SignupsChart accounts={accounts} now={now} />
        </FadeIn>
        <FadeIn index={6} className="rounded-[28px] bg-[linear-gradient(135deg,#1b2f94_0%,#26208a_60%,#3d2bb0_100%)] p-5 text-white shadow-[0_24px_50px_-28px_rgba(40,40,170,0.9)] sm:p-7">
          <p className="flex items-center gap-2 text-[13px] text-white/70">
            <CircleDollarSign className="size-4" /> Lab revenue per month
          </p>
          <Price usd={paidLabs * LAB_PRICE_USD} className="mt-3 text-[44px] font-semibold leading-none tracking-[-0.04em]" />
          <p className="mt-3 text-[14px] text-white/70">
            {paidLabs} paid {paidLabs === 1 ? "lab" : "labs"} × <Price usd={LAB_PRICE_USD} />
          </p>
          <p className="mt-1 text-[14px] text-white/70">
            If every trial converts: <Price usd={(paidLabs + trials) * LAB_PRICE_USD} className="font-semibold text-white" />
          </p>
          <p className="mt-5 rounded-2xl bg-white/10 px-4 py-3 text-[13px] leading-relaxed text-white/75">
            Fixed rate: $1 = 250 DA. Factories pay custom prices and the 5% deal fee, not counted here.
          </p>
        </FadeIn>
      </div>

      {attention.length > 0 ? (
        <FadeIn index={7} className="glass mt-5 rounded-[28px] p-5 sm:p-7">
          <h2 className="flex items-center gap-2 text-[19px] font-semibold">
            <BellRing className="size-5 text-violet" /> Needs attention
          </h2>
          <p className="mt-1 text-[14px] text-muted-foreground">Labs whose trial or plan ends within 7 days, or ended in the last 14.</p>
          <ul className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
            {attention.map((a) => (
              <li key={a.companyId} className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-white bg-white/70 p-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{a.name}</p>
                  <p className={cn("text-[13px]", labEnd(a) < now ? "text-destructive" : "text-muted-foreground")}>{status(a, now)}</p>
                </div>
                <ExtendButton companyId={a.companyId} months={1} />
              </li>
            ))}
          </ul>
        </FadeIn>
      ) : null}

      <AccountsSection accounts={accounts} now={now} />
      <BillingSection labs={labs} now={now} />
      <MarketSection />
      <LabWorkSection />
      <RequestsSection requests={requests} />
    </>
  );
}

/* ---------- Sign-ups chart ---------- */

/** New accounts per day over the last 30 days: one bar series, the split by type in the tooltip. */
function SignupsChart({ accounts, now }: { accounts: Account[]; now: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const days = useMemo(() => {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const first = start.getTime() - 29 * DAY;
    const out = Array.from({ length: 30 }, (_, i) => ({ day: first + i * DAY, farm: 0, lab: 0, factory: 0, total: 0 }));
    for (const a of accounts) {
      const i = Math.floor((a.createdAt - first) / DAY);
      if (i >= 0 && i < 30) {
        out[i][a.kind] += 1;
        out[i].total += 1;
      }
    }
    return out;
  }, [accounts, now]);
  const total = days.reduce((n, d) => n + d.total, 0);
  const max = Math.max(1, ...days.map((d) => d.total));
  const short = (ms: number) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(ms);
  const shown = hover === null ? null : days[hover];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-[19px] font-semibold">Sign-ups, last 30 days</h2>
          <p className="text-[14px] text-muted-foreground">New accounts per day</p>
        </div>
        <p className="text-[30px] font-semibold leading-none tracking-[-0.03em] tabular-nums">
          <CountUp value={total} />
        </p>
      </div>
      <div className="relative mt-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-foreground/10" />
        <span className="pointer-events-none absolute -top-2.5 end-0 bg-transparent text-[11px] text-muted-foreground">{max}</span>
        <div className="flex h-44 items-end gap-[2px]" onMouseLeave={() => setHover(null)}>
          {days.map((d, i) => (
            <button
              key={d.day}
              type="button"
              aria-label={`${short(d.day)}: ${d.total} sign-ups`}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="group flex h-full flex-1 items-end focus-visible:outline-none"
            >
              <motion.span
                className={cn(
                  "block w-full origin-bottom rounded-t-[4px] transition-colors",
                  d.total === 0 ? "bg-foreground/10" : hover === i ? "bg-violet" : "bg-azure",
                )}
                style={{ height: d.total === 0 ? 2 : `${(d.total / max) * 100}%` }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.6, delay: 0.2 + i * 0.015, ease: [0.22, 1, 0.36, 1] }}
              />
            </button>
          ))}
        </div>
        <AnimatePresence>
          {shown ? (
            <motion.div
              key="tip"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute top-0 z-10 w-40 rounded-xl border border-white bg-card/95 p-3 text-[13px] shadow-lg backdrop-blur"
              style={{
                left: `clamp(0px, calc(${((hover! + 0.5) / 30) * 100}% - 5rem), calc(100% - 10rem))`,
              }}
            >
              <p className="font-semibold">{short(shown.day)}</p>
              <p className="mt-1 flex justify-between">
                <span className="text-muted-foreground">Total</span> <span className="font-semibold tabular-nums">{shown.total}</span>
              </p>
              {(["farm", "lab", "factory"] as const).map((k) => (
                <p key={k} className="flex justify-between">
                  <span className="text-muted-foreground">{KINDS[k]}</span> <span className="tabular-nums">{shown[k]}</span>
                </p>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>
        <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
          <span>{short(days[0].day)}</span>
          <span>{short(days[15].day)}</span>
          <span>Today</span>
        </div>
      </div>
    </>
  );
}

/* ---------- Accounts ---------- */

function AccountsSection({ accounts, now }: { accounts: Account[]; now: number }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<Kind | null>(null);
  const q = query.trim().toLowerCase();
  const rows = accounts.filter(
    (a) =>
      (!kind || a.kind === kind) &&
      (!q || [a.name, a.ownerEmail, a.region, a.phone].some((f) => f.toLowerCase().includes(q))),
  );

  return (
    <section id="accounts" className="glass mt-5 scroll-mt-24 overflow-hidden rounded-[28px]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-7 sm:pt-7">
        <h2 className="text-[19px] font-semibold">
          Accounts <span className="text-muted-foreground tabular-nums">· {rows.length}</span>
        </h2>
        <label className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, region, phone"
            aria-label="Search accounts"
            className="h-10 w-full rounded-full border border-foreground/15 bg-white/80 ps-9 pe-4 text-[14px] outline-none focus-visible:border-azure/60 focus-visible:ring-2 focus-visible:ring-azure/20"
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 px-5 sm:px-7">
        {([null, "farm", "lab", "factory"] as const).map((k) => (
          <button
            key={k ?? "all"}
            type="button"
            aria-pressed={kind === k}
            onClick={() => setKind(k)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
              kind === k ? "border-transparent bg-primary text-primary-foreground" : "border-foreground/15 bg-white/70 hover:border-azure/50",
            )}
          >
            {k ? KINDS[k] : "All"}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="px-7 py-10 text-center text-[15px] text-muted-foreground">No accounts match.</p>
      ) : (
        <>
          {/* Phones: one card per account. */}
          <ul className="mt-4 space-y-3 px-5 pb-5 md:hidden">
            {rows.map((a) => {
              const Icon = KIND_ICON[a.kind];
              return (
                <li key={a.companyId} className="rounded-2xl border border-white bg-white/70 p-4">
                  <div className="flex items-start gap-3">
                    <span className="orb flex size-9 shrink-0 items-center justify-center rounded-full">
                      <Icon className="size-4" strokeWidth={1.9} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{a.name}</p>
                      <p className="truncate text-[13px] text-muted-foreground">{a.ownerEmail}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#e6edff] px-2.5 py-0.5 text-[12px] font-medium text-azure">{KIND[a.kind]}</span>
                  </div>
                  <p className="mt-3 text-[13px] text-muted-foreground">
                    {a.region} · <span dir="ltr">{a.phone}</span> · joined {fmt(a.createdAt)}
                  </p>
                  <p className={cn("mt-1 text-[13px] font-medium", a.kind === "lab" && !a.listed && "text-destructive")}>{status(a, now)}</p>
                </li>
              );
            })}
          </ul>
          {/* Wider screens: a table. */}
          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[820px] text-left text-[14px]">
              <thead className="border-y border-border bg-white/40 text-[12px] uppercase tracking-[0.08em] text-muted-foreground">
                <tr>
                  <th className="px-7 py-3 font-medium">Type</th>
                  <th className="px-3 py-3 font-medium">Name</th>
                  <th className="px-3 py-3 font-medium">Owner</th>
                  <th className="px-3 py-3 font-medium">Region · Phone</th>
                  <th className="px-3 py-3 font-medium">Plan</th>
                  <th className="px-7 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.companyId} className="border-b border-border/70 transition-colors last:border-0 hover:bg-white/40">
                    <td className="px-7 py-3">
                      <span className="rounded-full bg-[#e6edff] px-2.5 py-1 text-[12px] font-medium text-azure">{KIND[a.kind]}</span>
                    </td>
                    <td className="max-w-[220px] truncate px-3 py-3 font-medium">{a.name}</td>
                    <td className="px-3 py-3">
                      <a href={`mailto:${a.ownerEmail}`} className="hover:text-azure">
                        {a.ownerEmail}
                      </a>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {a.region} · <span dir="ltr">{a.phone}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn(a.kind === "lab" && !a.listed && "text-destructive")}>{status(a, now)}</span>
                    </td>
                    <td className="px-7 py-3 text-muted-foreground">{fmt(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

/* ---------- Lab billing ---------- */

function BillingSection({ labs, now }: { labs: Account[]; now: number }) {
  const sorted = [...labs].sort((a, b) => labEnd(a) - labEnd(b));
  return (
    <section id="billing" className="glass mt-5 scroll-mt-24 rounded-[28px] p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-semibold">Lab billing</h2>
          <p className="mt-1 max-w-[560px] text-[14px] text-muted-foreground">
            When a lab pays, add the months it paid for. Months are added after its current trial or plan, so nobody loses days.
            Price: <Price usd={LAB_PRICE_USD} className="font-semibold text-foreground" /> a month.
          </p>
        </div>
      </div>
      {sorted.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-white/50 px-4 py-6 text-center text-[15px] text-muted-foreground">No labs yet.</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {sorted.map((a) => (
            <LabBillingRow key={a.companyId} lab={a} now={now} />
          ))}
        </ul>
      )}
    </section>
  );
}

function LabBillingRow({ lab, now }: { lab: Account; now: number }) {
  const end = labEnd(lab);
  const left = Math.max(0, Math.ceil((end - now) / DAY));
  const span = lab.plan === "lab_trial" ? 14 : 30;
  return (
    <li className="rounded-2xl border border-white bg-white/70 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold">{lab.name}</p>
          <p className="truncate text-[13px] text-muted-foreground">
            {lab.ownerEmail} · <span dir="ltr">{lab.phone}</span>
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium",
            lab.listed ? "bg-[#dcf7ea] text-[#12a26a]" : "bg-[#fde7e4] text-destructive",
          )}
        >
          <span className={cn("size-1.5 rounded-full", lab.listed ? "bg-[#12a26a]" : "bg-destructive")} />
          {lab.listed ? "Listed" : "Hidden"}
        </span>
      </div>
      <p className="mt-2 text-[14px]">{status(lab, now)}</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/10">
        <motion.div
          className={cn("h-full rounded-full", left <= 3 ? "bg-violet" : "bg-azure")}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(1, left / span) * 100}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {[1, 3, 12].map((m) => (
          <ExtendButton key={m} companyId={lab.companyId} months={m} />
        ))}
        <CustomDate companyId={lab.companyId} />
        {lab.listed ? <EndPlan companyId={lab.companyId} name={lab.name} /> : null}
      </div>
    </li>
  );
}

/** "+N months · $price": records a payment of N months. */
function ExtendButton({ companyId, months }: { companyId: Account["companyId"]; months: number }) {
  const extend = useMutation(api.admin.extendLab);
  const [currency] = useCurrency();
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try {
      const { paidUntil } = await extend({ companyId, months });
      toast.success(`Paid until ${fmt(paidUntil)}.`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      type="button"
      onClick={go}
      disabled={busy}
      className="btn-navy inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold transition-transform hover:-translate-y-0.5 disabled:opacity-80"
    >
      {busy ? <Spinner size="sm" label={null} /> : null}+{months} {months === 1 ? "month" : "months"}
      <span className="font-normal opacity-70">· {formatPrice(months * LAB_PRICE_USD, currency, "en")}</span>
    </button>
  );
}

/** Date input + "Set": the lab is paid until the end of that day. */
function CustomDate({ companyId }: { companyId: Account["companyId"] }) {
  const setPaid = useMutation(api.admin.setLabPaidUntil);
  const [date, setDate] = useState(() => new Date(Date.now() + 30 * DAY).toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!date) return;
    setBusy(true);
    try {
      await setPaid({ companyId, paidUntil: new Date(`${date}T23:59:59`).getTime() });
      toast.success(`Paid until ${fmt(new Date(`${date}T23:59:59`).getTime())}.`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-foreground/15 bg-white/80 p-0.5 ps-3">
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        aria-label="Paid until"
        className="h-8 bg-transparent text-[13px] outline-none"
      />
      <button type="button" onClick={save} disabled={busy} className="h-8 rounded-full bg-foreground/5 px-3 text-[13px] font-medium hover:bg-foreground/10">
        {busy ? "…" : "Set"}
      </button>
    </span>
  );
}

/** Two clicks to hide a lab now. */
function EndPlan({ companyId, name }: { companyId: Account["companyId"]; name: string }) {
  const end = useMutation(api.admin.endLabPlan);
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  async function go() {
    if (!armed) return setArmed(true);
    setBusy(true);
    try {
      await end({ companyId });
      toast.success(`${name} is hidden from the directory.`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
      setArmed(false);
    }
  }
  return (
    <button
      type="button"
      onClick={go}
      onBlur={() => setArmed(false)}
      disabled={busy}
      className={cn(
        "inline-flex h-9 items-center rounded-full border px-4 text-[13px] font-medium transition-colors",
        armed ? "border-transparent bg-destructive text-white" : "border-destructive/30 text-destructive hover:bg-destructive/5",
      )}
    >
      {busy ? "…" : armed ? "Confirm: end plan" : "End plan"}
    </button>
  );
}

/* ---------- Marketplace ---------- */

const RESIDUE_EN: Record<string, string> = catalogLabels.en.residues;
const ANALYSIS_EN: Record<string, string> = catalogLabels.en.analyses;

/** Every sale and the 5% fees buyers owe; billing them is piece 4. Amounts in dinars. */
/** A phone number under a name, as a tap-to-call link. */
function TelLink({ phone }: { phone: string }) {
  if (!phone) return null;
  return (
    <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} dir="ltr" className="mt-0.5 flex items-center gap-1 text-[13px] text-azure">
      <Phone className="size-3" /> {phone}
    </a>
  );
}

const LAB_STATUS: Record<string, string> = {
  requested: "Waiting for the lab",
  accepted: "Accepted, sample expected",
  declined: "Declined",
  received: "Sample received",
  released: "Results released",
  cancelled: "Cancelled",
  expired: "Expired",
  lab_unavailable: "Lab not listed",
};

/** The latest lab requests with both phones: BiorefMind arranges the sample between lab and farmer. */
function LabWorkSection() {
  const rows = useQuery(api.admin.labRequests, {});
  return (
    <section id="labwork" className="glass mt-5 scroll-mt-24 rounded-[28px] p-5 sm:p-7">
      <h2 className="text-[19px] font-semibold">Lab requests</h2>
      <p className="mt-1 text-[14px] text-muted-foreground">
        The latest 50. Labs never see a farmer&apos;s phone: call both to arrange the sample.
      </p>
      {!rows ? (
        <Spinner className="flex py-8" />
      ) : rows.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-white/50 px-4 py-6 text-center text-[15px] text-muted-foreground">No lab requests yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-white bg-white/60">
          <table className="w-full min-w-[720px] text-start text-[14px]">
            <thead className="text-[13px] text-muted-foreground">
              <tr className="border-b border-foreground/10">
                {["Date", "Client", "Lab", "Analyses", "Status", "Total"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-start font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.requestId} className="border-b border-foreground/5 align-top last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5">{fmt(r.createdAt)}</td>
                  <td className="px-4 py-2.5">
                    {r.client} <span className="text-muted-foreground">· {r.clientKind === "farm" ? "Farmer" : "Factory"}</span>
                    <TelLink phone={r.clientPhone} />
                  </td>
                  <td className="px-4 py-2.5">
                    {r.lab}
                    <TelLink phone={r.labPhone} />
                  </td>
                  <td className="px-4 py-2.5">{r.analyses.map((a) => ANALYSIS_EN[a] ?? a).join(", ")}</td>
                  <td className="px-4 py-2.5">{LAB_STATUS[r.status] ?? r.status}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">{formatDzd(r.totalDzd, "en")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function MarketSection() {
  const sales = useQuery(api.admin.sales, {}) as AdminSales | undefined;
  const figures = sales
    ? [
        { label: "Sales", value: <CountUp value={sales.count} /> },
        { label: "Value traded", value: formatDzd(sales.totalDzd, "en") },
        { label: "Fees owed by buyers (5%)", value: formatDzd(sales.feeDzd, "en") },
      ]
    : [];
  return (
    <section id="market" className="glass mt-5 scroll-mt-24 rounded-[28px] p-5 sm:p-7">
      <h2 className="text-[19px] font-semibold">Marketplace</h2>
      <p className="mt-1 text-[14px] text-muted-foreground">
        Accepted offers between farmers and factories. Only BiorefMind sees the phones: call both sides to arrange pickup and
        payment. Fees are not billed yet.
      </p>
      {!sales ? (
        <Spinner className="flex py-8" />
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))]">
            {figures.map((f) => (
              <div key={f.label} className="min-w-0 rounded-2xl border border-white bg-white/70 p-4">
                <dt className="text-[13px] text-muted-foreground">{f.label}</dt>
                <dd className="mt-1 truncate text-[24px] font-semibold tracking-[-0.02em] tabular-nums">{f.value}</dd>
              </div>
            ))}
          </dl>
          {sales.recent.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-white/50 px-4 py-6 text-center text-[15px] text-muted-foreground">No sales yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-white bg-white/60">
              <table className="w-full min-w-[640px] text-start text-[14px]">
                <thead className="text-[13px] text-muted-foreground">
                  <tr className="border-b border-foreground/10">
                    {["Date", "Residue", "Seller", "Buyer", "Quantity", "Total", "Fee"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-start font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sales.recent.map((s) => (
                    <tr key={s.saleId} className="border-b border-foreground/5 last:border-0">
                      <td className="whitespace-nowrap px-4 py-2.5">{fmt(s.createdAt)}</td>
                      <td className="px-4 py-2.5">{residueLabel(RESIDUE_EN, s)}</td>
                      <td className="px-4 py-2.5">
                        {s.seller}
                        <TelLink phone={s.sellerPhone} />
                      </td>
                      <td className="px-4 py-2.5">
                        {s.buyer}
                        <TelLink phone={s.buyerPhone} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">{formatKg(s.quantityKg, "en")}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">{formatDzd(s.totalDzd, "en")}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 font-medium tabular-nums">{formatDzd(s.feeDzd, "en")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}

/* ---------- Requests ---------- */

function RequestsSection({ requests }: { requests: AdminOverview["requests"] }) {
  return (
    <section id="requests" className="glass mt-5 scroll-mt-24 rounded-[28px] p-5 sm:p-7">
      <h2 className="text-[19px] font-semibold">
        Enterprise requests <span className="text-muted-foreground tabular-nums">· {requests.length}</span>
      </h2>
      {requests.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-white/50 px-4 py-6 text-center text-[15px] text-muted-foreground">No requests yet.</p>
      ) : (
        <ul className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[repeat(2,minmax(0,1fr))]">
          {requests.map((r) => (
            <li key={r._id} className="min-w-0 rounded-2xl border border-white bg-white/70 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="truncate font-semibold">{r.company}</p>
                <p className="shrink-0 text-[13px] text-muted-foreground">{fmt(r.createdAt)}</p>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-[15px]">{r.message}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={`mailto:${r.email}`} className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-[#e6edff] px-3 py-1.5 text-[13px] font-medium text-azure">
                  <Mail className="size-3.5 shrink-0" /> <span className="truncate">{r.email}</span>
                </a>
                {r.phone ? (
                  <a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`} dir="ltr" className="inline-flex items-center gap-1.5 rounded-full bg-[#e6edff] px-3 py-1.5 text-[13px] font-medium text-azure">
                    <Phone className="size-3.5" /> {r.phone}
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
