import { defineMessages } from "@/i18n/messages";

// Words of the Analytics page and the Overview charts (design §4–5). `{x}` marks a slot.

export const insightsMessages = defineMessages({
  en: {
    range: { label: "Period", d7: "7D", d30: "30D", d90: "90D" },
    chart: {
      thisPeriod: "This period",
      previous: "Previous period",
      prev: "prev.",
      less: "Less",
      more: "More",
      others: "Others",
      chartHint: "Use the arrow keys to read each day.",
    },
    change: {
      vs: "vs previous {days} days",
      none: "no earlier figures",
    },
    days: "{n} days",
    acceptance: "Acceptance {pct}",
    analytics: {
      title: "Analytics",
      subtitle: {
        farm: "How your sales are going, compared with the period before.",
        factory: "What you buy and what it costs, compared with the period before.",
        lab: "Your requests, results and revenue, compared with the period before.",
      },
    },
    kpi: {
      soldDzd: "Sold",
      soldKg: "Kilograms sold",
      sales: "Sales",
      avgDzdPerKg: "Average price per kg",
      spentDzd: "Spent",
      boughtKg: "Kilograms bought",
      offersSent: "Offers sent",
      requests: "Requests received",
      released: "Results released",
      revenueDzd: "Revenue",
      avgTurnaroundDays: "Average turnaround",
    },
    area: {
      farm: { title: "Sales per day", sub: "Dinars sold each day" },
      factory: { title: "Spending per day", sub: "Dinars spent each day, fee included" },
      lab: { title: "Requests per day", sub: "New requests each day" },
    },
    donut: {
      farm: { title: "Sales by residue", center: "sold" },
      factory: { title: "Spending by residue", center: "spent" },
      lab: { title: "Analyses requested", center: "analyses" },
    },
    top: {
      farm: { title: "Top buyers", one: "1 sale", many: "{n} sales" },
      factory: { title: "Top sellers", one: "1 purchase", many: "{n} purchases" },
      lab: { title: "Top clients", one: "1 request", many: "{n} requests" },
    },
    activity: {
      title: "Activity",
      farm: { sub: "Sales per day over the last 20 weeks", one: "1 sale", many: "{n} sales" },
      factory: { sub: "Offers and purchases per day over the last 20 weeks", one: "1 offer or purchase", many: "{n} offers and purchases" },
      lab: { sub: "Requests per day over the last 20 weeks", one: "1 request", many: "{n} requests" },
    },
    empty: {
      farm: "No sales in this period yet.",
      factory: "No purchases in this period yet.",
      lab: "No requests in this period yet.",
    },
    week: {
      title: "This week",
      main: { farm: "Sold in the last 7 days", factory: "Spent in the last 7 days", lab: "Requests in the last 7 days" },
      link: "Analytics",
      empty: "Nothing yet this week.",
    },
    ring: {
      title: { farm: "Sold of what you listed", factory: "Offers accepted", lab: "Results on time" },
      legend: {
        farm: { done: "Sold", rest: "Still listed" },
        factory: { done: "Accepted", rest: "Declined" },
        lab: { done: "On time", rest: "Late" },
      },
      sub: {
        farm: "All your lots so far, by weight",
        factory: "Offers that got an answer",
        lab: "Released results that had a due date",
      },
      empty: "Nothing to measure yet.",
    },
  },
  ar: {
    range: { label: "الفترة", d7: "7 أيام", d30: "30 يومًا", d90: "90 يومًا" },
    chart: {
      thisPeriod: "هذه الفترة",
      previous: "الفترة السابقة",
      prev: "السابق",
      less: "أقل",
      more: "أكثر",
      others: "أخرى",
      chartHint: "استعمل مفاتيح الأسهم لقراءة كل يوم.",
    },
    change: {
      vs: "مقارنة بالفترة السابقة",
      none: "لا أرقام سابقة",
    },
    days: "{n} يوم",
    acceptance: "نسبة القبول {pct}",
    analytics: {
      title: "التحليلات",
      subtitle: {
        farm: "كيف تسير مبيعاتك مقارنة بالفترة السابقة.",
        factory: "ما تشتريه وكم يكلّفك، مقارنة بالفترة السابقة.",
        lab: "طلباتك ونتائجك وإيراداتك، مقارنة بالفترة السابقة.",
      },
    },
    kpi: {
      soldDzd: "المبيعات",
      soldKg: "الكيلوغرامات المبيعة",
      sales: "عدد المبيعات",
      avgDzdPerKg: "متوسط سعر الكيلوغرام",
      spentDzd: "المصاريف",
      boughtKg: "الكيلوغرامات المشتراة",
      offersSent: "العروض المرسلة",
      requests: "الطلبات الواردة",
      released: "النتائج الصادرة",
      revenueDzd: "الإيرادات",
      avgTurnaroundDays: "متوسط مدة الإنجاز",
    },
    area: {
      farm: { title: "المبيعات اليومية", sub: "الدنانير المحصّلة كل يوم" },
      factory: { title: "المصاريف اليومية", sub: "الدنانير المصروفة كل يوم، مع العمولة" },
      lab: { title: "الطلبات اليومية", sub: "الطلبات الجديدة كل يوم" },
    },
    donut: {
      farm: { title: "المبيعات حسب المخلّف", center: "مبيعات" },
      factory: { title: "المصاريف حسب المخلّف", center: "مصاريف" },
      lab: { title: "التحاليل المطلوبة", center: "تحليل" },
    },
    top: {
      farm: { title: "أهم المشترين", one: "عملية بيع واحدة", many: "عدد المبيعات: {n}" },
      factory: { title: "أهم البائعين", one: "عملية شراء واحدة", many: "عدد المشتريات: {n}" },
      lab: { title: "أهم الزبائن", one: "طلب واحد", many: "عدد الطلبات: {n}" },
    },
    activity: {
      title: "النشاط",
      farm: { sub: "المبيعات اليومية خلال آخر 20 أسبوعًا", one: "عملية بيع واحدة", many: "المبيعات: {n}" },
      factory: { sub: "العروض والمشتريات اليومية خلال آخر 20 أسبوعًا", one: "عرض أو شراء واحد", many: "العروض والمشتريات: {n}" },
      lab: { sub: "الطلبات اليومية خلال آخر 20 أسبوعًا", one: "طلب واحد", many: "الطلبات: {n}" },
    },
    empty: {
      farm: "لا مبيعات في هذه الفترة بعد.",
      factory: "لا مشتريات في هذه الفترة بعد.",
      lab: "لا طلبات في هذه الفترة بعد.",
    },
    week: {
      title: "هذا الأسبوع",
      main: { farm: "المبيعات خلال آخر 7 أيام", factory: "المصاريف خلال آخر 7 أيام", lab: "الطلبات خلال آخر 7 أيام" },
      link: "التحليلات",
      empty: "لا شيء هذا الأسبوع بعد.",
    },
    ring: {
      title: { farm: "المبيع مما عرضته", factory: "العروض المقبولة", lab: "النتائج في موعدها" },
      legend: {
        farm: { done: "مبيع", rest: "ما زال معروضًا" },
        factory: { done: "مقبولة", rest: "مرفوضة" },
        lab: { done: "في الموعد", rest: "متأخرة" },
      },
      sub: {
        farm: "كل دفعاتك حتى الآن، بالوزن",
        factory: "العروض التي تلقّت ردًّا",
        lab: "النتائج الصادرة التي كان لها موعد",
      },
      empty: "لا شيء للقياس بعد.",
    },
  },
});

export type InsightsMessages = (typeof insightsMessages)["en"];

/** Fills `{name}` slots in a message. */
export function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? `{${k}}`));
}
