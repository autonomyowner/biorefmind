"use client";

import { useQuery } from "convex/react";

import { CategoryBadge, EMPTY, fmt, RESIDUE_EN, SECTION, TelLink } from "@/components/admin/admin-shared";
import { CountUp } from "@/components/motion";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/backend";
import { residueLabel } from "@/lib/catalog-labels";
import { formatDzd, formatKg } from "@/lib/pricing";
import type { AdminSales } from "@/lib/types";

/** Every sale with the fees on both sides (5% from the buyer, 5% from the seller) and both phones. Amounts in dinars. */
export function MarketSection() {
  const sales = useQuery(api.admin.sales, {}) as AdminSales | undefined;
  const figures = sales
    ? [
        { label: "Sales", value: <CountUp value={sales.count} /> },
        { label: "Value traded", value: formatDzd(sales.totalDzd, "en") },
        { label: "Fees from buyers (5%)", value: formatDzd(sales.feeDzd, "en") },
        { label: "Fees from sellers (5%)", value: formatDzd(sales.sellerFeeDzd, "en") },
        { label: "Total fees", value: formatDzd(sales.feeDzd + sales.sellerFeeDzd, "en") },
      ]
    : [];
  return (
    <section id="market" className={SECTION}>
      <h2 className="text-[19px] font-semibold">Marketplace</h2>
      <p className="mt-1 text-[14px] text-muted-foreground">
        Accepted offers between sellers and factories. Only BiorefMind sees the phones: call both sides to arrange pickup and
        payment. Fees are recorded per sale; invoicing is done by BiorefMind outside the platform for now.
      </p>
      {!sales ? (
        <Spinner className="flex py-8" />
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 lg:grid-cols-[repeat(5,minmax(0,1fr))]">
            {figures.map((f, i) => (
              <div key={f.label} className={i === 4 ? "col-span-2 min-w-0 rounded-2xl btn-navy p-4 lg:col-span-1" : "min-w-0 rounded-2xl border border-white bg-white/70 p-4"}>
                <dt className={i === 4 ? "text-[13px] text-white/70" : "text-[13px] text-muted-foreground"}>{f.label}</dt>
                <dd className="mt-1 truncate text-[22px] font-semibold tracking-[-0.02em] tabular-nums">{f.value}</dd>
              </div>
            ))}
          </dl>
          {sales.recent.length === 0 ? (
            <p className={EMPTY}>No sales yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-white bg-white/60">
              <table className="w-full min-w-[860px] text-start text-[14px]">
                <thead className="text-[13px] text-muted-foreground">
                  <tr className="border-b border-foreground/10">
                    {["Date", "Product", "Seller", "Buyer", "Quantity", "Total", "Buyer fee", "Seller fee"].map((h) => (
                      <th key={h} className="whitespace-nowrap px-4 py-2.5 text-start font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sales.recent.map((s) => (
                    <tr key={s.saleId} className="border-b border-foreground/5 align-top last:border-0">
                      <td className="whitespace-nowrap px-4 py-2.5">{fmt(s.createdAt)}</td>
                      <td className="px-4 py-2.5">
                        {residueLabel(RESIDUE_EN, s)}
                        {s.category === "fresh" ? <CategoryBadge category="fresh" className="ms-1.5" /> : null}
                      </td>
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
                      <td className="whitespace-nowrap px-4 py-2.5 font-medium tabular-nums">{formatDzd(s.sellerFeeDzd, "en")}</td>
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
