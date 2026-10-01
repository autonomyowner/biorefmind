"use server";

import { cookies } from "next/headers";

import { LOCALE_COOKIE, parseLocale } from "./locale";

/** Remembers the visitor's language for a year. */
export async function saveLocale(value: string) {
  (await cookies()).set(LOCALE_COOKIE, parseLocale(value), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
