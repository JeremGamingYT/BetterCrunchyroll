import fr from "@/lang/fr.json"
import en from "@/lang/en.json"

export const SUPPORTED_LANGUAGES = ["fr", "en"] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

const STORAGE_KEY = "bcr_display_language"
const dictionaries = { fr, en } as const

export function normalizeLanguage(value: string | null | undefined): SupportedLanguage {
  return value === "en" ? "en" : "fr"
}

export function getStoredLanguage(): SupportedLanguage {
  if (typeof window === "undefined") return "fr"
  return normalizeLanguage(window.localStorage.getItem(STORAGE_KEY))
}

export function setStoredLanguage(language: SupportedLanguage) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, language)
  window.dispatchEvent(new CustomEvent("bcr-language-change", { detail: { language } }))
}

export function getCrunchyrollLocale(language: SupportedLanguage = getStoredLanguage()) {
  return language === "en" ? "en-US" : "fr-FR"
}

export function getCrunchyrollLanguageHeader(language: SupportedLanguage = getStoredLanguage()) {
  return language === "en" ? "en-US,en;q=0.9,fr-FR;q=0.7,fr;q=0.6" : "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7"
}

export function translate(language: SupportedLanguage, key: string, params?: Record<string, string | number>) {
  const dictionary = dictionaries[language] as Record<string, unknown>
  const fallback = dictionaries.fr as Record<string, unknown>
  const value = readPath(dictionary, key) ?? readPath(fallback, key) ?? key
  if (typeof value !== "string") return key

  return Object.entries(params || {}).reduce(
    (text, [param, replacement]) => text.replaceAll(`{${param}}`, String(replacement)),
    value,
  )
}

function readPath(source: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, part) => {
    if (!current || typeof current !== "object") return undefined
    return (current as Record<string, unknown>)[part]
  }, source)
}
