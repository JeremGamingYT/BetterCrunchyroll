/**
 * Language metadata shared by the i18n provider, the language switchers
 * (footer/auth) and the settings page — single source of truth so every
 * surface offers the same set of languages and never drifts out of sync.
 *
 * This list matches the locales Crunchyroll itself already exposes for
 * content (see `LANG_OPTIONS` in `SettingsPage.tsx`), so "every language
 * Crunchyroll supports" also has a full BetterCR interface translation.
 */
import type { Lang } from './strings';

export interface LangMeta {
  readonly code: Lang;
  readonly flag: string;
  readonly label: string;
  /** Default Crunchyroll content-API locale requested for this UI language. */
  readonly contentLocale: string;
}

export const UI_LANGS: readonly LangMeta[] = [
  { code: 'en', flag: '🇬🇧', label: 'English', contentLocale: 'en-US' },
  { code: 'fr', flag: '🇫🇷', label: 'Français', contentLocale: 'fr-FR' },
  { code: 'es', flag: '🇪🇸', label: 'Español', contentLocale: 'es-419' },
  { code: 'pt', flag: '🇧🇷', label: 'Português', contentLocale: 'pt-BR' },
  { code: 'de', flag: '🇩🇪', label: 'Deutsch', contentLocale: 'de-DE' },
  { code: 'it', flag: '🇮🇹', label: 'Italiano', contentLocale: 'it-IT' },
  { code: 'ar', flag: '🇸🇦', label: 'العربية', contentLocale: 'ar-SA' },
  { code: 'ru', flag: '🇷🇺', label: 'Русский', contentLocale: 'ru-RU' },
  { code: 'ja', flag: '🇯🇵', label: '日本語', contentLocale: 'ja-JP' },
  { code: 'hi', flag: '🇮🇳', label: 'हिन्दी', contentLocale: 'hi-IN' },
];

/** Languages that read right-to-left. */
export const RTL_LANGS: ReadonlySet<Lang> = new Set<Lang>(['ar']);

/** The Crunchyroll content-API locale to request for a given UI language. */
export function contentLocaleFor(lang: Lang): string {
  return UI_LANGS.find((entry) => entry.code === lang)?.contentLocale ?? 'en-US';
}

/** Locale used for `Intl`/`toLocaleString` formatting (numbers, dates, months). */
export function intlLocaleFor(lang: Lang): string {
  return contentLocaleFor(lang);
}

/** Type guard for values coming from an untyped source (e.g. a `<select>`). */
export function isUiLang(value: string): value is Lang {
  return UI_LANGS.some((entry) => entry.code === value);
}

/**
 * Picks the best supported UI language from the browser's language list
 * (most-preferred first), matching by base language subtag — e.g. `es-AR`
 * and `es-ES` both match the `es` translation. Falls back to English when
 * none of the browser's languages are supported, never to a fixed language.
 */
export function detectBrowserLang(candidates: readonly string[]): Lang {
  const supported = new Set<string>(UI_LANGS.map((entry) => entry.code));
  for (const raw of candidates) {
    const base = raw.split('-')[0]?.toLowerCase();
    if (base && supported.has(base)) {
      return base as Lang;
    }
  }
  return 'en';
}
