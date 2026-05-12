'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Unit = 'kg' | 'lb'

const KG_TO_LB = 2.20462262

interface UnitContextType {
  unit: Unit
  setUnit: (u: Unit) => void
  toKg: (value: number) => number
  fromKg: (value: number) => number
  format: (kgValue: number, decimals?: number) => string
  label: string
}

const UnitContext = createContext<UnitContextType | undefined>(undefined)

export { UnitContext }

export function UnitProvider({ children }: { children: ReactNode }) {
  const [unit, setUnitState] = useState<Unit>('kg')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('weight_unit') as Unit
      if (saved === 'kg' || saved === 'lb') setUnitState(saved)
    }
  }, [])

  const setUnit = (u: Unit) => {
    setUnitState(u)
    if (typeof window !== 'undefined') localStorage.setItem('weight_unit', u)
  }

  const toKg = (value: number) => unit === 'lb' ? value / KG_TO_LB : value
  const fromKg = (value: number) => unit === 'lb' ? value * KG_TO_LB : value
  const format = (kgValue: number, decimals = 1) => {
    const v = fromKg(kgValue)
    return Number.isInteger(v) ? v.toString() : v.toFixed(decimals)
  }

  return (
    <UnitContext.Provider value={{ unit, setUnit, toKg, fromKg, format, label: unit }}>
      {children}
    </UnitContext.Provider>
  )
}

export function useUnit() {
  const context = useContext(UnitContext)
  if (!context) throw new Error('useUnit must be used within a UnitProvider')
  return context
}
