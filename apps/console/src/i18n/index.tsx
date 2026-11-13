import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import it, { type Dict } from './it';
import en from './en';

export type Lang = 'it' | 'en';
export const DICTS: Record<Lang, Dict> = { it, en };

const STORAGE_KEY = 'ec-console-lang';

function initialLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'it' || stored === 'en') return stored;
  } catch {
    /* storage unavailable */
  }
  return 'it';
}

interface I18n {
  lang: Lang;
  t: Dict;
  setLang: (l: Lang) => void;
}

const Ctx = createContext<I18n>({ lang: 'it', t: it, setLang: () => {} });

export function I18nProvider({ children, lang: forced }: { children: ReactNode; lang?: Lang }) {
  const [lang, setLangState] = useState<Lang>(forced ?? initialLang);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const value = useMemo(() => ({ lang, t: DICTS[lang], setLang }), [lang, setLang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
export const useT = () => useContext(Ctx).t;
