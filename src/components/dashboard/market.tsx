"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "motion/react";
import { Check, HandCoins, ImagePlus, MapPin, PackageSearch, Phone, Plus, Receipt, Sprout, Store, X } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useDashboard } from "@/components/dashboard/shell";
import { fill } from "@/components/dashboard/messages";
import { marketMessages } from "@/components/dashboard/market-messages";
import { Panel } from "@/components/dashboard/profile-card";
import { localizeBackendError } from "@/i18n/backend-errors";
import { useLocale, useMessages } from "@/i18n/provider";
import { api } from "@/lib/backend";
import { LOT_RESIDUE_KEYS, RESIDUE_KEYS, catalogLabels, labelOf, residueLabel } from "@/lib/catalog-labels";
import { errorMessage } from "@/lib/errors";
import { formatDzd, formatKg, MARKET_FEE_RATE } from "@/lib/pricing";
import type { MarketListing, MyListing, MyOffer, Sale } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";
import { MAX_LISTING_PHOTOS } from "../../../convex/lib/market";

// Design: docs/superpowers/specs/2026-10-04-marketplace-design.md

const FIELD = "h-11 rounded-xl border-foreground/10 bg-white/90 px-3.5 text-[15px] focus-visible:border-azure/60 focus-visible:ring-azure/20";
const AREA =
  "w-full resize-none rounded-xl border border-foreground/10 bg-white/90 px-3.5 py-2.5 text-[15px] outline-none focus-visible:border-azure/60 focus-visible:ring-3 focus-visible:ring-azure/20";
const CARD = "min-w-0 rounded-2xl border border-white bg-white/70 p-4 shadow-[0_10px_24px_-20px_rgba(20,30,120,0.6)]";
const PRIMARY = "btn-navy inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-[14px] font-semibold disabled:opacity-80";
const QUIET =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-foreground/15 bg-white/60 px-4 text-[14px] font-medium transition-colors hover:bg-white disabled:opacity-60";

/* ---------- Guest preview samples ---------- */

const NOW = Date.UTC(2026, 9, 4);
const SAMPLE_LISTINGS: MyListing[] = [
  {
    listingId: "g1" as Id<"listings">,
    residue: "pomegranate_peels",
    residueName: undefined,
    quantityKg: 1200,
    remainingKg: 1200,
    priceDzdPerKg: 18,
    region: "Sétif",
    note: "Sun-dried, in 25 kg bags. Collection from the farm.",
    status: "open",
    photoUrls: [],
    labRequestId: undefined,
    createdAt: NOW,
    offers: [
      {
        offerId: "go1" as Id<"offers">,
        buyerName: "Extraits du Hodna",
        buyerRegion: "M'Sila",
        quantityKg: 1200,
        priceDzdPerKg: 17,
        totalDzd: 20_400,
        message: "We can collect on Saturday.",
        status: "pending",
        createdAt: NOW,
      },
    ],
  },
  {
    listingId: "g2" as Id<"listings">,
    residue: "olive_pomace",
    residueName: undefined,
    quantityKg: 3000,
    remainingKg: 0,
    priceDzdPerKg: 6,
    region: "Sétif",
    note: undefined,
    status: "sold",
    photoUrls: [],
    labRequestId: undefined,
    createdAt: NOW - 86_400_000 * 6,
    offers: [],
  },
];
const SAMPLE_SALES: Sale[] = [
  {
    saleId: "gs1" as Id<"sales">,
    residue: "olive_pomace",
    residueName: undefined,
    quantityKg: 3000,
    priceDzdPerKg: 6,
    totalDzd: 18_000,
    feeDzd: 900,
    side: "sold",
    otherName: "Bio-Énergie Est",
    otherRegion: "Constantine",
    otherPhone: "+213 31 00 00 00",
    createdAt: NOW - 86_400_000 * 5,
  },
];

/* ---------- Shared pieces ---------- */

function useFormat() {
  const locale = useLocale();
  return {
    dzd: (n: number) => formatDzd(n, locale),
    kg: (n: number) => formatKg(n, locale),
    dzdKg: (n: number) => `${formatDzd(n, locale)}/${locale === "ar" ? "كغ" : "kg"}`,
    date: (ms: number) =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar-DZ" : "en-GB", { day: "numeric", month: "short" }).format(ms),
  };
}

