'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import en from '@/app/locales/en.json'
import ca from '@/app/locales/ca.json'
import es from '@/app/locales/es.json'

type Language = 'en' | 'ca' | 'es'
type Translations = Record<string, any>;

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, variables?: Record<string, any>) => string
}

const translationsMap: Record<Language, Translations> = { en, ca, es }

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('language')
      if (saved && ['en', 'ca', 'es'].includes(saved as Language)) {
        setLanguageState(saved as Language)
      }
    }
  }, [])

const [translations, setTranslations] = useState<Record<string, any>>(translationsMap['en'])

  useEffect(() => {
     document.documentElement.lang = language
     if (typeof window !== 'undefined') {
       localStorage.setItem('language', language)
     }
     setTranslations(translationsMap[language])
   }, [language])

  const t = (key: string, variables?: Record<string, any>) => {
    // First try to get the value directly (for flat keys like "nav.home")
    let value: any = translations[key]
    if (typeof value !== 'string') {
      // If not found, try nested path (for compatibility with nested structure)
      const keys = key.split('.')
      value = translations
      for (const k of keys) {
        if (value === null || value === undefined) {
          break
        }
        value = value[k]
      }
    }
    if (typeof value !== 'string') return key

    if (variables) {
      Object.entries(variables).forEach(([k, v]) => {
        value = (value as string).replace(`{{${k}}}`, String(v))
      })
    }
    return value
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