'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { AuthContext } from '../contexts/AuthContext'
import { useContext } from 'react'
import { useTranslation } from '../contexts/LanguageContext'

const navItems = [
  { href: '/', key: 'home' },
  { href: '/rutines', key: 'rutines' },
  { href: '/stats', key: 'stats' },
  { href: '/amics', key: 'amics' },
  { href: '/perfil', key: 'perfil' },
]

export default function Navigation() {
  const pathname = usePathname()
  const { t } = useTranslation()

  const authContext = useContext(AuthContext)
  const user = authContext?.user ?? null
  const loading = authContext?.loading ?? false
  const signOut = authContext?.signOut ?? (async () => {})

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--card) 88%, transparent)',
        borderTop: '1px solid var(--border)',
      }}
    >
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hidden min-w-0">
          {navItems.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative text-xs sm:text-sm tracking-wide px-3 py-2 rounded-full whitespace-nowrap flex-shrink-0 transition-colors ${
                  active
                    ? 'text-[var(--color-text-primary)] bg-[var(--surface-strong)]'
                    : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {t(`nav.${item.key}`)}
              </Link>
            )
          })}
        </div>
        <div className="flex items-center flex-shrink-0">
          {loading ? (
            <span className="text-xs text-[var(--color-text-tertiary)] px-2">…</span>
          ) : user ? (
            <button
              onClick={() => signOut()}
              className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] px-3 py-2 rounded-full whitespace-nowrap"
            >
              {t('nav.logout')}
            </button>
          ) : (
            <Link
              href="/login"
              className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] px-3 py-2 rounded-full whitespace-nowrap"
            >
              {t('nav.login')}
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
