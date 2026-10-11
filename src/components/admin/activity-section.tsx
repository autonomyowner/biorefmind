"use client";

import { useQuery } from "convex/react";

import { EMPTY, fmtTime, SECTION } from "@/components/admin/admin-shared";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/backend";

/** Admin log actions in plain words; unknown ones show as stored. */
const ACTION: Record<string, string> = {
  "lot.create": "Posted a lot",
  "lot.update": "Edited a lot",
  "lot.open": "Reopened a lot",
  "lot.sold": "Marked a lot sold",
  "lot.withdrawn": "Withdrew a lot",
  "lot.moderated": "Took down a lot",
  "lab.extend": "Extended a lab",
  "lab.paid_until": "Set a lab's paid date",
  "lab.end": "Ended a lab plan",
  "inquiry.new": "Interest request: new",
  "inquiry.contacted": "Interest request: contacted",
  "inquiry.closed": "Interest request: closed",
};

const actionLabel = (action: string) => ACTION[action] ?? action;

/** The latest 100 admin actions. */
export function ActivitySection() {
  const rows = useQuery(api.admin.activity, {});
  return (
    <section id="activity" className={SECTION}>
      <h2 className="text-[19px] font-semibold">Activity</h2>
      <p className="mt-1 text-[14px] text-muted-foreground">The latest 100 actions taken by admins.</p>
      {!rows ? (
        <Spinner className="flex py-8" />
      ) : rows.length === 0 ? (
        <p className={EMPTY}>No admin actions yet.</p>
      ) : (
        <ol className="mt-4 divide-y divide-foreground/5 overflow-hidden rounded-2xl border border-white bg-white/60">
          {rows.map((r) => (
            <li key={r.logId} className="grid grid-cols-[minmax(0,1fr)] gap-1 px-4 py-3 text-[14px] md:grid-cols-[11rem_minmax(0,14rem)_minmax(0,1fr)] md:gap-4">
              <p className="whitespace-nowrap text-[13px] text-muted-foreground tabular-nums">{fmtTime(r.createdAt)}</p>
              <p className="min-w-0">
                <span className="font-medium">{actionLabel(r.action)}</span>
                <span className="block truncate text-[13px] text-muted-foreground">{r.email}</span>
              </p>
              <p className="min-w-0 break-words text-[13px] text-foreground/80">{r.detail}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
