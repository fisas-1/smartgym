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
  const times = [0, 0.55, 1.1, 1.65, 2.2, 2.75]
  const freqs = [880, 1100, 880, 1100, 880, 1100]
  times.forEach((t, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = freqs[i]
    gain.gain.setValueAtTime(0, ctx.currentTime + t)
    gain.gain.linearRampToValueAtTime(0.8, ctx.currentTime + t + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.45)
    osc.start(ctx.currentTime + t)
    osc.stop(ctx.currentTime + t + 0.45)
  })
}

function vibrate() {
  if (navigator.vibrate) navigator.vibrate([500, 150, 500, 150, 500, 150, 800, 200, 800, 200, 800])
}

export default function RestTimer({ defaultSeconds = 90 }: { defaultSeconds?: number }) {
  const { t } = useTranslation()
  const [duration, setDuration] = useState(defaultSeconds)
  const [remaining, setRemaining] = useState(0)
  const [running, setRunning] = useState(false)
  const [showCustom, setShowCustom] = useState(false)
  const [customInput, setCustomInput] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const alarmTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  function fireAlarm() {
    alarmTimersRef.current.forEach(clearTimeout)
    alarmTimersRef.current = []
    const fire = () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.resume().then(() => playAlarmSound(audioCtxRef.current!)).catch(() => {})
      }
      vibrate()
    }
    fire()
    alarmTimersRef.current.push(setTimeout(fire, 3500))
    alarmTimersRef.current.push(setTimeout(fire, 7000))
    sendToSW({ type: 'TIMER_CANCEL' })
  }

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

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
    localStorage.setItem('rest_timer_default', String(sec))
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

  function adjustTimer(delta: number) {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return
    try {
      const { endTime, duration: dur } = JSON.parse(saved)
      const newEndTime = Math.max(Date.now() + 1000, endTime + delta * 1000)
      const newDuration = Math.max(1, dur + delta)
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ endTime: newEndTime, duration: newDuration }))
      setRemaining(Math.round((newEndTime - Date.now()) / 1000))
      setDuration(newDuration)
      sendToSW({ type: 'TIMER_START', endTime: newEndTime, title: t('timer.restDone'), body: t('timer.backToWork') })
    } catch {}
  }

  function confirmCustom() {
    const mins = customInput.includes(':')
      ? parseInt(customInput.split(':')[0]) * 60 + parseInt(customInput.split(':')[1] || '0')
      : parseInt(customInput)
    if (!isNaN(mins) && mins > 0) {
      startTimer(mins)
    }
    setCustomInput('')
    setShowCustom(false)
  }

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
  const barColor = remaining <= 10
    ? 'var(--accent-danger)'
    : remaining <= 30
    ? '#f97316'
    : 'var(--accent-success)'

  const surfaceStyle = {
    backgroundColor: 'color-mix(in srgb, var(--card) 90%, transparent)',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-soft)',
  }

  if (!running && remaining === 0) {
    if (showCustom) {
      return (
        <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 backdrop-blur-md rounded-full px-3 py-2 fade-in" style={surfaceStyle}>
          <input
            type="text"
            inputMode="numeric"
            value={customInput}
            onChange={e => setCustomInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') confirmCustom() }}
            placeholder="1:30"
            autoFocus
            className="w-16 text-center text-sm bg-transparent text-[var(--color-text-primary)] outline-none tabular-nums placeholder:text-[var(--color-text-tertiary)]"
          />
          <button onClick={confirmCustom}
            className="text-xs px-2.5 py-1 rounded-full text-[var(--color-text-primary)] bg-[var(--surface-hover)] hover:opacity-80 transition-opacity">
            ↵
          </button>
          <button onClick={() => { setShowCustom(false); setCustomInput('') }}
            className="text-xs px-2 py-1 rounded-full text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors">
            ✕
          </button>
        </div>
      )
    }

    return (
      <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-40 flex gap-1 items-center backdrop-blur-md rounded-full px-2 py-1.5 fade-in" style={surfaceStyle}>
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
        <div className="w-px h-3 bg-[var(--border)] mx-0.5" />
        <button
          onClick={() => setShowCustom(true)}
          className="text-xs px-2.5 py-1 rounded-full text-[var(--color-text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--color-text-primary)] transition-colors"
          title="Temps personalitzat"
        >
          ✎
        </button>
      </div>
    )
  }

  return (
    <div className={`fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-40 backdrop-blur-md rounded-2xl px-4 py-3 min-w-[240px] fade-in${remaining <= 5 && remaining > 0 ? ' timer-pulse' : ''}`} style={surfaceStyle}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)]">{t('timer.rest')}</p>
          <p className="text-2xl font-light text-[var(--color-text-primary)] tabular-nums">{display}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => adjustTimer(-15)}
            className="h-9 px-2 rounded-full bg-[var(--surface-strong)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--surface-hover)] text-xs font-medium transition-colors tabular-nums"
            title="-15s"
          >
            -15
          </button>
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
          <button
            onClick={() => adjustTimer(30)}
            className="h-9 px-2 rounded-full bg-[var(--surface-strong)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--surface-hover)] text-xs font-medium transition-colors tabular-nums"
            title="+30s"
          >
            +30
          </button>
        </div>
      </div>
      <div className="mt-2 h-1 bg-[var(--surface-strong)] rounded-full overflow-hidden">
        <div className="h-full" style={{ width: `${pct}%`, backgroundColor: barColor, transition: 'width 1s linear, background-color 0.5s ease' }} />
      </div>
    </div>
  )
}
