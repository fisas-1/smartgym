'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from '../contexts/LanguageContext'

export default function CookiesBanner() {
  const [show, setShow] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    const accepted = document.cookie.split(';').some(c => c.trim().startsWith('cookies_accepted='))
    if (!accepted) setShow(true)
  }, [])

  function acceptCookies() {
    const maxAge = 60 * 60 * 24 * 365
    document.cookie = `cookies_accepted=true; path=/; max-age=${maxAge}; SameSite=Strict`
    setShow(false)
  }

  if (!show) return null

  return (
    <div
      className="fixed left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm rounded-2xl p-4 z-[60]"
      style={{
        bottom: 'calc(4.5rem + env(safe-area-inset-bottom))',
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-soft)',
      }}
    >
      <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
        {t('cookies.message') || 'Utilitzem cookies essencials per al funcionament de l\'app.'}
      </p>
      <div className="flex gap-2">
        <button
          onClick={acceptCookies}
          className="flex-1 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--color-text-primary)', color: 'var(--color-bg-primary)' }}
        >
          {t('cookies.accept') || 'Acceptar'}
        </button>
        <a
          href="/privacy"
          className="flex-1 py-2 rounded-xl text-sm text-center transition-colors hover:bg-[var(--surface-hover)]"
          style={{ backgroundColor: 'var(--surface-strong)', color: 'var(--color-text-secondary)' }}
        >
          {t('cookies.more') || 'Més info'}
        </a>
      </div>
    </div>
  )
}
