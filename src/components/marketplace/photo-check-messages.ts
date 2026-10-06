import { defineMessages } from "@/i18n/messages";

/** The "AI photo check" box on lots (public page, Browse, the farmer's listings). */
export const photoCheckMessages = defineMessages({
  en: {
    title: "AI photo check",
    match: { yes: "Looks like {residue}", unsure: "Hard to tell from the photos", no: "Doesn't look like {residue}" },
    state: { fresh: "Fresh", dried: "Dried", unclear: "Fresh or dried: can't tell" },
    concerns: {
      mould: "Possible mould",
      wet: "Looks wet",
      browning: "Browning or rot",
      foreign_matter: "Foreign matter",
      mixed: "Mixed residues",
      poor_photo: "Photos too blurry or dark",
    },
    noConcerns: "No visible problems",
    concernCount: { one: "1 thing to check", other: "{n} things to check" },
    tip: "Tip",
    disclaimer: "AI looked at the photos — not a lab result. Order a lab test for real figures.",
    pending: "Checking your photos…",
    failed: "Photo check unavailable right now.",
    retry: "Try again",
    findLab: "Find a lab",
  },
  ar: {
    title: "فحص الصور بالذكاء الاصطناعي",
    match: { yes: "تبدو {residue}", unsure: "يصعب الحكم من الصور", no: "لا تبدو {residue}" },
    state: { fresh: "طازجة", dried: "مجففة", unclear: "طازجة أو مجففة: غير واضح" },
    concerns: {
      mould: "عفن محتمل",
      wet: "تبدو رطبة",
      browning: "اسمرار أو تعفّن",
      foreign_matter: "مواد غريبة",
      mixed: "مخلفات مختلطة",
      poor_photo: "صور غير واضحة أو مظلمة",
    },
    noConcerns: "لا مشاكل ظاهرة",
    concernCount: { one: "ملاحظة واحدة", other: "{n} ملاحظات" },
    tip: "نصيحة",
    disclaimer: "فحص آلي للصور وليس نتيجة مختبر. اطلب تحليلًا مخبريًا للحصول على أرقام حقيقية.",
    pending: "جارٍ فحص صورك…",
    failed: "فحص الصور غير متاح حاليًا.",
    retry: "أعد المحاولة",
    findLab: "ابحث عن مختبر",
  },
});
