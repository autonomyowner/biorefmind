import type { Locale } from "./locale";

/**
 * Arabic for the refusals the backend can send to the website. The backend
 * speaks English; keys must match its text exactly (convex/*.ts, convex/lib/accounts.ts).
 */
const AR: Record<string, string> = {
  "Please sign in to continue.": "يرجى تسجيل الدخول للمتابعة.",
  "Please enter your name.": "يرجى إدخال اسمك.",
  "Please finish creating your account first.": "يرجى إكمال إنشاء حسابك أولًا.",
  "Name must be 2–80 characters.": "يجب أن يتكون الاسم من 2 إلى 80 حرفًا.",
  "Please enter your region.": "يرجى إدخال منطقتك.",
  "Please enter a phone number.": "يرجى إدخال رقم هاتف.",
  "Choose at least one analysis your lab offers.": "اختر تحليلًا واحدًا على الأقل يقدّمه مختبرك.",
  "You already have a farm account.": "لديك حساب مزرعة بالفعل.",
  "Farm accounts are for one person.": "حسابات المزارع مخصّصة لشخص واحد.",
  "Only BiorefMind admins can do this.": "هذا الإجراء متاح لمسؤولي BiorefMind فقط.",
  "That account is not a lab.": "هذا الحساب ليس مختبرًا.",
  "Choose between 1 and 12 months.": "اختر بين شهر واحد و12 شهرًا.",
  "Only factory accounts can request enterprise pricing.": "طلب تسعير المؤسسات متاح لحسابات المصانع فقط.",
  "Please write a short message (up to 1000 characters).": "يرجى كتابة رسالة قصيرة (حتى 1000 حرف).",
  "You don't have access to this workspace.": "ليس لديك صلاحية الوصول إلى مساحة العمل هذه.",
  "Something went wrong. Please try again.": "حدث خطأ ما. حاول مرة أخرى.",
};

/** A backend message in the visitor's language (unknown ones stay in English). */
export function localizeBackendError(message: string, locale: Locale): string {
  return locale === "ar" ? (AR[message] ?? message) : message;
}
