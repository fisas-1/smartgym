'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
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

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--card) 88%, transparent)',
        borderTop: '1px solid var(--border)',
      }}
    >
      <div className="max-w-3xl mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`text-xs tracking-wide px-3 py-2 min-h-[44px] flex items-center rounded-full whitespace-nowrap transition-colors ${
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
    </nav>
  )
}
