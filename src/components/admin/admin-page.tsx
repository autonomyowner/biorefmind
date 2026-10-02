"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/backend";
import { errorMessage } from "@/lib/errors";
import type { AdminOverview, Kind, Viewer } from "@/lib/types";
import { cn } from "@/lib/utils";

const KIND: Record<Kind, string> = { farm: "Farmer", lab: "Lab", factory: "Factory" };
const DAY = 86_400_000;

function fmt(ms?: number) {
  return ms ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(ms) : "—";
}

/** Plan status in plain words, as the admin needs it. */
function status(a: AdminOverview["accounts"][number], now: number) {
  if (a.kind === "farm") return "Free";
  if (a.kind === "factory") return "Enterprise (custom)";
  if (a.plan === "lab_paid") return (a.paidUntil ?? 0) > now ? `Paid until ${fmt(a.paidUntil)}` : `Expired ${fmt(a.paidUntil)}`;
  if ((a.trialEndsAt ?? 0) > now) return `Trial, ${Math.ceil(((a.trialEndsAt ?? now) - now) / DAY)} days left`;
  return `Trial ended ${fmt(a.trialEndsAt)}`;
}

/** Admin: every account, lab payments, enterprise requests. Admins only (others see "Page not found"). */
export function AdminPage() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const viewer = useQuery(api.users.viewer, isAuthenticated ? {} : "skip") as Viewer | undefined;
  const overview = useQuery(api.admin.overview, viewer?.isAdmin ? {} : "skip") as AdminOverview | undefined;
  const [now] = useState(() => Date.now());

  if (isLoading || (isAuthenticated && viewer === undefined)) return <Spinner className="flex flex-1 items-center" />;
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

  const counts = overview
    ? (["farm", "lab", "factory"] as Kind[]).map((k) => ({ k, n: overview.accounts.filter((a) => a.kind === k).length }))
    : [];

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/dashboard" className="flex items-center gap-2 text-[20px] font-bold tracking-[-0.02em] text-[#08263f]">
          <Image src="/logo-mark.png" alt="" width={77} height={77} className="size-8" />
          BiorefMind · Admin
        </Link>
        <Link href="/dashboard" className="rounded-full border border-foreground/15 bg-white/60 px-4 py-2 text-[14px] font-medium">
          Back to dashboard
        </Link>
      </header>

      {!overview ? (
        <Spinner className="flex py-20" />
      ) : (
        <>
          <ul className="mt-8 grid gap-4 sm:grid-cols-3">
            {counts.map(({ k, n }) => (
              <li key={k} className="glass rounded-[24px] p-5">
                <p className="text-[14px] text-muted-foreground">{KIND[k]} accounts</p>
                <p className="mt-1 text-[36px] font-semibold tracking-[-0.03em] tabular-nums">{n}</p>
              </li>
            ))}
          </ul>

          <section className="glass mt-6 overflow-hidden rounded-[28px]">
            <h2 className="px-6 pt-6 text-[19px] font-semibold">Accounts</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-[14px]">
                <thead className="border-y border-border bg-white/40 text-[12px] uppercase tracking-[0.08em] text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3 font-medium">Type</th>
                    <th className="px-3 py-3 font-medium">Name</th>
                    <th className="px-3 py-3 font-medium">Owner</th>
                    <th className="px-3 py-3 font-medium">Region · Phone</th>
                    <th className="px-3 py-3 font-medium">Plan</th>
                    <th className="px-3 py-3 font-medium">Joined</th>
                    <th className="px-6 py-3 font-medium">Lab payment</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.accounts.map((a) => (
                    <tr key={a.companyId} className="border-b border-border/70 last:border-0">
                      <td className="px-6 py-3">
                        <span className="rounded-full bg-[#e6edff] px-2.5 py-1 text-[12px] font-medium text-azure">{KIND[a.kind]}</span>
                      </td>
                      <td className="px-3 py-3 font-medium">{a.name}</td>
                      <td className="px-3 py-3">{a.ownerEmail}</td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {a.region} · <span dir="ltr">{a.phone}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn(a.kind === "lab" && !a.listed && "text-destructive")}>{status(a, now)}</span>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{fmt(a.createdAt)}</td>
                      <td className="px-6 py-3">{a.kind === "lab" ? <MarkPaid companyId={a.companyId} /> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="glass mt-6 rounded-[28px] p-6">
            <h2 className="text-[19px] font-semibold">Enterprise requests</h2>
            {overview.requests.length === 0 ? (
              <p className="mt-3 text-[14px] text-muted-foreground">No requests yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {overview.requests.map((r) => (
                  <li key={r._id} className="rounded-2xl border border-white bg-white/70 p-4">
                    <p className="text-[14px] text-muted-foreground">
                      <span className="font-semibold text-foreground">{r.company}</span> · {r.email} · <span dir="ltr">{r.phone}</span> · {fmt(r.createdAt)}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-[15px]">{r.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}

/** Date input + "Mark paid": the lab is listed until the end of that day. */
function MarkPaid({ companyId }: { companyId: AdminOverview["accounts"][number]["companyId"] }) {
  const setPaid = useMutation(api.admin.setLabPaidUntil);
  const [date, setDate] = useState(() => new Date(Date.now() + 30 * DAY).toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!date) return;
    setBusy(true);
    try {
      await setPaid({ companyId, paidUntil: new Date(`${date}T23:59:59`).getTime() });
      toast.success("Lab marked as paid.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        aria-label="Paid until"
        className="h-9 rounded-lg border border-foreground/15 bg-white/80 px-2 text-[13px]"
      />
      <button type="button" onClick={save} disabled={busy} className="btn-navy h-9 rounded-full px-4 text-[13px] font-semibold disabled:opacity-80">
        {busy ? "…" : "Mark paid"}
      </button>
    </div>
  );
}
