'use client'

import { useTranslation } from '../contexts/LanguageContext'

interface Props {
  value: string
  onChange: (v: string) => void
  onClose: () => void
  allowDecimal?: boolean
  label: string
  maxLength?: number
}

const BackspaceIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
    <line x1="18" y1="9" x2="12" y2="15" />
    <line x1="12" y1="9" x2="18" y2="15" />
  </svg>
)

export default function NumericKeyboard({
  value,
  onChange,
  onClose,
  allowDecimal = false,
  label,
  maxLength = 6,
}: Props) {
  const { t } = useTranslation()

  function press(key: string) {
    if (key === 'del') {
      onChange(value.slice(0, -1))
      return
    }
    if (key === 'clear') {
      onChange('')
      return
    }
    if (key === '.') {
      if (!allowDecimal || value.includes('.')) return
      onChange(value === '' ? '0.' : value + '.')
      return
    }
    if (value.replace('.', '').length >= maxLength) return
    onChange(value === '0' ? key : value + key)
  }

  const rows: string[][] = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    [allowDecimal ? '.' : 'clear', '0', 'del'],
  ]

  return (
    <>
      {/* Backdrop — closes keyboard on outside tap */}
      <div className="fixed inset-0 z-[54]" onClick={onClose} />

      <div
        className="fixed bottom-0 left-0 right-0 z-[55]"
        style={{ background: 'var(--card)', borderTop: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <span className="text-[10px] tracking-widest uppercase font-medium text-[var(--color-text-tertiary)]">
            {label}
          </span>
          <span className="text-xl font-light tabular-nums text-[var(--color-text-primary)] min-w-[3rem] text-center">
            {value || '0'}
          </span>
          <button
            onPointerDown={(e) => { e.preventDefault(); onClose() }}
            className="px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide"
            style={{ background: 'var(--color-text-primary)', color: 'var(--color-bg-primary)' }}
          >
            {t('common.done')}
          </button>
        </div>

        {/* Key grid */}
        <div className="grid grid-cols-3" style={{ gap: '1px', background: 'var(--border)' }}>
          {rows.flat().map((key, i) => {
            const isSpecial = key === 'del' || key === 'clear' || key === '.'
            return (
              <button
                key={i}
                onPointerDown={(e) => { e.preventDefault(); press(key) }}
                className={`h-[54px] flex items-center justify-center select-none transition-colors active:opacity-60
                  ${isSpecial
                    ? 'bg-[var(--surface)] text-[var(--color-text-secondary)]'
                    : 'bg-[var(--card)] text-[var(--color-text-primary)]'
                  }`}
                style={{ WebkitTapHighlightColor: 'transparent' } as React.CSSProperties}
              >
                {key === 'del' ? (
                  <BackspaceIcon />
                ) : key === 'clear' ? (
                  <span className="text-sm font-medium">C</span>
                ) : (
                  <span className="text-2xl font-light">{key}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Safe area for home indicator */}
        <div style={{ height: 'max(env(safe-area-inset-bottom), 4px)', background: 'var(--card)' }} />
      </div>
    </>
  )
}
