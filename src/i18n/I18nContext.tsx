import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { localStorageDriver, STORAGE_KEYS } from "../services/storage/localStorageDriver";
import { isLanguage, translate } from "./messages";
import type { Language, TranslationValues } from "./types";

export interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, values?: TranslationValues) => string;
}

const fallbackValue: I18nContextValue = {
  language: "ru",
  setLanguage: () => undefined,
  t: (key, values) => translate("ru", key, values),
};

const I18nContext = createContext<I18nContextValue>(fallbackValue);

function readInitialLanguage(): Language {
  const stored = localStorageDriver.getItem<unknown>(STORAGE_KEYS.LANGUAGE);
  if (isLanguage(stored)) return stored;
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEYS.LANGUAGE) : null;
    return isLanguage(raw) ? raw : "ru";
  } catch {
    return "ru";
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readInitialLanguage);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    localStorageDriver.setItem(STORAGE_KEYS.LANGUAGE, next);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  const value = useMemo<I18nContextValue>(
    () => ({ language, setLanguage, t: (key, values) => translate(language, key, values) }),
    [language, setLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}

export { translate } from "./messages";
export type { Language, TranslationValues } from "./types";
