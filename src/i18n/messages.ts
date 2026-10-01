import type { Locale } from "./locale";

/**
 * The Arabic side has exactly the English side's shape: every key must exist,
 * and a missing or extra translation fails the type check.
 */
type Shape<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly Shape<U>[]
    : { readonly [K in keyof T]: Shape<T[K]> };

export type MessageFile<T> = Record<Locale, T>;

/** Both sides are typed by the shared shape (plain strings), so either can be read in the same place. */
export function defineMessages<const T extends object>(m: { en: T; ar: Shape<T> }): MessageFile<Shape<T>> {
  return m as unknown as MessageFile<Shape<T>>;
}
