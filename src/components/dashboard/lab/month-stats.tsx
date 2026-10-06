"use client";

import { useState } from "react";
import { BadgeCheck, Inbox, Timer, Wallet, type LucideIcon } from "lucide-react";

import { CountUp } from "@/components/motion";
import { labMessages } from "@/components/dashboard/lab/lab-messages";
import { monthStats } from "@/components/dashboard/lab/lab-logic";
import { useLabQueue } from "@/components/dashboard/lab/ui";
import { useMessages } from "@/i18n/provider";

const group = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function Dash() {
  return <span className="text-muted-foreground">–</span>;
}

/** The four "This month" tiles of the lab home, worked out from the lab's queue. */
export function useMonthStats(): { icon: LucideIcon; label: string; value: React.ReactNode }[] {
  const t = useMessages(labMessages);
  const rows = useLabQueue();
  const [now] = useState(() => Date.now());
  const s = rows ? monthStats(rows, now) : null;
  return [
    { icon: Inbox, label: t.month.received, value: s ? <CountUp value={s.received} /> : <Dash /> },
    { icon: BadgeCheck, label: t.month.released, value: s ? <CountUp value={s.released} /> : <Dash /> },
    {
      icon: Timer,
      label: t.month.onTime,
      value: s && s.onTimePct !== null ? <span dir="ltr">{s.onTimePct}%</span> : <Dash />,
    },
    {
      icon: Wallet,
      label: t.month.money,
      value: s ? (
        <span dir="ltr" className="text-[17px] sm:text-[22px]">
          {group.format(s.paidDzd)}
          <span className="text-muted-foreground"> / {group.format(s.requestedDzd)}</span>
        </span>
      ) : (
        <Dash />
      ),
    },
  ];
}
