'use client'

import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { UnitProvider } from './contexts/UnitContext'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LanguageProvider>
          <UnitProvider>
            {children}
          </UnitProvider>
        </LanguageProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
