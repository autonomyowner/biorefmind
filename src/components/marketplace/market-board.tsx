"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "convex/react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { ArrowRight, CalendarDays, Check, Handshake, MapPin, PackageSearch, Scale, ShieldCheck, Sprout, Store, X } from "lucide-react";

// The kit's own close button carries English screen-reader text, so the dialog uses its bare Close part.
import { Dialog, DialogClose as DialogClosePrimitive, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CountUp } from "@/components/motion";
import { LabBadge } from "@/components/marketplace/lab-badge";
import { PhotoCheckBox, PhotoCheckLine } from "@/components/marketplace/photo-check";
import { FreshBadge, InterestForm, SellerName } from "@/components/marketplace/interest-form";
import { interestMessages } from "@/components/marketplace/interest-messages";
import { marketplaceMessages } from "@/components/marketplace/messages";
import { useLocale, useMessages } from "@/i18n/provider";
import type { Locale } from "@/i18n/locale";
import { api } from "@/lib/backend";
import {
  FRESH_KEYS,
  LOT_FRESH_KEYS,
  LOT_RESIDUE_KEYS,
  RESIDUE_KEYS,
  catalogLabels,
  labelOf,
  residueLabel,
  type Category,
} from "@/lib/catalog-labels";
import { formatDzd, formatKg } from "@/lib/pricing";
import type { PublicLot } from "@/lib/types";
import { cn } from "@/lib/utils";

// Design: docs/superpowers/specs/2026-10-05-public-marketplace-design.md

type Sort = "newest" | "cheapest" | "largest";
const SORTS: Sort[] = ["newest", "cheapest", "largest"];
const CAP = 100; // the backend returns at most this many lots
const EASE = [0.22, 1, 0.36, 1] as const;

const fill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

/** Dates in Algeria's time zone, so the server and the browser print the same day. */
function formatDay(ms: number, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-DZ" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Algiers",
  }).format(ms);
}

type CatFilter = "all" | Category;
const CATS: CatFilter[] = ["all", "fresh", "residue"];
type Product = { category: Category; residue: string };

function matches(l: PublicLot, cat: CatFilter, product: Product | null): boolean {
  if (product) return l.category === product.category && l.residue === product.residue;
  return cat === "all" || l.category === cat;
}

function sortLots(lots: PublicLot[], sort: Sort): PublicLot[] {
  if (sort === "newest") return lots;
  const out = [...lots];
  if (sort === "cheapest") out.sort((a, b) => a.priceDzdPerKg - b.priceDzdPerKg || b.createdAt - a.createdAt);
  else out.sort((a, b) => b.remainingKg - a.remainingKg || b.createdAt - a.createdAt);
  return out;
}

/**
 * The live list of open lots: numbers, residue filter, sort, cards, and a detail dialog.
 * `initial` is the server's first answer (null if the backend could not be reached);
 * live data replaces it as soon as the subscription answers.
 */
