'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '../contexts/LanguageContext'

type Props = {
  defaultSeconds?: number
}

const PRESETS = [60, 90, 120, 180]

export type RestTimerHandle = {
  start: (seconds?: number) => void
}

export default function RestTimer({ defaultSeconds = 90 }: Props) {
  const { t } = useTranslation()
  const [duration, setDuration] = useState(defaultSeconds)
  const [remaining, setRemaining] = useState(0)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!running) return
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          setRunning(false)
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([200, 100, 200])
          }
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  useEffect(() => {
    function onStart(e: any) {
      const sec = e?.detail?.seconds ?? duration
      setDuration(sec)
      setRemaining(sec)
      setRunning(true)
    }
    window.addEventListener('rest-timer:start', onStart as EventListener)
    return () => window.removeEventListener('rest-timer:start', onStart as EventListener)
  }, [duration])

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const display = `${mins}:${secs.toString().padStart(2, '0')}`
  const pct = duration > 0 ? (remaining / duration) * 100 : 0

  const surfaceStyle = {
    backgroundColor: 'color-mix(in srgb, var(--card) 90%, transparent)',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-soft)',
  }

  if (!running && remaining === 0) {
    return (
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 flex gap-1 backdrop-blur-md rounded-full px-2 py-1.5 fade-in" style={surfaceStyle}>
        {PRESETS.map(p => (
          <button
            key={p}
            onClick={() => { setDuration(p); setRemaining(p); setRunning(true) }}
            className="text-xs px-2.5 py-1 rounded-full text-[var(--color-text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--color-text-primary)] transition-colors tabular-nums"
            title={t('timer.seconds', { seconds: String(p) })}
          >
            {p < 60 ? `${p}s` : `${Math.floor(p / 60)}'${p % 60 ? p % 60 : ''}`}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 backdrop-blur-md rounded-2xl px-4 py-3 min-w-[220px] fade-in" style={surfaceStyle}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)]">{t('timer.rest')}</p>
          <p className="text-2xl font-light text-[var(--color-text-primary)] tabular-nums">{display}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setRemaining(0); setRunning(false) }}
            className="w-9 h-9 rounded-full bg-[var(--surface-strong)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--surface-hover)] text-sm transition-colors"
            title={t('timer.stop')}
            aria-label={t('timer.stop')}
          >
            ✕
          </button>
          <button
            onClick={() => { setRemaining(duration); setRunning(true) }}
            className="w-9 h-9 rounded-full bg-[var(--surface-strong)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--surface-hover)] text-sm transition-colors"
            title={t('timer.restart')}
            aria-label={t('timer.restart')}
          >
            ↺
          </button>
        </div>
      </div>
      <div className="mt-2 h-1 bg-[var(--surface-strong)] rounded-full overflow-hidden">
        <div className="h-full transition-all duration-1000 ease-linear" style={{ width: `${pct}%`, backgroundColor: 'var(--accent-success)' }} />
      </div>
    </div>
  )
}
