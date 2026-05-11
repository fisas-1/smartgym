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

  const [translations, setTranslations] = useState(translationsMap['en'])

  useEffect(() => {
    document.documentElement.lang = language
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', language)
    }
    setTranslations(translationsMap[language])
  }, [language])

   const t = (key: string, variables?: Record<string, any>) => {
     // Divideix la clau pels punts per buscar dins de l'objecte JSON
     let value = key.split('.').reduce((obj, i) => obj?.[i], translations);

     if (!value) return key; // Si no troba la clau, mostra el nom de la clau

     if (variables) {
       Object.entries(variables).forEach(([k, v]) => {
         value = value.replace(`{{${k}}}`, String(v));
       });
     }
     return value;
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