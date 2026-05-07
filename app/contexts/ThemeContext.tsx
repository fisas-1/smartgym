'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'dark' | 'light'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export { ThemeContext }

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')

  // Client-side only: load theme from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('theme') as Theme
    const initialTheme = (saved && (saved === 'dark' || saved === 'light')) ? saved : 'dark'
    setTheme(initialTheme)
    // Apply the class to document.documentElement
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      // Apply class toggle to document.documentElement
      document.documentElement.classList.toggle('dark')
      // Save to localStorage
      localStorage.setItem('theme', next)
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme必须在ThemeProvider内部的组件中使用')
  }
  return context
}
