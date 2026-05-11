'use client'

import { useTranslation } from '../contexts/LanguageContext'

const LanguageSelector = () => {
  const { language, setLanguage, t } = useTranslation()

  const languages = [
    { code: 'en', label: 'EN', full: 'English' },
    { code: 'ca', label: 'CAT', full: 'Català' },
    { code: 'es', label: 'ES', full: 'Español' }
  ] as const

  return (
    <div className="relative group">
      <button
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm text-[var(--foreground)] hover:bg-[var(--accent)]/10 transition-colors"
        aria-label={t('nav.language')}
      >
        <span className="font-medium uppercase tracking-wider text-xs">
          {language.toUpperCase()}
        </span>
        <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div className="absolute top-full right-0 mt-1 w-32 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100]">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg overflow-hidden">
          {languages.map(({ code, label, full }) => (
            <button
              key={code}
              onClick={() => setLanguage(code)}
              className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--accent)]/10 ${
                language === code
                  ? 'text-[var(--color-text-primary)] bg-[var(--accent)]/10 font-medium'
                  : 'text-[var(--foreground)]/70'
              }`}
            >
              <span className="text-xs opacity-60 uppercase tracking-wide mr-2">{label}</span>
              {full}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default LanguageSelector