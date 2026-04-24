'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from '../contexts/AuthContext'

const navItems = [
  { href: '/', label: 'home' },
  { href: '/rutines', label: 'rutines' },
  { href: '/estadistiques', label: 'stats' },
  { href: '/amics', label: 'amics' },
  { href: '/perfil', label: 'perfil' },
]

export default function Navigation() {
  const pathname = usePathname()
  const { user, loading, signOut } = useAuth()
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-zinc-900 px-6 py-4 flex justify-between items-center z-50">
      <div className="flex gap-4">
        {navItems.map((item) => (
          <Link 
            key={item.href} 
            href={item.href} 
            className={`text-xs tracking-wider transition-colors ${
              pathname === item.href ? 'text-white' : 'text-zinc-600'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-3">
        {loading ? (
          <span className="text-xs text-zinc-600">...</span>
        ) : user ? (
          <>
            <span className="text-xs text-zinc-500 hidden sm:inline">Hola</span>
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
