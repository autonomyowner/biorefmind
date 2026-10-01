"use client";

import { createContext, useContext } from "react";
import { DirectionProvider } from "@base-ui/react/direction-provider";

import { dirOf, type Locale } from "./locale";
import type { MessageFile } from "./messages";

const LocaleContext = createContext<Locale>("en");

/** Gives client components the language, and Base UI (menus, popups) the reading direction. */
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return (
    <LocaleContext value={locale}>
      <DirectionProvider direction={dirOf(locale)}>{children}</DirectionProvider>
    </LocaleContext>
  );
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** One message file in the visitor's language (client components). */
export function useMessages<T>(file: MessageFile<T>): T {
  return file[useLocale()];
}
