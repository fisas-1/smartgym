'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '../contexts/LanguageContext'

const PRESETS = [60, 90, 120, 180]
const STORAGE_KEY = 'rest_timer_state'

async function sendToSW(message: object) {
  if (!('serviceWorker' in navigator)) return
  try {
    const reg = await navigator.serviceWorker.ready
    reg.active?.postMessage(message)
  } catch {}
}

function playAlarmSound(ctx: AudioContext) {
  ;[0, 0.45, 0.9].forEach(t => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0, ctx.currentTime + t)
    gain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + t + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.35)
    osc.start(ctx.currentTime + t)
    osc.stop(ctx.currentTime + t + 0.35)
  })
}

function vibrate() {
  if (navigator.vibrate) navigator.vibrate([400, 100, 400, 100, 600])
}

export default function RestTimer({ defaultSeconds = 90 }: { defaultSeconds?: number }) {
  const { t } = useTranslation()
  const [duration, setDuration] = useState(defaultSeconds)
  const [remaining, setRemaining] = useState(0)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  function fireAlarm() {
    if (audioCtxRef.current) {
      audioCtxRef.current.resume().then(() => playAlarmSound(audioCtxRef.current!)).catch(() => {})
    }
    vibrate()
    sendToSW({ type: 'TIMER_CANCEL' })
  }

  // Register SW once on mount
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  // Restore timer from localStorage on mount (handles page refresh)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return
    try {
      const { endTime, duration: savedDuration } = JSON.parse(saved)
      const left = Math.round((endTime - Date.now()) / 1000)
      if (left > 0) {
        setDuration(savedDuration)
        setRemaining(left)
        setRunning(true)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  // Recalculate when app comes back to foreground (after screen lock)
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState !== 'visible') return
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return
      try {
        const { endTime, duration: savedDuration } = JSON.parse(saved)
        const left = Math.round((endTime - Date.now()) / 1000)
        if (left > 0) {
          setDuration(savedDuration)
          setRemaining(left)
          setRunning(true)
        } else {
          localStorage.removeItem(STORAGE_KEY)
          setRemaining(0)
          setRunning(false)
          fireAlarm()
        }
      } catch {}
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  // Countdown interval
  useEffect(() => {
    if (!running) return
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(intervalRef.current!)
          setRunning(false)
          localStorage.removeItem(STORAGE_KEY)
          fireAlarm()
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  function startTimer(sec: number) {
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      } catch {}
    }
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
    const endTime = Date.now() + sec * 1000
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ endTime, duration: sec }))
    setDuration(sec)
    setRemaining(sec)
    setRunning(true)
    sendToSW({
      type: 'TIMER_START',
      endTime,
      title: t('timer.restDone'),
      body: t('timer.backToWork'),
    })
  }

  function stopTimer() {
    setRemaining(0)
    setRunning(false)
    localStorage.removeItem(STORAGE_KEY)
    sendToSW({ type: 'TIMER_CANCEL' })
  }

  // Listen for rest-timer:start event (fired when a set is completed)
  useEffect(() => {
    function onStart(e: any) {
      const sec = e?.detail?.seconds ?? duration
      startTimer(sec)
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
      <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-40 flex gap-1 backdrop-blur-md rounded-full px-2 py-1.5 fade-in" style={surfaceStyle}>
        {PRESETS.map(p => (
          <button
            key={p}
            onClick={() => startTimer(p)}
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
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-40 backdrop-blur-md rounded-2xl px-4 py-3 min-w-[220px] fade-in" style={surfaceStyle}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)]">{t('timer.rest')}</p>
          <p className="text-2xl font-light text-[var(--color-text-primary)] tabular-nums">{display}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={stopTimer}
            className="w-9 h-9 rounded-full bg-[var(--surface-strong)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--surface-hover)] text-sm transition-colors"
            title={t('timer.stop')}
            aria-label={t('timer.stop')}
          >
            ✕
          </button>
          <button
            onClick={() => startTimer(duration)}
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
