"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";

import { AREA, FIELD, RESIDUE_EN } from "@/components/admin/admin-shared";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/backend";
import { LOT_FRESH_KEYS, LOT_RESIDUE_KEYS, type Category } from "@/lib/catalog-labels";
import { formatKg } from "@/lib/pricing";
import { shrinkImage } from "@/lib/shrink-image";
import { cn } from "@/lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";

/** Kilograms: "1 200" / "1,200" → 1200. NaN when empty: the backend refuses it in its own words. */
export const kg = (s: string) => (s.trim() === "" ? Number.NaN : Number(s.replace(/[\s,]/g, "")));
/** DA per kg: "12,5" or "12.5" → 12.5. */
export const dzd = (s: string) => (s.trim() === "" ? Number.NaN : Number(s.replace(/\s/g, "").replace(",", ".")));

/** A photo in a form: already on the lot or uploaded (storageId), or still uploading. */
export type Upload = { key: string; preview: string; storageId?: Id<"_storage"> };

/** The lot as the edit form starts from (admin.openLots and adminLots.list both carry these). */
export type EditableLot = {
  category: string;
  residue: string;
  residueName?: string;
  quantityKg: number;
  remainingKg: number;
  priceDzdPerKg: number;
  region: string;
  note?: string;
  photos: { storageId: Id<"_storage">; url: string }[];
};

/** The fields admin.editLot / adminLots.update take; only what changed is filled in. */
export type LotPatch = {
  category?: string;
  residue?: string;
  residueName?: string;
  priceDzdPerKg?: number;
  remainingKg?: number;
  region?: string;
  note?: string;
  photoIds?: Id<"_storage">[];
};

/** Photos picked in a form, shrunk to 1600 px and uploaded through the admin's upload URL, up to `max`. */
export function usePhotoUploads(max: number, initial: Upload[] = []) {
  const uploadUrl = useMutation(api.adminLots.uploadUrl);
  const [photos, setPhotos] = useState<Upload[]>(initial);

  async function add(files: FileList | null) {
    const chosen = Array.from(files ?? [])
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, max - photos.length);
    for (const file of chosen) {
      const key = `${file.name}-${file.size}-${Math.random()}`;
      setPhotos((p) => [...p, { key, preview: URL.createObjectURL(file) }]);
      try {
        const [url, blob] = await Promise.all([uploadUrl({}), shrinkImage(file, 1600)]);
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": blob.type || "image/jpeg" }, body: blob });
        if (!res.ok) throw new Error("upload");
        const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
        setPhotos((p) => p.map((x) => (x.key === key ? { ...x, storageId } : x)));
      } catch {
        setPhotos((p) => p.filter((x) => x.key !== key));
        toast.error("A photo could not be uploaded. Please try again.");
      }
    }
  }

  const remove = (key: string) => setPhotos((all) => all.filter((x) => x.key !== key));
  const uploading = photos.some((p) => !p.storageId);
  const ids = photos.flatMap((p) => (p.storageId ? [p.storageId] : []));
  return { photos, add, remove, uploading, ids, max };
}

