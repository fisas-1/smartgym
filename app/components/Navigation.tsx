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
    <nav className="fixed bottom-0 left-0 right-0 bg-[var(--card)] border-t border-[var(--border)] px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center z-50 overflow-visible">
      <div className="flex gap-1 sm:gap-4 flex-nowrap overflow-x-auto scrollbar-hidden min-w-0">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`text-xs sm:text-base tracking-wider transition-colors px-2 sm:px-3 py-1 sm:py-2 whitespace-nowrap flex-shrink-0 ${
               pathname === item.href ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
              {t(`nav.${item.key}`)}
            </Link>
          ))}
      </div>
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {loading ? (
            <span className="text-xs text-zinc-400">...</span>
          ) : user ? (
            <button
              onClick={() => signOut()}
              className="text-xs text-[var(--foreground)]/60 hover:text-[var(--foreground)] transition-colors px-2 py-1 min-h-[44px] flex items-center whitespace-nowrap"
            >
              {t('nav.logout')}
            </button>
          ) : (
            <Link
              href="/login"
              className="text-xs text-[var(--foreground)]/60 hover:text-[var(--foreground)] transition-colors px-2 py-1 min-h-[44px] flex items-center whitespace-nowrap"
            >
              {t('nav.login')}
            </Link>
          )}
        </div>
    </nav>
  )
}
