import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { setApiLocale } from '@core/api/client';
import { STRINGS, type Lang } from './strings';

const STORAGE_KEY = 'bcr_lang_v1';
const FALLBACK: Lang = 'fr';

export type TVars = Record<string, string | number>;
export type TFunction = (key: string, vars?: TVars) => string;

export interface I18n {
  readonly lang: Lang;
  readonly setLang: (lang: Lang) => void;
  readonly t: TFunction;
}

const I18nContext = createContext<I18n | null>(null);

function isLang(value: string | null): value is Lang {
  return value === 'fr' || value === 'en';
}

function loadLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLang(stored)) {
      return stored;
    }
  } catch {
    // Ignore — fall back to default.
  }
  return FALLBACK;
}

function translate(lang: Lang, key: string, vars?: TVars): string {
  let value = STRINGS[lang][key] ?? STRINGS[FALLBACK][key] ?? key;
  if (vars) {
    for (const [name, replacement] of Object.entries(vars)) {
      value = value.split(`{${name}}`).join(String(replacement));
    }
  }
  return value;
}

/** Maps the UI language to the Crunchyroll API locale. */
// eslint-disable-next-line react-refresh/only-export-components -- provider + helpers colocated by design
export function localeFor(lang: Lang): string {
  return lang === 'en' ? 'en-US' : 'fr-FR';
}

export function I18nProvider({ children }: { children: ReactNode }): React.JSX.Element {
  // Lazy initializer also primes the API locale before the first fetch runs.
  const [lang, setLangState] = useState<Lang>(() => {
    const initial = loadLang();
    setApiLocale(localeFor(initial));
    return initial;
  });

  const setLang = useCallback((next: Lang) => {
    // Set the API locale synchronously so re-fetches use the new locale.
    setApiLocale(localeFor(next));
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Persistence is best-effort.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<I18n>(
    () => ({ lang, setLang, t: (key, vars) => translate(lang, key, vars) }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- provider + hook colocated by design
export function useI18n(): I18n {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
