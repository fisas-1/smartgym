'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"

const navItems = [
  { href: '/', label: 'home' },
  { href: '/rutines', label: 'rutines' },
  { href: '/estadistiques', label: 'stats' },
  { href: '/amics', label: 'amics' },
  { href: '/perfil', label: 'perfil' },
]

export default function Navigation() {
  const pathname = usePathname()
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-zinc-900 px-6 py-4 flex justify-between items-center z-50">
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
    </nav>
  )
}