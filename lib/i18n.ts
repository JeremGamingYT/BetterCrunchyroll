import enUs from "@/lang/en_us.json"
import frCa from "@/lang/fr_ca.json"
import frFr from "@/lang/fr_fr.json"

export const SUPPORTED_LANGUAGES = ["fr_ca", "fr_fr", "en_us"] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

const STORAGE_KEY = "bcr_display_language"
const dictionaries = { fr_ca: frCa, fr_fr: frFr, en_us: enUs } as const

export function normalizeLanguage(value: string | null | undefined): SupportedLanguage {
  if (value === "en" || value === "en-us" || value === "en_US" || value === "en_us") return "en_us"
  if (value === "fr_fr" || value === "fr-FR" || value === "fr_FR") return "fr_fr"
  if (value === "fr" || value === "fr-ca" || value === "fr-CA" || value === "fr_CA") return "fr_ca"
  return "fr_ca"
}

export function getStoredLanguage(): SupportedLanguage {
  if (typeof window === "undefined") return "fr_ca"
  return normalizeLanguage(window.localStorage.getItem(STORAGE_KEY))
}

export function setStoredLanguage(language: SupportedLanguage) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, language)
  window.dispatchEvent(new CustomEvent("bcr-language-change", { detail: { language } }))
}

export function getCrunchyrollLocale(language: SupportedLanguage = getStoredLanguage()) {
  if (language === "en_us") return "en-US"
  if (language === "fr_fr") return "fr-FR"
  return "fr-CA"
}

export function getCrunchyrollLanguageHeader(language: SupportedLanguage = getStoredLanguage()) {
  if (language === "en_us") return "en-US,en;q=0.9,fr-CA;q=0.7,fr;q=0.6"
  if (language === "fr_fr") return "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7"
  return "fr-CA,fr;q=0.9,en-US;q=0.8,en;q=0.7"
}

export function translate(language: SupportedLanguage, key: string, params?: Record<string, string | number>) {
  const dictionary = dictionaries[language] as Record<string, unknown>
  const fallback = dictionaries.fr_ca as Record<string, unknown>
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
