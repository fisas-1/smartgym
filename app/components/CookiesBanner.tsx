'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from '../contexts/LanguageContext'

export default function CookiesBanner() {
  const [show, setShow] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    const accepted = localStorage.getItem('cookies_accepted')
    if (!accepted) setShow(true)
  }, [])

  function acceptCookies() {
    localStorage.setItem('cookies_accepted', 'true')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm bg-black/95 border border-zinc-800 rounded-2xl p-4 z-[60]">
      <p className="text-zinc-300 text-sm mb-3">
        {t('cookies.message') || 'Utilitzem cookies essentials per al funcionament. Més informació a les polítiques.'}
      </p>
      <div className="flex gap-2">
        <button
          onClick={acceptCookies}
          className="flex-1 py-2 rounded-xl bg-white text-black text-sm font-medium"
        >
          {t('cookies.accept') || 'Acceptar'}
        </button>
        <a
          href="/privacy"
          className="flex-1 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-sm text-center"
        >
          {t('cookies.more') || 'Més info'}
        </a>
      </div>
    </div>
  )
}