"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";

import { cardRef } from "@/components/dashboard/assistant/cards";
import { useDashboard } from "@/components/dashboard/shell";
import { api } from "@/lib/backend";
import type { AssistantCardFull } from "@/lib/types";

type Full = NonNullable<AssistantCardFull>;

/**
 * The assistant card a page was opened with (`?card=<messageId>.<index>`), if it is of `type`.
 * `undefined` while loading, `null` when there is none. `done()` drops the parameter so a reload doesn't reopen it.
 */
export function useAssistantCard<T extends Full["type"]>(type: T): { card: Extract<Full, { type: T }> | null | undefined; done: () => void } {
  const { guest } = useDashboard();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const ref = cardRef(params.get("card"));
  const card = useQuery(api.assistant.card, ref && !guest ? { messageId: ref.messageId, index: ref.index } : "skip");

  const done = useCallback(() => {
    const next = new URLSearchParams(params.toString());
    next.delete("card");
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [params, pathname, router]);

  if (!ref || guest) return { card: null, done };
  if (card === undefined) return { card: undefined, done };
  return { card: card && card.type === type ? (card as Extract<Full, { type: T }>) : null, done };
}