function useFail() {
  const locale = useLocale();
  return (err: unknown) => toast.error(localizeBackendError(errorMessage(err), locale));
}

/** Parses a number field; empty or invalid → NaN (the backend refuses it with a readable message). */
function num(s: string): number {
  return s.trim() === "" ? Number.NaN : Number(s.replace(",", "."));
}

function EmptyNote({ icon: Icon, title, body }: { icon: typeof Sprout; title?: string; body: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-azure/25 bg-white/40 px-6 py-9 text-center">
      <span className="orb flex size-11 items-center justify-center rounded-full">
        <Icon className="size-5" strokeWidth={1.8} />
      </span>
      {title ? <p className="mt-3 text-[17px] font-semibold">{title}</p> : null}
      <p className="mt-1.5 max-w-[420px] text-[14px] leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function Chip({ tone, children }: { tone: "green" | "blue" | "grey" | "amber"; children: React.ReactNode }) {
  const tones = {
    green: "bg-[#dcf7ea] text-[#12a26a]",
    blue: "bg-[#e6edff] text-azure",
    grey: "bg-foreground/[0.06] text-muted-foreground",
    amber: "bg-[#fff1d6] text-[#a8620a]",
  };
  return <span className={cn("inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium", tones[tone])}>{children}</span>;
}

/** The first photo of a lot, or a quiet placeholder. */
function LotPhoto({ urls, alt, className }: { urls: string[]; alt: string; className?: string }) {
  const t = useMessages(marketMessages);
  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-[linear-gradient(135deg,#e6edff,#efe9ff)]", className)}>
      {urls[0] ? (
        <Image src={urls[0]} alt={alt} fill sizes="(min-width: 1024px) 320px, 90vw" className="object-cover" />
      ) : (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[12px] text-azure/70">
          <Sprout className="size-6" strokeWidth={1.6} />
          {t.browse.noPhoto}
        </span>
      )}
      {urls.length > 1 ? (
        <span dir="ltr" className="absolute bottom-2 end-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">
          +{urls.length - 1}
        </span>
      ) : null}
    </div>
  );
}

/** Choosing one residue from the catalog; as a filter (`withAll`) it also offers "other". */
function ResiduePicker({ value, onChange, withAll }: { value: string | null; onChange: (k: string | null) => void; withAll?: string }) {
  const labels = useMessages(catalogLabels);
  const keys: (string | null)[] = withAll ? [null, ...LOT_RESIDUE_KEYS] : [...RESIDUE_KEYS];
  return (
    <div className="flex flex-wrap gap-2">
      {keys.map((k) => {
        const on = value === k;
        return (
          <button
            key={k ?? "all"}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(k)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
              on ? "border-transparent bg-primary text-primary-foreground" : "border-foreground/15 bg-white/70 hover:border-azure/50",
            )}
          >
            {on && k ? <Check className="size-3.5" strokeWidth={3} /> : null}
            {k ? labelOf(labels.residues, k) : withAll}
          </button>
        );
      })}
    </div>
  );
}

