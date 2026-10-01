import type { Locale } from "./locale";

/**
 * Arabic for the refusals the backend can send to the sign-in pages. The
 * backend speaks English; keys must match its text exactly (convex/*.ts).
 */
const AR: Record<string, string> = {
  "Please sign in to continue.": "يرجى تسجيل الدخول للمتابعة.",
  "Please enter your name.": "يرجى إدخال اسمك.",
  "Please finish creating your account first.": "يرجى إكمال إنشاء حسابك أولًا.",
  "Company name must be 2–80 characters.": "يجب أن يتكون اسم الشركة من 2 إلى 80 حرفًا.",
  "Something went wrong. Please try again.": "حدث خطأ ما. حاول مرة أخرى.",
};

/** A backend message in the visitor's language (unknown ones stay in English). */
export function localizeBackendError(message: string, locale: Locale): string {
  return locale === "ar" ? (AR[message] ?? message) : message;
}
