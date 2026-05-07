'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { AuthContext } from '../contexts/AuthContext'
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
  
  const authContext = useContext(AuthContext)
  const user = authContext?.user ?? null
  const loading = authContext?.loading ?? false
  const signOut = authContext?.signOut ?? (async () => {})
  
  const themeContext = useContext(ThemeContext)
  const theme = themeContext?.theme ?? 'dark'
  const toggleTheme = themeContext?.toggleTheme ?? (() => {})
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-zinc-800 px-6 py-4 flex justify-between items-center z-50">
      <div className="flex gap-4">
        {navItems.map((item) => (
          <Link 
        key={item.href} 
        href={item.href} 
        className={`text-xs tracking-wider transition-colors ${
          pathname === item.href ? 'text-white' : 'text-zinc-400 hover:text-white'
        }`}
      >
            {item.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="text-zinc-400 hover:text-white transition-colors p-2"
          title={theme === 'dark' ? 'Canviar a tema clar' : 'Canviar a tema fosc'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        {loading ? (
          <span className="text-xs text-zinc-400">...</span>
        ) : user ? (
          <>
            <span className="text-xs text-zinc-400 hidden sm:inline">Hola</span>
            <button
              onClick={() => signOut()}
              className="text-xs text-zinc-400 hover:text-white transition-colors px-2 py-1"
            >
              Sortir
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="text-xs text-zinc-400 hover:text-white transition-colors px-2 py-1"
          >
            Entrar
          </Link>
        )}
      </div>
    </nav>
  )
}