export function PhotoPicker({ uploads }: { uploads: ReturnType<typeof usePhotoUploads> }) {
  const { photos, add, remove, max } = uploads;
  return (
    <div>
      <p className="mb-2 text-[13px] font-medium">
        Photos <span className="font-normal text-muted-foreground">(up to {max}; removed photos are deleted when you save)</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {photos.map((p) => (
          <div key={p.key} className="relative size-20 overflow-hidden rounded-xl bg-white">
            {/* A stored photo or a local preview (blob: URL), so not through the image optimizer. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.preview} alt="" className="size-full object-cover" />
            {p.storageId ? (
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() => remove(p.key)}
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
        {photos.length < max ? (
          <label className="flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-azure/40 bg-white/60 text-[11px] font-medium text-azure transition-colors hover:bg-white">
            <ImagePlus className="size-5" strokeWidth={1.8} />
            Add photo
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                void add(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        ) : null}
      </div>
    </div>
  );
}

/** The editable state of a lot's own fields; `patch()` lists only what changed. */
export function useLotEdit(lot: EditableLot, maxPhotos: number) {
  const [category, setCategory] = useState<Category>(lot.category === "fresh" ? "fresh" : "residue");
  const [product, setProduct] = useState<string | null>(lot.residueName ? "other" : lot.residue);
  const [other, setOther] = useState(lot.residueName ?? "");
  const [price, setPrice] = useState(String(lot.priceDzdPerKg));
  const [left, setLeft] = useState(String(lot.remainingKg));
  const [region, setRegion] = useState(lot.region);
  const [note, setNote] = useState(lot.note ?? "");
  const uploads = usePhotoUploads(
    maxPhotos,
    lot.photos.map((p) => ({ key: p.storageId, preview: p.url, storageId: p.storageId })),
  );

  function patch(): LotPatch {
    const out: LotPatch = {};
    const typed = other.trim();
    const residue = product === "other" || (!product && typed) ? "other" : (product ?? "");
    const residueName = residue === "other" ? typed : undefined;
    if (category !== (lot.category === "fresh" ? "fresh" : "residue") || residue !== lot.residue || residueName !== lot.residueName) {
      Object.assign(out, { category, residue, residueName });
    }
    if (dzd(price) !== lot.priceDzdPerKg) out.priceDzdPerKg = dzd(price);
    if (kg(left) !== lot.remainingKg) out.remainingKg = kg(left);
    if (region.trim() !== lot.region) out.region = region;
    if (note.trim() !== (lot.note ?? "")) out.note = note.trim();
    if (uploads.ids.join() !== lot.photos.map((p) => p.storageId).join()) out.photoIds = uploads.ids;
    return out;
  }

  const fields = { category, setCategory, product, setProduct, other, setOther, price, setPrice, left, setLeft, region, setRegion, note, setNote };
  return { fields, uploads, patch, quantityKg: lot.quantityKg };
}

/** Product, price, kg left, region, public note and photos of a lot. */
export function LotEditFields({ edit }: { edit: ReturnType<typeof useLotEdit> }) {
  const f = edit.fields;
  const keys = f.category === "fresh" ? LOT_FRESH_KEYS : LOT_RESIDUE_KEYS;
  return (
    <>
      <fieldset>
        <legend className="mb-2 text-[13px] font-medium">Product</legend>
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
              aria-pressed={f.category === value}
              onClick={() => {
                if (value === f.category) return;
                f.setCategory(value);
                f.setProduct(null);
              }}
              className={cn(
                "h-8 rounded-full px-4 text-[13px] font-medium transition-colors",
                f.category === value ? "bg-primary text-primary-foreground" : "hover:bg-white",
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
              aria-pressed={f.product === k}
              onClick={() => {
                f.setProduct(k);
                if (k !== "other") f.setOther("");
              }}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
                f.product === k ? "border-transparent bg-azure text-white" : "border-foreground/15 bg-white/70 hover:border-azure/50",
              )}
            >
              {RESIDUE_EN[k] ?? k}
            </button>
          ))}
        </div>
        {f.product === "other" || !f.product ? (
          <label className="mt-3 block text-[13px] text-muted-foreground">
            Not in the list? Type what it is
            <input
              value={f.other}
              onChange={(e) => {
                f.setOther(e.target.value);
                if (e.target.value.trim()) f.setProduct("other");
              }}
              maxLength={80}
              placeholder={f.category === "fresh" ? "e.g. Strawberries" : "e.g. Almond shells"}
              className={cn(FIELD, "mt-1.5 text-foreground")}
            />
          </label>
        ) : null}
      </fieldset>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))]">
        <label className="block text-[13px] font-medium">
          Price (DA per kg)
          <input inputMode="decimal" value={f.price} onChange={(e) => f.setPrice(e.target.value)} className={cn(FIELD, "mt-1")} />
        </label>
        <label className="block text-[13px] font-medium">
          Kg left <span className="font-normal text-muted-foreground">(of {formatKg(edit.quantityKg, "en")})</span>
          <input inputMode="numeric" value={f.left} onChange={(e) => f.setLeft(e.target.value)} className={cn(FIELD, "mt-1")} />
        </label>
        <label className="block text-[13px] font-medium">
          Region
          <input value={f.region} onChange={(e) => f.setRegion(e.target.value)} className={cn(FIELD, "mt-1")} />
        </label>
      </div>
      <label className="block text-[13px] font-medium">
        Public note <span className="font-normal text-muted-foreground">(buyers see it; no phone numbers)</span>
        <textarea value={f.note} onChange={(e) => f.setNote(e.target.value)} rows={2} maxLength={1000} className={cn(AREA, "mt-1")} />
      </label>
      <PhotoPicker uploads={edit.uploads} />
    </>
  );
}
