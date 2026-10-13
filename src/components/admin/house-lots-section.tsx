"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { MapPin, Pencil, Plus, UserRound, X } from "lucide-react";
import { toast } from "sonner";

import {
  AREA,
  CategoryBadge,
  EMPTY,
  FIELD,
  fmt,
  LotStatusPill,
  PRIMARY,
  QUIET,
  RESIDUE_EN,
  ROW,
  SECTION,
  TelLink,
  Thumb,
} from "@/components/admin/admin-shared";
import { dzd, kg, LotEditFields, PhotoPicker, useLotEdit, usePhotoUploads } from "@/components/admin/lot-editor";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/backend";
import { LOT_FRESH_KEYS, LOT_RESIDUE_KEYS, residueLabel, type Category } from "@/lib/catalog-labels";
import { errorMessage } from "@/lib/errors";
import { formatDzd, formatKg } from "@/lib/pricing";
import type { HouseLot } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_PHOTOS = 3;

/** Lots BiorefMind sells for farmers who are not on the platform. */
export function HouseLotsSection() {
  const lots = useQuery(api.adminLots.list, {});
  const [open, setOpen] = useState(false);

  return (
    <section id="lots" className={SECTION}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-semibold">
            BiorefMind lots {lots ? <span className="text-muted-foreground tabular-nums">· {lots.length}</span> : null}
          </h2>
          <p className="mt-1 max-w-[620px] text-[14px] text-muted-foreground">
            Lots BiorefMind sells for farmers who are not on the platform. Buyers see “BiorefMind partner farm #N”, never the
            farmer&apos;s name or phone.
          </p>
        </div>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={open ? QUIET : PRIMARY}>
          {open ? <X className="size-4" /> : <Plus className="size-4" />}
          {open ? "Close" : "Post a lot"}
        </button>
      </div>
      {open ? <NewLotForm onDone={() => setOpen(false)} /> : null}
      {!lots ? (
        <Spinner className="flex py-8" />
      ) : lots.length === 0 ? (
        <p className={EMPTY}>No BiorefMind lots yet. Post one for a farmer who is not on the platform.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {lots.map((l) => (
            <HouseLotRow key={l.listingId} lot={l} />
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------- Post a lot ---------- */

function NewLotForm({ onDone }: { onDone: () => void }) {
  const create = useMutation(api.adminLots.create);

  const [category, setCategory] = useState<Category>("residue");
  const [product, setProduct] = useState<string | null>(null);
  const [other, setOther] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [region, setRegion] = useState("");
  const [note, setNote] = useState("");
  const uploads = usePhotoUploads(MAX_PHOTOS);
  const [farmerName, setFarmerName] = useState("");
  const [farmerPhone, setFarmerPhone] = useState("");
  const [privateNote, setPrivateNote] = useState("");
  const [busy, setBusy] = useState(false);

  const keys = category === "fresh" ? LOT_FRESH_KEYS : LOT_RESIDUE_KEYS;
  const uploading = uploads.uploading;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (uploading) return;
    setBusy(true);
    try {
      const typed = other.trim();
      await create({
        category,
        ...(product === "other" || (!product && typed) ? { residue: "other", residueName: typed } : { residue: product ?? "" }),
        quantityKg: kg(quantity),
        priceDzdPerKg: dzd(price),
        region,
        note: note.trim() || undefined,
        photoIds: uploads.ids,
        farmerName,
        farmerPhone: farmerPhone.trim() || undefined,
        privateNote: privateNote.trim() || undefined,
      });
      toast.success("Lot posted. It is on the marketplace now.");
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4 rounded-2xl border border-white bg-white/55 p-4 sm:p-5">
      <p className="text-[16px] font-semibold">Post a lot</p>

      <fieldset>
        <legend className="mb-2 text-[14px] font-medium">What is it?</legend>
        <div className="inline-flex rounded-full border border-foreground/15 bg-white/70 p-0.5">
          {(
            [
              ["residue", "Residue"],
              ["fresh", "Fresh produce"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={category === value}
              onClick={() => {
                setCategory(value);
                setProduct(null);
              }}
              className={cn(
                "h-8 rounded-full px-4 text-[13px] font-medium transition-colors",
                category === value ? "bg-primary text-primary-foreground" : "hover:bg-white",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {keys.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={product === k}
              onClick={() => {
                setProduct(k);
                if (k !== "other") setOther("");
              }}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
                product === k ? "border-transparent bg-azure text-white" : "border-foreground/15 bg-white/70 hover:border-azure/50",
              )}
            >
              {RESIDUE_EN[k] ?? k}
            </button>
          ))}
        </div>
        {product === "other" || !product ? (
          <label className="mt-3 block text-[13px] text-muted-foreground">
            Not in the list? Type what it is
            <input
              value={other}
              onChange={(e) => {
                setOther(e.target.value);
                if (e.target.value.trim()) setProduct("other");
              }}
              maxLength={80}
              placeholder={category === "fresh" ? "e.g. Strawberries" : "e.g. Almond shells"}
              className={cn(FIELD, "mt-1.5 text-foreground")}
            />
          </label>
        ) : null}
      </fieldset>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))]">
        <label className="block text-[14px] font-medium">
          Quantity (kg)
          <input inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="2000" className={cn(FIELD, "mt-1.5")} />
        </label>
        <label className="block text-[14px] font-medium">
          Price (DA per kg)
          <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="15" className={cn(FIELD, "mt-1.5")} />
        </label>
        <label className="block text-[14px] font-medium">
          Region
          <input value={region} onChange={(e) => setRegion(e.target.value)} required placeholder="Biskra" className={cn(FIELD, "mt-1.5")} />
        </label>
      </div>

      <label className="block text-[14px] font-medium">
        Public note <span className="font-normal text-muted-foreground">(optional, buyers see it; no phone numbers)</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000} className={cn(AREA, "mt-1.5")} />
      </label>

      <PhotoPicker uploads={uploads} />

      <fieldset className="rounded-xl border border-dashed border-violet/30 bg-[#f4f1ff]/60 p-3 sm:p-4">
        <legend className="px-1 text-[13px] font-semibold text-violet">Private: only admins see this</legend>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
          <label className="block text-[14px] font-medium">
            Farmer name
            <input value={farmerName} onChange={(e) => setFarmerName(e.target.value)} required maxLength={80} className={cn(FIELD, "mt-1.5")} />
          </label>
          <label className="block text-[14px] font-medium">
            Farmer phone <span className="font-normal text-muted-foreground">(optional)</span>
            <input type="tel" dir="ltr" value={farmerPhone} onChange={(e) => setFarmerPhone(e.target.value)} placeholder="0550 12 34 56" className={cn(FIELD, "mt-1.5")} />
          </label>
        </div>
        <label className="mt-3 block text-[14px] font-medium">
          Private note <span className="font-normal text-muted-foreground">(optional)</span>
          <textarea value={privateNote} onChange={(e) => setPrivateNote(e.target.value)} rows={2} maxLength={1000} className={cn(AREA, "mt-1.5")} />
        </label>
      </fieldset>

      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onDone} className={QUIET}>
          Cancel
        </button>
        <button type="submit" disabled={busy || uploading} className={PRIMARY}>
          {busy ? <Spinner size="sm" label={null} /> : null}
          {uploading ? "Uploading photos…" : "Post the lot"}
        </button>
      </div>
    </form>
  );
}

/* ---------- One lot ---------- */

function HouseLotRow({ lot }: { lot: HouseLot }) {
  const setStatus = useMutation(api.adminLots.setStatus);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<"" | "open" | "sold" | "withdrawn">("");
  const [armed, setArmed] = useState(false);
  const name = residueLabel(RESIDUE_EN, lot);

  async function change(status: "open" | "sold" | "withdrawn") {
    if (status === "withdrawn" && !armed) return setArmed(true);
    setBusy(status);
    try {
      await setStatus({ listingId: lot.listingId, status });
      toast.success(status === "open" ? "Lot reopened." : status === "sold" ? "Marked sold." : "Lot withdrawn.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy("");
      setArmed(false);
    }
  }

  return (
    <li className={ROW}>
      <div className="flex min-w-0 gap-3 sm:gap-4">
        <Thumb url={lot.photoUrls[0]} alt={name} className="size-16 sm:size-20" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 truncate text-[16px] font-semibold">{name}</p>
            <CategoryBadge category={lot.category} />
            <LotStatusPill status={lot.status} />
          </div>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Partner farm #{lot.partnerNo ?? "?"} · posted {fmt(lot.createdAt)}
            {lot.photoUrls.length > 1 ? ` · ${lot.photoUrls.length} photos` : ""}
          </p>
          <p className="mt-1.5 text-[14px]">
            <span className="font-semibold tabular-nums">{formatDzd(lot.priceDzdPerKg, "en")}/kg</span>
            <span className="text-muted-foreground">
              {" "}
              · {formatKg(lot.remainingKg, "en")} left of {formatKg(lot.quantityKg, "en")}
            </span>
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[13px] text-muted-foreground">
            <MapPin className="size-3 shrink-0" /> {lot.region}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
        <div className="min-w-0 rounded-xl border border-violet/20 bg-[#f4f1ff]/60 p-3 text-[13px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-violet">Farmer (private)</p>
          <p className="mt-0.5 flex items-center gap-1 font-medium">
            <UserRound className="size-3.5 shrink-0" /> <span className="truncate">{lot.farmerName}</span>
          </p>
          <TelLink phone={lot.farmerPhone} />
          {lot.privateNote ? <p className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">{lot.privateNote}</p> : null}
        </div>
        <div className="min-w-0 rounded-xl border border-foreground/10 bg-white/60 p-3 text-[13px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Interest</p>
          <p className="mt-0.5">
            <span className="font-semibold tabular-nums">{lot.inquiries.total}</span> {lot.inquiries.total === 1 ? "request" : "requests"}
            {lot.inquiries.new > 0 ? (
              <>
                {" · "}
                <a href="#interest" className="font-semibold text-azure">
                  {lot.inquiries.new} new
                </a>
              </>
            ) : null}
          </p>
          {lot.note ? <p className="mt-1 line-clamp-2 break-words text-muted-foreground">Public note: {lot.note}</p> : null}
        </div>
      </div>

      {editing ? <EditLot lot={lot} onDone={() => setEditing(false)} /> : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {!editing ? (
          <button type="button" onClick={() => setEditing(true)} className={QUIET}>
            <Pencil className="size-3.5" /> Edit
          </button>
        ) : null}
        {lot.status === "open" ? (
          <>
            <button type="button" onClick={() => change("sold")} disabled={busy !== ""} className={QUIET}>
              {busy === "sold" ? <Spinner size="sm" label={null} /> : null}
              Mark sold
            </button>
            <button
              type="button"
              onClick={() => change("withdrawn")}
              onBlur={() => setArmed(false)}
              disabled={busy !== ""}
              className={cn(
                "inline-flex h-9 items-center rounded-full border px-4 text-[13px] font-medium transition-colors",
                armed ? "border-transparent bg-destructive text-white" : "border-destructive/30 text-destructive hover:bg-destructive/5",
              )}
            >
              {busy === "withdrawn" ? "…" : armed ? "Confirm: withdraw" : "Withdraw"}
            </button>
          </>
        ) : (
          <button type="button" onClick={() => change("open")} disabled={busy !== ""} className={QUIET}>
            {busy === "open" ? <Spinner size="sm" label={null} /> : null}
            Reopen
          </button>
        )}
      </div>
    </li>
  );
}

/** Inline edit: only the fields that changed are sent; an empty note, phone or private note clears it. */
function EditLot({ lot, onDone }: { lot: HouseLot; onDone: () => void }) {
  const update = useMutation(api.adminLots.update);
  const edit = useLotEdit(lot, MAX_PHOTOS);
  const [farmerName, setFarmerName] = useState(lot.farmerName);
  const [farmerPhone, setFarmerPhone] = useState(lot.farmerPhone);
  const [privateNote, setPrivateNote] = useState(lot.privateNote);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (edit.uploads.uploading) return;
    const patch: Parameters<typeof update>[0] = { listingId: lot.listingId, ...edit.patch() };
    if (farmerName.trim() !== lot.farmerName) patch.farmerName = farmerName;
    if (farmerPhone.trim() !== lot.farmerPhone) patch.farmerPhone = farmerPhone.trim();
    if (privateNote.trim() !== lot.privateNote) patch.privateNote = privateNote.trim();
    if (Object.keys(patch).length === 1) return onDone();
    setBusy(true);
    try {
      await update(patch);
      toast.success("Lot updated.");
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="mt-3 space-y-3 rounded-xl border border-white bg-white/60 p-3 sm:p-4">
      <LotEditFields edit={edit} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
        <label className="block text-[13px] font-medium">
          Farmer name (private)
          <input value={farmerName} onChange={(e) => setFarmerName(e.target.value)} maxLength={80} className={cn(FIELD, "mt-1")} />
        </label>
        <label className="block text-[13px] font-medium">
          Farmer phone (private)
          <input type="tel" dir="ltr" value={farmerPhone} onChange={(e) => setFarmerPhone(e.target.value)} className={cn(FIELD, "mt-1")} />
        </label>
      </div>
      <label className="block text-[13px] font-medium">
        Private note
        <textarea value={privateNote} onChange={(e) => setPrivateNote(e.target.value)} rows={2} maxLength={1000} className={cn(AREA, "mt-1")} />
      </label>
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onDone} className={QUIET}>
          Cancel
        </button>
        <button type="submit" disabled={busy || edit.uploads.uploading} className={PRIMARY}>
          {busy ? <Spinner size="sm" label={null} /> : null}
          {edit.uploads.uploading ? "Uploading photos…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
