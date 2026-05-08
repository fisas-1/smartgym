'use client'

import { useTranslation } from '../contexts/LanguageContext'

const LanguageSelector = () => {
  const { language, setLanguage, t } = useTranslation()

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as 'en' | 'ca' | 'es')
  }

  // Language options for display
  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'ca', label: 'Català' },
    { value: 'es', label: 'Español' }
  ]

  return (
    <div className="relative">
      <select
        value={language}
        onChange={handleLanguageChange}
        className="bg-[var(--card)] border border-[var(--border)] rounded px-3 py-1 text-sm text-[var(--foreground)] hover:bg-[var(--accent)]/10 transition-colors"
        aria-label={t('nav.language') || 'Language'}
      >
        {languageOptions.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  )
}

export default LanguageSelector