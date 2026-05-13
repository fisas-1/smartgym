'use client'

import Link from 'next/link'
import { useTranslation } from '../contexts/LanguageContext'

export default function QuickLogFab() {
  const { t } = useTranslation()
  return (
    <Link
      href="/"
      title={t('fab.quickLog')}
      className="fixed bottom-24 right-5 z-40 w-14 h-14 rounded-full bg-[var(--color-text-primary)] text-[var(--color-bg-primary)] shadow-lg shadow-black/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
      aria-label={t('fab.quickLog')}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </Link>
  )
}
