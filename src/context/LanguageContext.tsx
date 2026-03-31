"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import en from "@/messages/en.json";
import hi from "@/messages/hi.json";

type Locale = "en" | "hi";
type Translations = typeof en;

const messages: Record<Locale, Translations> = { en, hi };

interface LanguageContextType {
  locale: Locale;
  t: (key: keyof Translations) => string;
  setLocale: (locale: Locale) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: "en",
  t: (key) => en[key] ?? key,
  setLocale: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = localStorage.getItem("nf_locale") as Locale | null;
    if (saved === "en" || saved === "hi") setLocaleState(saved);
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("nf_locale", l);
  };

  const t = (key: keyof Translations): string =>
    messages[locale][key] ?? messages["en"][key] ?? key;

  return (
    <LanguageContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
