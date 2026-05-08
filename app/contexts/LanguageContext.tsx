'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Language = 'en' | 'ca' | 'es'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    // Try to get from localStorage
    const saved = localStorage.getItem('language')
    if (saved && ['en', 'ca', 'es'].includes(saved as Language)) {
      return saved as Language
    }
    // Default to English
    return 'en'
  })

  // Update html lang attribute and localStorage when language changes
  useEffect(() => {
    document.documentElement.lang = language
    localStorage.setItem('language', language)
  }, [language])

  // Load translations
  const [translations, setTranslations] = useState<Record<string, any>>({})

  useEffect(() => {
    // Dynamically import the translation file
    import(`/app/locales/${language}.json`).then((module) => {
      setTranslations(module.default)
    }).catch(() => {
      // Fallback to English if file not found
      import(`/app/locales/en.json`).then((module) => {
        setTranslations(module.default)
      })
    })
  }, [language])

  // Translation function
  const t = (key: string): string => {
    const keys = key.split('.')
    let value: any = translations
    for (const k of keys) {
      if (value == null) return key
      value = value[k]
    }
    return value !== null && value !== undefined ? value : key
  }

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider')
  }
  return context
}