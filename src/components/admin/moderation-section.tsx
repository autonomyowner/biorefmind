"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { MapPin, Search } from "lucide-react";
import { toast } from "sonner";

import { CategoryBadge, EMPTY, FIELD, fmt, RESIDUE_EN, ROW, SECTION, TelLink, Thumb } from "@/components/admin/admin-shared";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/backend";
import { residueLabel } from "@/lib/catalog-labels";
import { errorMessage } from "@/lib/errors";
import { formatDzd, formatKg } from "@/lib/pricing";
import type { AdminOpenLot } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Every open lot on the marketplace with the real seller, so the admin can take down spam or wrong lots. */
export function ModerationSection() {
  const lots = useQuery(api.admin.openLots, {});
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const rows = (lots ?? []).filter(
    (l) => !q || [residueLabel(RESIDUE_EN, l), l.seller, l.region].some((f) => f.toLowerCase().includes(q)),
  );

  return (
    <section id="moderation" className={SECTION}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-semibold">
            All open lots {lots ? <span className="text-muted-foreground tabular-nums">· {rows.length}</span> : null}
          </h2>
          <p className="mt-1 max-w-[560px] text-[14px] text-muted-foreground">
            Everything for sale right now, with the real seller. Take down a lot that is spam, wrong or abusive: its pending
            offers are declined and the farm sees your reason.
          </p>
        </div>
        <label className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search product, seller, region"
            aria-label="Search open lots"
            className="h-10 w-full rounded-full border border-foreground/15 bg-white/80 ps-9 pe-4 text-[14px] outline-none focus-visible:border-azure/60 focus-visible:ring-2 focus-visible:ring-azure/20"
          />
        </label>
      </div>
      {!lots ? (
        <Spinner className="flex py-8" />
      ) : rows.length === 0 ? (
        <p className={EMPTY}>{lots.length === 0 ? "No open lots right now." : "No lots match."}</p>
      ) : (
        <ul className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[repeat(2,minmax(0,1fr))]">
          {rows.map((l) => (
            <OpenLotCard key={l.listingId} lot={l} />
          ))}
        </ul>
      )}
    </section>
  );
}

function OpenLotCard({ lot }: { lot: AdminOpenLot }) {
  const withdraw = useMutation(api.admin.withdrawLot);
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const name = residueLabel(RESIDUE_EN, lot);

  async function takeDown(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await withdraw({ listingId: lot.listingId, reason });
      toast.success("Lot taken down.");
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <li className={ROW}>
      <div className="flex min-w-0 gap-3">
        <Thumb url={lot.photoUrl} alt={name} className="size-16" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 truncate font-semibold">{name}</p>
            <CategoryBadge category={lot.category} />
          </div>
          <p className="mt-0.5 text-[14px]">
            <span className="font-semibold tabular-nums">{formatDzd(lot.priceDzdPerKg, "en")}/kg</span>
            <span className="text-muted-foreground"> · {formatKg(lot.remainingKg, "en")} left</span>
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[13px] text-muted-foreground">
            <MapPin className="size-3 shrink-0" /> <span className="truncate">{lot.region}</span>
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-2 text-[13px]">
        <div className="min-w-0">
          <p className="truncate font-medium">{lot.seller || "—"}</p>
          <TelLink phone={lot.sellerPhone} />
          {lot.managed ? (
            <span className="mt-1 inline-flex rounded-full bg-[#efe9ff] px-2 py-0.5 text-[11px] font-semibold text-violet">
              BiorefMind lot · partner farm #{lot.partnerNo ?? "?"}
            </span>
          ) : null}
        </div>
        <p className="shrink-0 text-muted-foreground">
          {lot.managed ? "" : `${lot.pendingOffers} pending ${lot.pendingOffers === 1 ? "offer" : "offers"} · `}posted {fmt(lot.createdAt)}
        </p>
      </div>
      {lot.note ? <p className="mt-2 line-clamp-3 break-words text-[13px] text-muted-foreground">Note: {lot.note}</p> : null}

      {asking ? (
        <form onSubmit={takeDown} className="mt-3 space-y-2">
          <label className="block text-[13px] font-medium">
            Reason (the farm sees it)
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              minLength={2}
              maxLength={300}
              required
              autoFocus
              placeholder="Photos do not match the product"
              className={cn(FIELD, "mt-1")}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-destructive px-4 text-[13px] font-medium text-white disabled:opacity-80"
            >
              {busy ? <Spinner size="sm" label={null} /> : null}
              Confirm: take down
            </button>
            <button
              type="button"
              onClick={() => {
                setAsking(false);
                setReason("");
              }}
              className="inline-flex h-9 items-center rounded-full border border-foreground/15 bg-white/70 px-4 text-[13px] font-medium hover:bg-white"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAsking(true)}
          className="mt-3 inline-flex h-9 items-center rounded-full border border-destructive/30 px-4 text-[13px] font-medium text-destructive transition-colors hover:bg-destructive/5"
        >
          Take down
        </button>
      )}
    </li>
  );
}
