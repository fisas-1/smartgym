'use client'

import Link from 'next/link'
import { useTranslation } from './contexts/LanguageContext'

export default function NotFound() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h2 className="text-2xl font-bold mb-4 text-[var(--color-text-primary)]">{t('notFound.title')}</h2>
      <p className="text-[var(--color-text-secondary)] mb-6">
        {t('notFound.description')}
      </p>
      <Link
        href="/"
        className="px-4 py-2 bg-[var(--color-text-primary)] text-[var(--color-bg-primary)] rounded-lg hover:opacity-90 transition-opacity"
      >
        {t('notFound.back')}
      </Link>
    </div>
  )
}
