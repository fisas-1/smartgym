'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from '../contexts/AuthContext'
import { ThemeContext } from '../contexts/ThemeContext'
import { useContext } from 'react'

const navItems = [
  { href: '/', label: 'home' },
  { href: '/rutines', label: 'rutines' },
  { href: '/stats', label: 'stats' },
  { href: '/amics', label: 'amics' },
  { href: '/perfil', label: 'perfil' },
]

export default function Navigation() {
  const pathname = usePathname()
  const { user, loading, signOut } = useAuth()
  const themeContext = useContext(ThemeContext)
  const theme = themeContext?.theme ?? 'dark'
  const toggleTheme = themeContext?.toggleTheme ?? (() => {})
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[var(--color-bg-tertiary)] border-t border-[var(--color-border)] px-6 py-4 flex justify-between items-center z-50">
      <div className="flex gap-4">
        {navItems.map((item) => (
          <Link 
            key={item.href} 
            href={item.href} 
            className={`text-xs tracking-wider transition-colors ${
              pathname === item.href ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors p-2"
          title={theme === 'dark' ? 'Canviar a tema clar' : 'Canviar a tema fosc'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        {loading ? (
          <span className="text-xs text-[var(--color-text-muted)]">...</span>
        ) : user ? (
          <>
            <span className="text-xs text-[var(--color-text-muted)] hidden sm:inline">Hola</span>
            <button
              onClick={() => signOut()}
              className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors px-2 py-1"
            >
              Sortir
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors px-2 py-1"
          >
            Entrar
          </Link>
        )}
      </div>
    </nav>
  )
}