export function MarketBoard({ initial, signedIn }: { initial: PublicLot[] | null; signedIn: boolean }) {
  const t = useMessages(marketplaceMessages);
  const labels = useMessages(catalogLabels);
  const [cat, setCat] = useState<CatFilter>("all");
  const [product, setProduct] = useState<Product | null>(null);
  const [sort, setSort] = useState<Sort>("newest");
  const [openId, setOpenId] = useState<string | null>(null);
  const [interest, setInterest] = useState(false);

  const all = useQuery(api.market.publicLots, {}) ?? initial ?? undefined;
  // A filter has its own query (it reaches past the newest 100); until it answers, filter what we have.
  const args = product ? { category: product.category, residue: product.residue } : cat !== "all" ? { category: cat } : null;
  const oneLive = useQuery(api.market.publicLots, args ?? "skip");
  const shown = args ? (oneLive ?? all?.filter((l) => matches(l, cat, product))) : all;
  const lots = useMemo(() => (shown ? sortLots(shown, sort) : undefined), [shown, sort]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const l of all ?? []) {
      c[`${l.category}:${l.residue}`] = (c[`${l.category}:${l.residue}`] ?? 0) + 1;
      c[l.category] = (c[l.category] ?? 0) + 1;
    }
    return c;
  }, [all]);
  // Within a category every product is offered; under "Everything", only products with an open lot
  // ("Other" is left out there: it would show twice).
  const chips: Product[] =
    cat === "residue"
      ? LOT_RESIDUE_KEYS.map((residue) => ({ category: "residue", residue }))
      : cat === "fresh"
        ? LOT_FRESH_KEYS.map((residue) => ({ category: "fresh", residue }))
        : [
            ...RESIDUE_KEYS.map((residue): Product => ({ category: "residue", residue })),
            ...FRESH_KEYS.map((residue): Product => ({ category: "fresh", residue })),
          ].filter((p) => (counts[`${p.category}:${p.residue}`] ?? 0) > 0);
  const selected = openId ? ([...(all ?? []), ...(oneLive ?? [])].find((l) => l.listingId === openId) ?? null) : null;
  const offerHref = signedIn ? "/dashboard/browse" : "/signup?as=factory";
  const open = (id: string, wantsInterest: boolean) => {
    setInterest(wantsInterest);
    setOpenId(id);
  };
  const showAll = () => {
    setCat("all");
    setProduct(null);
  };

  return (
    <MotionConfig reducedMotion="user">
      <Stats lots={all} />

      <div role="group" aria-label={t.categoryLabel} className="mt-12 flex w-fit max-w-full rounded-full border border-white/80 bg-white/45 p-1">
        {CATS.map((c) => {
          const n = c === "all" ? (all?.length ?? 0) : (counts[c] ?? 0);
          return (
            <button
              key={c}
              type="button"
              aria-pressed={cat === c}
              onClick={() => {
                setCat(c);
                setProduct(null);
              }}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold whitespace-nowrap transition-colors sm:px-4 sm:text-[14px]",
                cat === c ? "btn-navy" : "text-foreground/70 hover:text-foreground",
              )}
            >
              {t.categories[c]}
              {all && n > 0 ? (
                <span dir="ltr" className={cn("hidden text-[12px] tabular-nums sm:inline", cat === c ? "text-white/70" : "text-azure")}>
                  {n}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div role="group" aria-label={t.filterLabel} className="flex flex-wrap gap-2">
          {[null, ...chips].map((p) => {
            const on = p ? product?.category === p.category && product.residue === p.residue : product === null;
            const n = p ? (counts[`${p.category}:${p.residue}`] ?? 0) : cat === "all" ? (all?.length ?? 0) : (counts[cat] ?? 0);
            const k = p?.residue;
            return (
              <button
                key={p ? `${p.category}:${p.residue}` : "all"}
                type="button"
                aria-pressed={on}
                onClick={() => setProduct(p)}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[14px] font-medium transition-colors",
                  on
                    ? "btn-navy border-transparent"
                    : "border-white/80 bg-white/55 text-foreground/80 hover:bg-white hover:text-foreground",
                )}
              >
                {on && k ? <Check className="size-3.5" strokeWidth={3} /> : null}
                {k ? labelOf(labels.residues, k) : t.all}
                {all && n > 0 ? (
                  <span
                    dir="ltr"
                    className={cn(
                      "min-w-6 rounded-full px-1.5 text-center text-[12px] tabular-nums",
                      on ? "bg-white/15 text-white" : "bg-azure/10 text-azure",
                    )}
                  >
                    {n}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div role="group" aria-label={t.sortLabel} className="flex shrink-0 self-start rounded-full border border-white/80 bg-white/45 p-1">
          {SORTS.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={sort === s}
              onClick={() => setSort(s)}
              className={cn(
                "h-8 rounded-full px-3.5 text-[13px] font-medium transition-colors",
                sort === s ? "bg-white text-foreground shadow-[0_6px_14px_-8px_rgba(7,23,51,0.45)]" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.sort[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8" aria-busy={lots === undefined}>
        {lots === undefined ? (
          <SkeletonGrid label={t.loading} />
        ) : lots.length === 0 ? (
          <Empty
            title={product ? fill(t.emptyResidue, { residue: labelOf(labels.residues, product.residue) }) : cat !== "all" ? t.emptyCategory[cat] : null}
            onShowAll={showAll}
          />
        ) : (
          <motion.ul layout className="grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-[repeat(2,minmax(0,1fr))] xl:grid-cols-[repeat(3,minmax(0,1fr))]">
            <AnimatePresence initial={false} mode="popLayout">
              {lots.map((l, i) => (
                <LotCard
                  key={l.listingId}
                  lot={l}
                  index={i}
                  offerHref={offerHref}
                  onOpen={() => open(l.listingId, false)}
                  onInterest={() => open(l.listingId, true)}
                />
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
        {all && all.length >= CAP && !args ? (
          <p className="mt-6 text-center text-[13px] text-muted-foreground">{t.capped}</p>
        ) : null}
      </div>

      <LotDialog lot={selected} offerHref={offerHref} interest={interest} onClose={() => setOpenId(null)} />
    </MotionConfig>
  );
}

/* ---------- Numbers ---------- */

function Stats({ lots }: { lots: PublicLot[] | undefined }) {
  const t = useMessages(marketplaceMessages);
  const locale = useLocale();
  const kg = lots?.reduce((s, l) => s + l.remainingKg, 0) ?? 0;
  const regions = new Set((lots ?? []).map((l) => l.region.trim().toLowerCase()).filter(Boolean)).size;
  const items = [
    { icon: PackageSearch, value: lots?.length ?? 0, label: t.stats.lots, unit: null },
    { icon: Scale, value: kg, label: t.stats.kg, unit: locale === "ar" ? "كغ" : "kg" },
    { icon: MapPin, value: regions, label: t.stats.regions, unit: null },
  ];
  return (
    <dl className="mx-auto grid max-w-[760px] grid-cols-[repeat(3,minmax(0,1fr))] gap-2.5 sm:gap-4">
      {items.map(({ icon: Icon, value, label, unit }) => (
        <div key={label} className="glass flex flex-col items-center rounded-[22px] px-2 py-4 text-center sm:flex-row sm:gap-3.5 sm:px-5 sm:text-start">
          <span className="orb hidden size-11 shrink-0 items-center justify-center rounded-full sm:flex">
            <Icon className="size-5" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <dd className="text-[22px] font-semibold tabular-nums tracking-[-0.02em] sm:text-[26px]">
              {lots ? <CountUp value={value} /> : "–"}
              {unit ? <span className="ms-1 text-[14px] font-medium text-muted-foreground">{unit}</span> : null}
            </dd>
            <dt className="text-[12px] text-muted-foreground sm:text-[13px]">{label}</dt>
          </div>
        </div>
      ))}
    </dl>
  );
}

/* ---------- Cards ---------- */

function Photo({ urls, alt, sizes, className }: { urls: string[]; alt: string; sizes: string; className?: string }) {
  const t = useMessages(marketplaceMessages);
  return (
    <div className={cn("relative overflow-hidden bg-[linear-gradient(135deg,#e6edff,#efe9ff)]", className)}>
      {urls[0] ? (
        <Image src={urls[0]} alt={alt} fill sizes={sizes} className="object-cover" />
      ) : (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[13px] text-azure/70">
          <span className="flex size-12 items-center justify-center rounded-full bg-white/70">
            <Sprout className="size-6" strokeWidth={1.6} />
          </span>
          {t.noPhoto}
        </span>
      )}
    </div>
  );
}

function OfferLink({ href, className }: { href: string; className?: string }) {
  const t = useMessages(marketplaceMessages);
  const signedIn = href.startsWith("/dashboard");
  return (
    <Link
      href={href}
      className={cn(
        "btn-navy group inline-flex h-11 items-center justify-center gap-2.5 rounded-full px-5 text-[15px] font-semibold transition-[filter] hover:brightness-125",
        className,
      )}
    >
      {signedIn ? t.offerSignedIn : t.offerGuest}
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" strokeWidth={2.25} />
    </Link>
  );
}

function InterestButton({ onClick, className }: { onClick: () => void; className?: string }) {
  const t = useMessages(interestMessages);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "btn-navy inline-flex h-11 items-center justify-center gap-2.5 rounded-full px-5 text-[15px] font-semibold transition-[filter] hover:brightness-125",
        className,
      )}
    >
      <Handshake className="size-4" strokeWidth={2} />
      {t.cta}
    </button>
  );
}

function LotCard({
  lot: l,
  index,
  offerHref,
  onOpen,
  onInterest,
}: {
  lot: PublicLot;
  index: number;
  offerHref: string;
  onOpen: () => void;
  onInterest: () => void;
}) {
  const t = useMessages(marketplaceMessages);
  const labels = useMessages(catalogLabels);
  const locale = useLocale();
  const name = residueLabel(labels.residues, l);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.45, delay: Math.min(index, 8) * 0.04, ease: EASE } }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      className="glass group/card flex min-w-0 flex-col rounded-[26px] p-3 transition-shadow hover:shadow-[0_30px_60px_-30px_rgba(40,60,170,0.55)]"
    >
      <button type="button" onClick={onOpen} className="flex flex-1 flex-col rounded-[20px] text-start outline-none focus-visible:ring-3 focus-visible:ring-azure/40">
        <span className="relative block">
          <Photo
            urls={l.photoUrls}
            alt=""
            sizes="(min-width: 1280px) 400px, (min-width: 640px) 45vw, 92vw"
            className="aspect-[4/3] w-full rounded-[20px] transition-transform duration-500 group-hover/card:scale-[1.01]"
          />
          <span className="absolute start-3 top-3 rounded-full border border-white/80 bg-white/85 px-3 py-1 text-[13px] font-semibold backdrop-blur">
            <span>{formatDzd(l.priceDzdPerKg, locale)}</span>
            <span className="text-muted-foreground">{t.perKg}</span>
          </span>
          {l.category === "fresh" ? <FreshBadge className="absolute end-3 top-3 border border-white/80" /> : null}
          {l.photoUrls.length > 1 ? (
            <span dir="ltr" className="absolute end-3 bottom-3 rounded-full bg-black/55 px-2.5 py-0.5 text-[12px] font-medium text-white">
              +{l.photoUrls.length - 1}
            </span>
          ) : null}
        </span>

        <span className="block px-2 pt-4">
          <span className="block truncate text-[19px] font-semibold tracking-[-0.015em]">{name}</span>
          <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[14px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Scale className="size-4 shrink-0 text-azure" strokeWidth={1.8} />
              <bdi>{fill(t.available, { kg: formatKg(l.remainingKg, locale) })}</bdi>
            </span>
            {l.region ? (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <MapPin className="size-4 shrink-0 text-azure" strokeWidth={1.8} />
                <span dir="auto" className="truncate">{l.region}</span>
              </span>
            ) : null}
          </span>
          <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[14px] text-muted-foreground">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Store className="size-4 shrink-0 text-azure" strokeWidth={1.8} />
              <SellerName lot={l} />
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4 shrink-0 text-azure" strokeWidth={1.8} />
              {fill(t.posted, { date: formatDay(l.createdAt, locale) })}
            </span>
          </span>
          {l.note ? <span className="[unicode-bidi:plaintext] mt-3 line-clamp-2 block text-[14px] leading-relaxed text-foreground/75">{l.note}</span> : null}
        </span>
      </button>

      {l.lab ? <LabBadge lab={l.lab} className="mx-2 mt-3" /> : null}
      {l.photoCheck ? <PhotoCheckLine check={l.photoCheck} residue={name} className="mx-2 mt-2" /> : null}

      <div className="mt-auto px-2 pt-4 pb-1">
        {l.managed ? <InterestButton onClick={onInterest} className="w-full" /> : <OfferLink href={offerHref} className="w-full" />}
      </div>
    </motion.li>
  );
}

function SkeletonGrid({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-[repeat(2,minmax(0,1fr))] xl:grid-cols-[repeat(3,minmax(0,1fr))]">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="glass rounded-[26px] p-3">
          <div className="aspect-[4/3] animate-pulse rounded-[20px] bg-white/60" />
          <div className="mt-4 h-5 w-2/3 animate-pulse rounded-full bg-white/70" />
          <div className="mt-3 mb-2 h-4 w-1/2 animate-pulse rounded-full bg-white/60" />
        </div>
      ))}
    </div>
  );
}

/** `title` is set when a filter is on (and offers "Show everything"); null for an empty marketplace. */
function Empty({ title, onShowAll }: { title: string | null; onShowAll: () => void }) {
  const t = useMessages(marketplaceMessages);
  return (
    <div className="glass mx-auto flex max-w-[560px] flex-col items-center rounded-[28px] px-6 py-12 text-center">
      <span className="orb flex size-14 items-center justify-center rounded-full">
        <PackageSearch className="size-6" strokeWidth={1.8} />
      </span>
      <p className="mt-5 text-[20px] font-semibold tracking-[-0.015em]">
        {title ?? t.emptyTitle}
      </p>
      <p className="mt-2 max-w-[380px] text-[15px] leading-relaxed text-muted-foreground">{t.emptyBody}</p>
      {title ? (
        <button
          type="button"
          onClick={onShowAll}
          className="mt-6 inline-flex h-11 items-center rounded-full border border-foreground/15 bg-white/60 px-6 text-[15px] font-medium transition-colors hover:bg-white"
        >
          {t.showAll}
        </button>
      ) : null}
    </div>
  );
}

/* ---------- Detail dialog ---------- */

function LotDialog({ lot, offerHref, interest, onClose }: { lot: PublicLot | null; offerHref: string; interest: boolean; onClose: () => void }) {
  // Keep the last lot while the dialog animates closed.
  const [shown, setShown] = useState<PublicLot | null>(lot);
  if (lot && lot !== shown) setShown(lot);
  return (
    <Dialog open={lot !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-[28px] border border-white/80 bg-[#eef4fa] p-0 ring-0 sm:max-w-[860px]"
      >
        {shown ? <LotDetail key={`${shown.listingId}-${interest}`} lot={shown} offerHref={offerHref} interest={interest} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function LotDetail({ lot: l, offerHref, interest }: { lot: PublicLot; offerHref: string; interest: boolean }) {
  const t = useMessages(marketplaceMessages);
  const ti = useMessages(interestMessages);
  const labels = useMessages(catalogLabels);
  const locale = useLocale();
  const [active, setActive] = useState(0);
  const [asking, setAsking] = useState(interest && l.managed);
  const form = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Opened from the card's "I'm interested": bring the form into view (on phones it sits below the photo).
    if (interest && l.managed) form.current?.scrollIntoView({ block: "nearest" });
  }, [interest, l.managed]);
  const name = residueLabel(labels.residues, l);
  const rows = [
    { icon: Scale, label: t.detail.available, value: <bdi>{formatKg(l.remainingKg, locale)}</bdi> },
    { icon: MapPin, label: t.detail.region, value: <bdi>{l.region || "–"}</bdi> },
    { icon: Store, label: t.detail.seller, value: <SellerName lot={l} className="justify-end" /> },
    { icon: CalendarDays, label: t.detail.posted, value: formatDay(l.createdAt, locale) },
  ];

  return (
    <div className="relative grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <DialogCloseButton label={t.close} />
      <div className="p-3 md:p-4">
        <Photo
          urls={l.photoUrls.length ? [l.photoUrls[active]] : []}
          alt={fill(t.photo, { n: active + 1 })}
          sizes="(min-width: 768px) 460px, 92vw"
          className="aspect-[4/3] w-full rounded-[22px]"
        />
        {l.photoUrls.length > 1 ? (
          <ul className="mt-3 flex gap-2">
            {l.photoUrls.map((url, i) => (
              <li key={url}>
                <button
                  type="button"
                  aria-label={fill(t.photo, { n: i + 1 })}
                  aria-pressed={active === i}
                  onClick={() => setActive(i)}
                  className={cn(
                    "relative block size-16 overflow-hidden rounded-xl border-2 transition-colors",
                    active === i ? "border-azure" : "border-transparent opacity-75 hover:opacity-100",
                  )}
                >
                  <Image src={url} alt="" fill sizes="64px" className="object-cover" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex flex-col p-5 pt-2 sm:p-7 md:ps-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 md:pe-10">
          <DialogTitle className="text-[26px] font-semibold leading-tight tracking-[-0.025em]">{name}</DialogTitle>
          {l.category === "fresh" ? <FreshBadge /> : null}
        </div>
        <p className="mt-2 text-[30px] font-semibold tracking-[-0.03em]">
          <span className="text-gradient">{formatDzd(l.priceDzdPerKg, locale)}</span>
          <span className="text-[16px] font-medium text-muted-foreground">{t.perKg}</span>
        </p>

        <dl className="mt-5 divide-y divide-foreground/[0.07] rounded-2xl border border-white bg-white/60">
          {rows.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-3 text-[14px]">
              <Icon className="size-4 shrink-0 text-azure" strokeWidth={1.8} />
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="ms-auto min-w-0 truncate font-medium">{value}</dd>
            </div>
          ))}
        </dl>

        {l.note ? (
          <div className="mt-5">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-azure">{t.detail.note}</p>
            <p className="[unicode-bidi:plaintext] mt-2 whitespace-pre-line break-words text-[15px] leading-relaxed text-foreground/85">{l.note}</p>
          </div>
        ) : null}

        {l.lab ? <LabBadge lab={l.lab} detail className="mt-5" /> : null}
        {l.photoCheck ? <PhotoCheckBox check={l.photoCheck} residue={name} className="mt-3" /> : null}

        <div className="mt-6 flex items-start gap-2.5 rounded-2xl bg-[#e6edff] p-3.5 text-[13px] leading-relaxed text-[#24366a]">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-azure" strokeWidth={1.8} />
          <p>
            {l.managed ? ti.note : t.contactNote} {t.feeNote}
          </p>
        </div>

        {!l.managed ? (
          <OfferLink href={offerHref} className="mt-6 w-full" />
        ) : asking ? (
          <div ref={form} className="mt-6">
            <InterestForm lot={l} lotName={name} onCancel={() => setAsking(false)} />
          </div>
        ) : (
          <InterestButton onClick={() => setAsking(true)} className="mt-6 w-full" />
        )}
      </div>
    </div>
  );
}

function DialogCloseButton({ label }: { label: string }) {
  return (
    <DialogClosePrimitive
      aria-label={label}
      className="absolute end-5 top-5 z-10 inline-flex size-10 items-center justify-center rounded-full border border-white/80 bg-white/85 text-foreground/70 shadow-[0_8px_20px_-12px_rgba(7,23,51,0.5)] backdrop-blur transition-colors hover:bg-white hover:text-foreground md:end-4 md:top-4"
    >
      <X className="size-5" />
    </DialogClosePrimitive>
  );
}

