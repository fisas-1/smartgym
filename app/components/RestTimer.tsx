'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  defaultSeconds?: number
}

const PRESETS = [60, 90, 120, 180]

export type RestTimerHandle = {
  start: (seconds?: number) => void
}

export default function RestTimer({ defaultSeconds = 90 }: Props) {
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

  if (!running && remaining === 0) {
    return (
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 flex gap-1.5 bg-zinc-900/90 backdrop-blur border border-zinc-800 rounded-full px-2 py-1.5 shadow-lg">
        {PRESETS.map(p => (
          <button
            key={p}
            onClick={() => { setDuration(p); setRemaining(p); setRunning(true) }}
            className="text-xs px-2.5 py-1 rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            title={`Descans ${p}s`}
          >
            {p < 60 ? `${p}s` : `${Math.floor(p / 60)}'${p % 60 ? p % 60 : ''}`}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 bg-zinc-900/95 backdrop-blur border border-zinc-700 rounded-2xl px-4 py-3 shadow-xl min-w-[220px]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Descans</p>
          <p className="text-2xl font-light text-white tabular-nums">{display}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setRemaining(0); setRunning(false) }}
            className="w-9 h-9 rounded-full bg-zinc-800 text-zinc-400 hover:text-white text-sm"
            title="Aturar"
          >
            ✕
          </button>
          <button
            onClick={() => { setRemaining(duration); setRunning(true) }}
            className="w-9 h-9 rounded-full bg-zinc-800 text-zinc-400 hover:text-white text-sm"
            title="Reiniciar"
          >
            ↺
          </button>
        </div>
      </div>
      <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
