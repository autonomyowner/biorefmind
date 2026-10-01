import { cookies } from "next/headers";

import { LOCALE_COOKIE, parseLocale, type Locale } from "./locale";
import type { MessageFile } from "./messages";

/** The visitor's language, from the cookie. */
export async function getLocale(): Promise<Locale> {
  return parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
}

/** One message file in the visitor's language (server components). */
export async function getMessages<T>(file: MessageFile<T>): Promise<T> {
  return file[await getLocale()];
}
