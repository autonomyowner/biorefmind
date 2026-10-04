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
  "Only farm accounts can list residues.": "إدراج المخلفات متاح لحسابات المزارع فقط.",
  "Only factory accounts can make offers.": "تقديم العروض متاح لحسابات المصانع فقط.",
  "Choose a residue from the list.": "اختر نوع المخلفات من القائمة.",
  "Quantity must be a whole number of kilograms (1 to 10,000,000).": "يجب أن تكون الكمية عددًا صحيحًا من الكيلوغرامات (من 1 إلى 10,000,000).",
  "Price must be between 0.01 and 100,000 DA per kg.": "يجب أن يكون السعر بين 0.01 و100,000 دج للكيلوغرام.",
  "The note can be up to 1000 characters.": "يمكن أن تصل الملاحظة إلى 1000 حرف.",
  "You can attach up to 4 photos.": "يمكنك إرفاق 4 صور كحد أقصى.",
  "One of the photos could not be found. Please upload it again.": "تعذّر العثور على إحدى الصور. يرجى رفعها مرة أخرى.",
  "This listing no longer exists.": "هذا الإدراج لم يعد موجودًا.",
  "This listing is no longer open.": "هذا الإدراج لم يعد متاحًا.",
  "You can't offer more than the quantity left.": "لا يمكنك طلب أكثر من الكمية المتبقية.",
  "This offer no longer exists.": "هذا العرض لم يعد موجودًا.",
  "This offer has already been answered.": "تم الرد على هذا العرض بالفعل.",
  "Only owners and managers can do this.": "هذا الإجراء متاح للمالكين والمديرين فقط.",
  "You don't have access to this workspace.":"ليس لديك صلاحية الوصول إلى مساحة العمل هذه.",
  "Something went wrong. Please try again.": "حدث خطأ ما. حاول مرة أخرى.",
};

/** A backend message in the visitor's language (unknown ones stay in English). */
export function localizeBackendError(message: string, locale: Locale): string {
  return locale === "ar" ? (AR[message] ?? message) : message;
}
