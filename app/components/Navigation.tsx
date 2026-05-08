'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { AuthContext } from '../contexts/AuthContext'
import { ThemeContext } from '../contexts/ThemeContext'
import { useContext } from 'react'
import LanguageSelector from './LanguageSelector'
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

  const themeContext = useContext(ThemeContext)
  const theme = themeContext?.theme ?? 'dark'
  const toggleTheme = themeContext?.toggleTheme ?? (() => {})

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[var(--card)] border-t border-[var(--border)] px-6 py-4 flex justify-between items-center z-50">
      <div className="flex gap-4">
        {navItems.map((item) => (
          <Link 
            key={item.href} 
            href={item.href} 
            className={`text-base tracking-wider transition-colors px-3 py-2 ${
               pathname === item.href ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
              {t(`nav.${item.key}`)}
            </Link>
          ))}
      </div>
      <div className="flex items-center gap-3">
        <LanguageSelector />
        <button
          onClick={toggleTheme}
          className="text-[var(--foreground)]/60 hover:text-[var(--foreground)] transition-colors p-2"
          title={t(theme === 'dark' ? 'nav.theme_light' : 'nav.theme_dark')}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        {loading ? (
          <span className="text-xs text-zinc-400">...</span>
        ) : user ? (
          <>
            <span className="text-xs text-zinc-400 hidden sm:inline">{t('nav.hello')}</span>
            <button
              onClick={() => signOut()}
              className="text-xs text-[var(--foreground)]/60 hover:text-[var(--foreground)] transition-colors px-2 py-1"
            >
              {t('nav.logout')}
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="text-xs text-[var(--foreground)]/60 hover:text-[var(--foreground)] transition-colors px-2 py-1"
          >
            {t('nav.login')}
          </Link>
        )}
      </div>
    </nav>
  )
}
