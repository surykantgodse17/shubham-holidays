import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  getLanguage,
  isLocaleCode,
  type LocaleCode,
} from "./languages";
import { translate, type MessageKey } from "./messages";

type I18nContextValue = {
  locale: LocaleCode;
  setLocale: (code: LocaleCode) => void;
  t: (key: MessageKey) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function readStoredLocale(): LocaleCode {
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (raw && isLocaleCode(raw)) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_LOCALE;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(() =>
    typeof window === "undefined" ? DEFAULT_LOCALE : readStoredLocale(),
  );

  useEffect(() => {
    const lang = getLanguage(locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = lang.dir ?? "ltr";
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
  }, [locale]);

  function setLocale(code: LocaleCode) {
    setLocaleState(code);
  }

  function t(key: MessageKey) {
    return translate(locale, key);
  }

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
