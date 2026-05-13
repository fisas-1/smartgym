'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslation } from '../contexts/LanguageContext'

const HomeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
    <path d="M9 21V12h6v9"/>
  </svg>
)

const RoutinesIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="3" width="14" height="18" rx="2"/>
    <path d="M9 7h6M9 11h6M9 15h4"/>
  </svg>
)

const StatsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20V14M9 20V8M14 20V12M19 20V4"/>
  </svg>
)

const FriendsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="7" r="3"/>
    <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/>
    <circle cx="17" cy="8" r="2.5"/>
    <path d="M21 20c0-2.8-1.8-5.1-4.5-5.8"/>
  </svg>
)

const ProfileIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
)

const navItems = [
  { href: '/', key: 'home', Icon: HomeIcon },
  { href: '/rutines', key: 'rutines', Icon: RoutinesIcon },
  { href: '/stats', key: 'stats', Icon: StatsIcon },
  { href: '/amics', key: 'amics', Icon: FriendsIcon },
  { href: '/perfil', key: 'perfil', Icon: ProfileIcon },
]

export default function Navigation() {
  const pathname = usePathname()
  const { t } = useTranslation()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--card) 88%, transparent)',
        borderTop: '1px solid var(--border)',
      }}
    >
      <div className="flex items-stretch justify-around max-w-3xl mx-auto">
        {navItems.map(({ href, key, Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 min-h-[48px] rounded-xl transition-colors ${
                active
                  ? 'text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-tertiary)]'
              }`}
            >
              {/* Icon with animated pill background */}
              <div
                className="flex items-center justify-center w-12 h-7 rounded-full transition-all duration-200"
                style={active ? { backgroundColor: 'var(--surface-strong)', transform: 'scale(1.08)' } : {}}
              >
                <Icon />
              </div>
              <span className="text-[9px] leading-none tracking-wide truncate w-full text-center px-0.5">
                {t(`nav.${key}`)}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
