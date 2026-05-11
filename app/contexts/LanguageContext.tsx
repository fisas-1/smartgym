'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import en from '@/app/locales/en.json'
import ca from '@/app/locales/ca.json'
import es from '@/app/locales/es.json'

type Language = 'en' | 'ca' | 'es'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const translationsMap = { en, ca, es }

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language')
    if (saved && ['en', 'ca', 'es'].includes(saved as Language)) {
      return saved as Language
    }
    return 'en'
  })

  const [translations, setTranslations] = useState(translationsMap[language])

  useEffect(() => {
    document.documentElement.lang = language
    localStorage.setItem('language', language)
    setTranslations(translationsMap[language])
  }, [language])

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