/** Two buttons that ask once more before an action that cannot be undone. */
function Confirm({ text, yes, no, busy, onYes, onNo }: { text: string; yes: string; no: string; busy: boolean; onYes: () => void; onNo: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-xl bg-[#eef2ff] p-3">
      <p className="text-[14px] leading-relaxed">{text}</p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={onYes} className={cn(PRIMARY, "h-9 px-4")}>
          {busy ? <Spinner size="sm" label={null} /> : yes}
        </button>
        <button type="button" disabled={busy} onClick={onNo} className={cn(QUIET, "h-9")}>
          {no}
        </button>
      </div>
    </motion.div>
  );
}

/* ---------- Farmer: my listings ---------- */

export function useMyListings(): MyListing[] | undefined {
  const { workspace, guest } = useDashboard();
  const live = useQuery(api.market.myListings, guest ? "skip" : { companyId: workspace.companyId });
  return guest ? SAMPLE_LISTINGS : live;
}

export function MyListings({ id }: { id?: string }) {
  const { workspace, guest } = useDashboard();
  const t = useMessages(marketMessages);
  const listings = useMyListings();
  const [adding, setAdding] = useState(false);
  const canSell = !guest && workspace.role !== "inspector";

  return (
    <Panel
      id={id}
      title={t.listings.title}
      action={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link href="/marketplace" className={cn(QUIET, "h-9 px-3.5 text-[13px]")}>
            <Store className="size-4" /> {t.listings.public}
          </Link>
          {canSell && !adding ? (
            <button type="button" onClick={() => setAdding(true)} className={cn(PRIMARY, "h-9 px-4")}>
              <Plus className="size-4" /> {t.listings.new}
            </button>
          ) : null}
        </div>
      }
    >
      <AnimatePresence initial={false}>
        {adding ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <NewListingForm onDone={() => setAdding(false)} />
          </motion.div>
        ) : null}
      </AnimatePresence>
      {listings === undefined ? (
        <Spinner className="flex py-8" />
      ) : listings.length === 0 ? (
        adding ? null : <EmptyNote icon={Sprout} title={t.listings.emptyTitle} body={t.listings.emptyBody} />
      ) : (
        <ul className="space-y-3">
          {listings.map((l) => (
            <ListingCard key={l.listingId} listing={l} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

type Upload = { key: string; preview: string; storageId?: Id<"_storage"> };

/** Phone photos are large: shrink to 1600 px JPEG before upload. Falls back to the original. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 1_500_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

function NewListingForm({ onDone }: { onDone: () => void }) {
  const { workspace } = useDashboard();
  const t = useMessages(marketMessages);
  const f = useFormat();
  const fail = useFail();
  const create = useMutation(api.market.createListing);
  const uploadUrl = useMutation(api.market.generateUploadUrl);

  const [residue, setResidue] = useState<string | null>(null);
  const [custom, setCustom] = useState(""); // typed residue; wins over the chips
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [region, setRegion] = useState(workspace.region);
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<Upload[]>([]);
  const [busy, setBusy] = useState(false);

  const uploading = photos.some((p) => !p.storageId);
  const value = num(quantity) * num(price);

  async function addPhotos(files: FileList | null) {
    const chosen = Array.from(files ?? [])
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, MAX_LISTING_PHOTOS - photos.length);
    for (const file of chosen) {
      const key = `${file.name}-${file.size}-${Math.random()}`;
      setPhotos((p) => [...p, { key, preview: URL.createObjectURL(file) }]);
      try {
        const [url, blob] = await Promise.all([uploadUrl({ companyId: workspace.companyId }), shrink(file)]);
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": blob.type || "image/jpeg" }, body: blob });
        if (!res.ok) throw new Error("upload");
        const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
        setPhotos((p) => p.map((x) => (x.key === key ? { ...x, storageId } : x)));
      } catch {
        setPhotos((p) => p.filter((x) => x.key !== key));
        toast.error(t.form.uploadFailed);
      }
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await create({
        companyId: workspace.companyId,
        ...(custom.trim() ? { residue: "other", residueName: custom } : { residue: residue ?? "" }),
        quantityKg: num(quantity),
        priceDzdPerKg: num(price),
        region,
        note,
        photoIds: photos.flatMap((p) => (p.storageId ? [p.storageId] : [])),
      });
      toast.success(t.form.posted);
      onDone();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mb-5 space-y-4 rounded-2xl border border-white bg-white/55 p-4 sm:p-5">
      <p className="text-[16px] font-semibold">{t.form.title}</p>
      <fieldset>
        <legend className="mb-2 text-[14px] font-medium">{t.form.residue}</legend>
        <ResiduePicker
          value={custom.trim() ? null : residue}
          onChange={(k) => {
            setResidue(k);
            setCustom("");
          }}
        />
        <label className="mt-3 block text-[13px] text-muted-foreground">
          {t.form.residueOther}
          <Input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            maxLength={80}
            placeholder={t.form.residueOtherPlaceholder}
            className={cn(FIELD, "mt-1.5 text-foreground")}
          />
        </label>
      </fieldset>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))]">
        <label className="block text-[14px] font-medium">
          {t.form.quantity}
          <Input inputMode="numeric" dir="ltr" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="2000" className={cn(FIELD, "mt-1.5 rtl:text-end")} />
        </label>
        <label className="block text-[14px] font-medium">
          {t.form.price}
          <Input inputMode="decimal" dir="ltr" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="15" className={cn(FIELD, "mt-1.5 rtl:text-end")} />
        </label>
        <label className="block text-[14px] font-medium">
          {t.form.region}
          <Input value={region} onChange={(e) => setRegion(e.target.value)} className={cn(FIELD, "mt-1.5")} />
        </label>
      </div>
      <label className="block text-[14px] font-medium">
        {t.form.note}
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} placeholder={t.form.notePlaceholder} className={cn(AREA, "mt-1.5")} />
      </label>
      <div>
        <p className="mb-2 text-[14px] font-medium">{t.form.photos}</p>
        <div className="flex flex-wrap gap-2">
          {photos.map((p) => (
            <div key={p.key} className="relative size-20 overflow-hidden rounded-xl bg-white">
              {/* A local preview (blob: URL), so not through the image optimizer. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.preview} alt="" className="size-full object-cover" />
              {p.storageId ? (
                <button
                  type="button"
                  aria-label={t.form.removePhoto}
                  onClick={() => setPhotos((all) => all.filter((x) => x.key !== p.key))}
                  className="absolute end-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white"
                >
                  <X className="size-3.5" />
                </button>
              ) : (
                <span className="absolute inset-0 flex items-center justify-center bg-white/60">
                  <Spinner size="sm" label={null} />
                </span>
              )}
            </div>
          ))}
          {photos.length < MAX_LISTING_PHOTOS ? (
            <label className="flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-azure/40 bg-white/60 text-[11px] font-medium text-azure transition-colors hover:bg-white">
              <ImagePlus className="size-5" strokeWidth={1.8} />
              {t.form.addPhoto}
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => {
                  void addPhotos(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#eef2ff] px-4 py-3">
        <p className="text-[14px] text-muted-foreground">
          {t.form.value}: <span className="font-semibold text-foreground" dir="ltr">{Number.isFinite(value) && value > 0 ? f.dzd(Math.round(value * 100) / 100) : "–"}</span>
        </p>
        <p className="text-[13px] text-muted-foreground">{t.form.feeNote}</p>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={busy || uploading} className={PRIMARY}>
          {busy ? <Spinner size="sm" label={null} /> : t.form.submit}
        </button>
        <button type="button" onClick={onDone} className={QUIET}>
          {t.form.cancel}
        </button>
      </div>
    </form>
  );
}

function ListingCard({ listing: l }: { listing: MyListing }) {
  const { workspace, guest } = useDashboard();
  const t = useMessages(marketMessages);
  const labels = useMessages(catalogLabels);
  const f = useFormat();
  const fail = useFail();
  const withdraw = useMutation(api.market.withdrawListing);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const canAct = !guest && workspace.role !== "inspector";
  const name = residueLabel(labels.residues, l);
  const tone = l.status === "open" ? "green" : l.status === "sold" ? "blue" : "grey";

  async function doWithdraw() {
    setBusy(true);
    try {
      await withdraw({ listingId: l.listingId });
      toast.success(t.listings.withdrawn);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <li className={CARD}>
      <div className="flex gap-3 sm:gap-4">
        <LotPhoto urls={l.photoUrls} alt={name} className="size-20 shrink-0 sm:size-24" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-[16px] font-semibold">{name}</p>
            <Chip tone={tone}>{t.listings.status[l.status]}</Chip>
          </div>
          <p className="mt-1 text-[15px]">
            <span className="font-semibold" dir="ltr">{f.dzd(l.priceDzdPerKg)}</span>{" "}
            <span className="text-muted-foreground">{t.perKg}</span>
          </p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {fill(t.listings.left, { left: f.kg(l.remainingKg), total: f.kg(l.quantityKg) })}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[13px] text-muted-foreground">
            <MapPin className="size-3.5" /> {l.region} · {f.date(l.createdAt)}
          </p>
        </div>
      </div>
      {l.note ? <p className="mt-3 text-[14px] leading-relaxed text-foreground/80">{l.note}</p> : null}

      {l.status === "open" ? (
        <div className="mt-4">
          <p className="mb-2 text-[13px] font-medium text-muted-foreground">{t.listings.offers}</p>
          {l.offers.length === 0 ? (
            <p className="rounded-xl bg-white/60 px-3 py-2.5 text-[14px] text-muted-foreground">{t.listings.noOffers}</p>
          ) : (
            <ul className="space-y-2">
              {l.offers.map((o) => (
                <OfferRow key={o.offerId} offer={o} canAct={canAct} />
              ))}
            </ul>
          )}
          {canAct ? (
            confirming ? (
              <Confirm
                text={t.listings.withdrawConfirm}
                yes={t.listings.withdraw}
                no={t.form.cancel}
                busy={busy}
                onYes={doWithdraw}
                onNo={() => setConfirming(false)}
              />
            ) : (
              <button type="button" onClick={() => setConfirming(true)} className="mt-3 text-[13px] font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                {t.listings.withdraw}
              </button>
            )
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function OfferRow({ offer: o, canAct }: { offer: MyListing["offers"][number]; canAct: boolean }) {
  const t = useMessages(marketMessages);
  const f = useFormat();
  const fail = useFail();
  const respond = useMutation(api.market.respond);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = o.status === "pending";

  async function answer(accept: boolean) {
    setBusy(true);
    try {
      await respond({ offerId: o.offerId, accept });
      toast.success(accept ? t.listings.accepted : t.listings.declined);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <li className={cn("rounded-xl border px-3 py-3", pending ? "border-azure/20 bg-white" : "border-transparent bg-white/50 opacity-75")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold">{o.buyerName}</p>
          <p className="text-[13px] text-muted-foreground">{o.buyerRegion}</p>
        </div>
        <Chip tone={pending ? "amber" : o.status === "accepted" ? "green" : "grey"}>{t.listings.offerStatus[o.status]}</Chip>
      </div>
      <p className="mt-1.5 text-[14px] rtl:text-end" dir="ltr">
        <bdi>{f.kg(o.quantityKg)}</bdi> × <bdi>{f.dzdKg(o.priceDzdPerKg)}</bdi> = <span className="font-semibold"><bdi>{f.dzd(o.totalDzd)}</bdi></span>
      </p>
      {o.message ? <p className="mt-1.5 text-[14px] leading-relaxed text-foreground/80">“{o.message}”</p> : null}
      {pending && canAct ? (
        confirming ? (
          <Confirm
            text={fill(t.listings.acceptConfirm, { qty: f.kg(o.quantityKg), price: f.dzd(o.priceDzdPerKg), total: f.dzd(o.totalDzd) })}
            yes={t.listings.accept}
            no={t.form.cancel}
            busy={busy}
            onYes={() => answer(true)}
            onNo={() => setConfirming(false)}
          />
        ) : (
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button type="button" onClick={() => setConfirming(true)} className={cn(PRIMARY, "h-9 px-4")}>
              <Check className="size-4" strokeWidth={2.5} /> {t.listings.accept}
            </button>
            <button type="button" disabled={busy} onClick={() => answer(false)} className={cn(QUIET, "h-9")}>
              {t.listings.decline}
            </button>
          </div>
        )
      ) : null}
    </li>
  );
}

/* ---------- Factory: browse and offer ---------- */

export function useOpenListings(residue: string | null = null): MarketListing[] | undefined {
  const { guest } = useDashboard();
  const live = useQuery(api.market.browse, guest ? "skip" : residue ? { residue } : {});
  return guest ? [] : live;
}

export function BrowseListings({ id }: { id?: string }) {
  const t = useMessages(marketMessages);
  const [residue, setResidue] = useState<string | null>(null);
  const listings = useOpenListings(residue);

  return (
    <Panel id={id} title={t.browse.title}>
      <p className="-mt-2 mb-4 text-[14px] text-muted-foreground">{t.browse.body}</p>
      <div className="mb-5">
        <ResiduePicker value={residue} onChange={setResidue} withAll={t.browse.all} />
      </div>
      {listings === undefined ? (
        <Spinner className="flex py-8" />
      ) : listings.length === 0 ? (
        <EmptyNote icon={PackageSearch} body={t.browse.empty} />
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))] xl:grid-cols-[repeat(3,minmax(0,1fr))]">
          {listings.map((l) => (
            <MarketCard key={l.listingId} listing={l} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function MarketCard({ listing: l }: { listing: MarketListing }) {
  const { workspace } = useDashboard();
  const t = useMessages(marketMessages);
  const labels = useMessages(catalogLabels);
  const f = useFormat();
  const [offering, setOffering] = useState(false);
  const name = residueLabel(labels.residues, l);
  const canBuy = workspace.kind === "factory" && workspace.role !== "inspector";

  return (
    <li className={cn(CARD, "flex flex-col")}>
      <LotPhoto urls={l.photoUrls} alt={name} className="aspect-[4/3] w-full" />
      <p className="mt-3 truncate text-[16px] font-semibold">{name}</p>
      <p className="mt-0.5 text-[15px]">
        <span className="font-semibold" dir="ltr">{f.dzd(l.priceDzdPerKg)}</span> <span className="text-muted-foreground">{t.perKg}</span>
      </p>
      <p className="mt-1 text-[13px] text-muted-foreground">{fill(t.browse.available, { kg: f.kg(l.remainingKg) })}</p>
      <p className="mt-0.5 flex items-center gap-1 truncate text-[13px] text-muted-foreground">
        <MapPin className="size-3.5 shrink-0" /> {l.region} · {fill(t.browse.from, { name: l.sellerName })}
      </p>
      {l.note ? <p className="mt-2 line-clamp-3 text-[14px] leading-relaxed text-foreground/80">{l.note}</p> : null}
      <div className="mt-auto pt-3">
        {offering ? (
          <OfferForm listing={l} onDone={() => setOffering(false)} />
        ) : canBuy ? (
          <button type="button" onClick={() => setOffering(true)} className={cn(PRIMARY, "w-full")}>
            <HandCoins className="size-4" /> {t.browse.offer}
          </button>
        ) : null}
      </div>
    </li>
  );
}

function OfferForm({ listing: l, onDone }: { listing: MarketListing; onDone: () => void }) {
  const { workspace } = useDashboard();
  const t = useMessages(marketMessages);
  const f = useFormat();
  const fail = useFail();
  const make = useMutation(api.market.makeOffer);
  const [quantity, setQuantity] = useState(String(l.remainingKg));
  const [price, setPrice] = useState(String(l.priceDzdPerKg));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const subtotal = Math.round(num(quantity) * num(price) * 100) / 100;
  const ok = Number.isFinite(subtotal) && subtotal > 0;
  const fee = ok ? Math.round(subtotal * MARKET_FEE_RATE) : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await make({ companyId: workspace.companyId, listingId: l.listingId, quantityKg: num(quantity), priceDzdPerKg: num(price), message });
      toast.success(t.offerForm.sent);
      onDone();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.form initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} onSubmit={submit} className="space-y-2.5 rounded-xl bg-[#eef2ff] p-3">
      <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2">
        <label className="block text-[13px] font-medium">
          {t.offerForm.quantity}
          <Input inputMode="numeric" dir="ltr" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={cn(FIELD, "mt-1 h-10 rtl:text-end")} />
        </label>
        <label className="block text-[13px] font-medium">
          {t.offerForm.price}
          <Input inputMode="decimal" dir="ltr" value={price} onChange={(e) => setPrice(e.target.value)} className={cn(FIELD, "mt-1 h-10 rtl:text-end")} />
        </label>
      </div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={2}
        maxLength={1000}
        aria-label={t.offerForm.message}
        placeholder={t.offerForm.messagePlaceholder}
        className={AREA}
      />
      <dl className="space-y-1 text-[13px]">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">{t.offerForm.subtotal}</dt>
          <dd dir="ltr">{ok ? f.dzd(subtotal) : "–"}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">{t.offerForm.fee}</dt>
          <dd dir="ltr">{ok ? f.dzd(fee) : "–"}</dd>
        </div>
        <div className="flex justify-between gap-2 border-t border-foreground/10 pt-1 text-[14px] font-semibold">
          <dt>{t.offerForm.total}</dt>
          <dd dir="ltr">{ok ? f.dzd(Math.round((subtotal + fee) * 100) / 100) : "–"}</dd>
        </div>
      </dl>
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={cn(PRIMARY, "h-9 flex-1 px-4")}>
          {busy ? <Spinner size="sm" label={null} /> : t.offerForm.send}
        </button>
        <button type="button" onClick={onDone} className={cn(QUIET, "h-9")}>
          {t.offerForm.cancel}
        </button>
      </div>
    </motion.form>
  );
}

export function useMyOffers(): MyOffer[] | undefined {
  const { workspace, guest } = useDashboard();
  const live = useQuery(api.market.myOffers, guest ? "skip" : { companyId: workspace.companyId });
  return guest ? [] : live;
}

export function MyOffers({ id }: { id?: string }) {
  const { workspace } = useDashboard();
  const t = useMessages(marketMessages);
  const labels = useMessages(catalogLabels);
  const f = useFormat();
  const fail = useFail();
  const withdraw = useMutation(api.market.withdrawOffer);
  const offers = useMyOffers();
  const [busy, setBusy] = useState<string | null>(null);
  const canAct = workspace.role !== "inspector";

  async function doWithdraw(offerId: MyOffer["offerId"]) {
    setBusy(offerId);
    try {
      await withdraw({ offerId });
      toast.success(t.offers.withdrawn);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Panel id={id} title={t.offers.title}>
      {offers === undefined ? (
        <Spinner className="flex py-8" />
      ) : offers.length === 0 ? (
        <EmptyNote icon={HandCoins} body={t.offers.empty} />
      ) : (
        <ul className="space-y-2.5">
          {offers.map((o) => (
            <li key={o.offerId} className={CARD}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold">{residueLabel(labels.residues, o)}</p>
                  <p className="truncate text-[13px] text-muted-foreground">
                    {o.sellerName} · {o.sellerRegion}
                  </p>
                </div>
                <Chip tone={o.status === "pending" ? "amber" : o.status === "accepted" ? "green" : "grey"}>{t.offers.status[o.status]}</Chip>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[14px]" dir="ltr">
                  <bdi>{f.kg(o.quantityKg)}</bdi> · <bdi>{f.dzdKg(o.priceDzdPerKg)}</bdi> · <span className="font-semibold"><bdi>{f.dzd(o.totalDzd)}</bdi></span>
                </p>
                {o.status === "pending" && canAct ? (
                  <button type="button" disabled={busy === o.offerId} onClick={() => doWithdraw(o.offerId)} className={cn(QUIET, "h-8 px-3 text-[13px]")}>
                    {busy === o.offerId ? <Spinner size="sm" label={null} /> : t.offers.withdraw}
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ---------- Both: sales ---------- */

export function SalesPanel({ id }: { id?: string }) {
  const { workspace, guest } = useDashboard();
  const t = useMessages(marketMessages);
  const labels = useMessages(catalogLabels);
  const f = useFormat();
  const live = useQuery(api.market.mySales, guest ? "skip" : { companyId: workspace.companyId });
  const sales = guest ? SAMPLE_SALES : live;

  return (
    <Panel id={id} title={t.sales.title}>
      {sales === undefined ? (
        <Spinner className="flex py-8" />
      ) : sales.length === 0 ? (
        <EmptyNote icon={Receipt} body={workspace.kind === "farm" ? t.sales.emptyFarm : t.sales.emptyFactory} />
      ) : (
        <ul className="space-y-2.5">
          {sales.map((s) => (
            <li key={s.saleId} className={CARD}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold">{residueLabel(labels.residues, s)}</p>
                  <p className="truncate text-[13px] text-muted-foreground">
                    {fill(s.side === "sold" ? t.sales.sold : t.sales.bought, { name: s.otherName })} · {s.otherRegion}
                  </p>
                </div>
                <a
                  href={`tel:${s.otherPhone.replace(/[^\d+]/g, "")}`}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#e6edff] px-3 py-1.5 text-[13px] font-medium text-azure"
                >
                  <Phone className="size-3.5" /> {t.sales.call}
                </a>
              </div>
              <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="text-[14px]" dir="ltr">
                  <bdi>{f.kg(s.quantityKg)}</bdi> · <bdi>{f.dzdKg(s.priceDzdPerKg)}</bdi> · <span className="font-semibold"><bdi>{f.dzd(s.totalDzd)}</bdi></span>
                </p>
                <p className="text-[13px] text-muted-foreground">{f.date(s.createdAt)}</p>
              </div>
              {s.side === "bought" ? <p className="mt-1 text-[13px] text-muted-foreground">{fill(t.sales.fee, { fee: f.dzd(s.feeDzd) })}</p> : null}
              <p dir="ltr" className="mt-1 text-[13px] text-muted-foreground rtl:text-end">
                {s.otherPhone}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
