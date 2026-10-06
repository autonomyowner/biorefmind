import { defineMessages } from "@/i18n/messages";

/** The "Lab-tested" badge on marketplace lots (public page and the factory's Browse). */
export const labBadgeMessages = defineMessages({
  en: {
    tested: "Lab-tested",
    by: "by {lab}",
    score: "Score {score}",
    route: "Route {route}",
    routes: { A: "pharmaceutical", B: "food-grade", C: "recovery" },
    disclaimer: "Results apply only to the sample tested. Score by BiorefMind, not by the lab.",
    view: "View certificate",
  },
  ar: {
    tested: "محلَّلة في مختبر",
    by: "لدى {lab}",
    score: "التقييم {score}",
    route: "المسار {route}",
    routes: { A: "صيدلاني", B: "غذائي", C: "استرجاع" },
    disclaimer: "تخص النتائج العيّنة المحلَّلة فقط. التقييم من BiorefMind وليس من المختبر.",
    view: "عرض الشهادة",
  },
});
