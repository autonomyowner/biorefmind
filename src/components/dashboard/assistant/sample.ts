import type { Id } from "../../../../convex/_generated/dataModel";
import type { AssistantMessage } from "@/lib/types";

// The guest preview's conversation (a farm). No backend call; the composer is disabled.

const NOW = Date.UTC(2026, 9, 6, 10);
const id = <T extends "aiMessages" | "_storage">(s: string) => s as Id<T>;

export const SAMPLE_CHAT: Record<"en" | "ar", AssistantMessage[]> = {
  en: [
    {
      messageId: id("gq1"),
      role: "user",
      text: "I have about 1.2 tonnes of dried pomegranate peels. What could I ask for them?",
      photos: [],
      steps: [],
      cards: [],
      status: "done",
      createdAt: NOW,
    },
    {
      messageId: id("ga1"),
      role: "assistant",
      text:
        "Here is what the market looks like right now for **pomegranate peels**:\n\n| | DA per kg |\n|---|---|\n| Lowest asking price | 14 |\n| Median | 17 |\n| Highest | 22 |\n\nThese are **asking prices** of 6 open lots, not sale prices. Well-dried peels with a lab test showing high punicalagin usually sit at the top of that range.\n\nI prepared a listing at **18 DA/kg**: check it and post it when you're happy.",
      photos: [],
      steps: [{ tool: "price_guide", detail: undefined }, { tool: "propose_listing", detail: undefined }],
      cards: [{ type: "listing", residue: "pomegranate_peels", quantityKg: 1200, priceDzdPerKg: 18, note: "Sun-dried, in 25 kg bags.", photoIds: [] }],
      status: "done",
      createdAt: NOW + 1,
    },
  ],
  ar: [
    {
      messageId: id("gq1"),
      role: "user",
      text: "عندي حوالي 1.2 طن من قشور الرمان المجففة. بكم يمكنني بيعها؟",
      photos: [],
      steps: [],
      cards: [],
      status: "done",
      createdAt: NOW,
    },
    {
      messageId: id("ga1"),
      role: "assistant",
      text:
        "هذا وضع السوق حاليًا لـ **قشور الرمان**:\n\n| | دج للكيلوغرام |\n|---|---|\n| أدنى سعر مطلوب | 14 |\n| الوسيط | 17 |\n| أعلى سعر | 22 |\n\nهذه **أسعار مطلوبة** لـ 6 دفعات معروضة، وليست أسعار بيع. القشور الجيدة التجفيف مع تحليل يُظهر نسبة عالية من البونيكالاجين تكون عادةً في أعلى هذا المجال.\n\nحضّرتُ لك إدراجًا بسعر **18 دج/كغ**: راجعه وانشره عندما تكون راضيًا.",
      photos: [],
      steps: [{ tool: "price_guide", detail: undefined }, { tool: "propose_listing", detail: undefined }],
      cards: [{ type: "listing", residue: "pomegranate_peels", quantityKg: 1200, priceDzdPerKg: 18, note: "مجففة تحت الشمس، في أكياس 25 كغ.", photoIds: [] }],
      status: "done",
      createdAt: NOW + 1,
    },
  ],
};
