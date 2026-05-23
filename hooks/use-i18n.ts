"use client"

import { useEffect, useState } from "react"
import {
  getCrunchyrollLocale,
  getStoredLanguage,
  normalizeLanguage,
  setStoredLanguage,
  translate,
  type SupportedLanguage,
} from "@/lib/i18n"

export function useI18n() {
  const [language, setLanguageState] = useState<SupportedLanguage>("fr_ca")

  useEffect(() => {
    setLanguageState(getStoredLanguage())

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "bcr_display_language") {
        setLanguageState(normalizeLanguage(event.newValue))
      }
    }

    const handleLanguageChange = (event: Event) => {
      const language = (event as CustomEvent<{ language?: string }>).detail?.language
      setLanguageState(normalizeLanguage(language))
    }

    window.addEventListener("storage", handleStorage)
    window.addEventListener("bcr-language-change", handleLanguageChange)
    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener("bcr-language-change", handleLanguageChange)
    }
  }, [])

  const setLanguage = (nextLanguage: string) => {
    const normalized = normalizeLanguage(nextLanguage)
    setStoredLanguage(normalized)
    setLanguageState(normalized)
  }

  return {
    language,
    locale: getCrunchyrollLocale(language),
    setLanguage,
    t: (key: string, params?: Record<string, string | number>) => translate(language, key, params),
  }
}
