'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './contexts/AuthContext'
import { Exercise, DEFAULT_EXERCISES, WorkoutLog, EXERCISE_INFO, EXERCISE_KEYS, EXERCISE_VARIANTS, VARIANT_KEYS, isVariantUnilateral, RoutineExercise, RoutineSet, calculate1RM } from '@/types'
import { useTranslation } from './contexts/LanguageContext'
import { useTheme } from './contexts/ThemeContext'
import { useUnit } from './contexts/UnitContext'
import NumericKeyboard from './components/NumericKeyboard'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calc1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0 || reps > 20) return 0
  const denom = 1.0278 - 0.0278 * reps
  if (denom <= 0) return 0
  return Math.round(weight / denom * 10) / 10
}

const MUSCLE_ABBR: Record<string, string> = {
  'Pectoral':   'PEC',
  'Esquena':    'ESQ',
  'Cames':      'CAM',
  'Esquitxos':  'ESP',
  'Braços':     'BRA',
  'Abdominals': 'ABD',
  'Gluts':      'GLU',
  'Full Body':  'FB',
}

function computeStreak(logs: { created_at: string }[]): { current: number; best: number } {
  if (!logs.length) return { current: 0, best: 0 }
  const days = [...new Set(logs.map(l => l.created_at.slice(0, 10)))].sort().reverse()
  const today = new Date().toISOString().slice(0, 10)
  let current = 0
  let checkDay = today
  for (const day of days) {
    if (day === checkDay) {
      current++
      checkDay = new Date(new Date(checkDay).getTime() - 86400000).toISOString().slice(0, 10)
    } else if (day < checkDay) break
  }
  let best = 0, temp = 1
  for (let i = 0; i < days.length - 1; i++) {
    const diff = (new Date(days[i]).getTime() - new Date(days[i + 1]).getTime()) / 86400000
    if (Math.round(diff) === 1) { temp++ } else { best = Math.max(best, temp); temp = 1 }
  }
  best = Math.max(best, temp, current)
  return { current, best }
}

type ActiveSession = { routineId: string; routineName: string; startTime: number }
type LastSessions = Record<string, { date: string; sets: { weight: number; reps: number; rir: number | null }[] }>

// ─── Logged-out view ─────────────────────────────────────────────────────────

function LoggedOutView({ t }: { t: (key: string) => string }) {
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] flex flex-col px-6 py-16">
      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto space-y-8 animate-slide-up">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-light tracking-tight">Gymmoo.</h1>
          <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">{t('home.welcome')}</p>
        </div>
        <div className="card-surface divide-y divide-[var(--border)]">
          {[
            { icon: '📈', label: t('home.featureProgress'), delay: 'stagger-2' },
            { icon: '📋', label: t('home.featureRoutines'), delay: 'stagger-3' },
            { icon: '🏆', label: t('home.featureFriends'), delay: 'stagger-4' },
          ].map(({ icon, label, delay }) => (
            <div key={icon} className={`flex items-center gap-3 px-4 py-3 animate-slide-up ${delay}`}>
              <span className="text-lg w-7 text-center flex-shrink-0">{icon}</span>
              <span className="text-sm text-[var(--color-text-secondary)]">{label}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <a href="/login" className="w-full py-4 px-6 rounded-2xl font-medium text-center bg-[var(--color-text-primary)] text-[var(--color-bg-primary)] hover:opacity-90 transition-opacity">
            {t('common.register')}
          </a>
          <a href="/login" className="w-full py-4 px-6 rounded-2xl font-medium text-center border border-[var(--border)] text-[var(--color-text-primary)] hover:bg-[var(--surface-strong)] transition-colors">
            {t('common.login')}
          </a>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HomePage() {
  const { user } = useAuth()
  const { t, locale } = useTranslation()
  const { theme } = useTheme()
  const { unit, toKg, fromKg, format } = useUnit()

  // ── Session state ──────────────────────────────────────────────────────────
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [routineExercises, setRoutineExercises] = useState<RoutineExercise[]>([])
  const [routineSets, setRoutineSets] = useState<Record<string, RoutineSet[]>>({})
  const [lastSessions, setLastSessions] = useState<LastSessions>({})
  const [bestOneRM, setBestOneRM] = useState<Record<string, number>>({})
  const [todayVolume, setTodayVolume] = useState(0)
  const [prevVolume, setPrevVolume] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [sessionElapsed, setSessionElapsed] = useState(0)
  const [userName, setUserName] = useState('')
  const [userInitials, setUserInitials] = useState('')

  // ── Inline rest timer ──────────────────────────────────────────────────────
  const [restRemaining, setRestRemaining] = useState(0)
  const [restRunning, setRestRunning] = useState(false)
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Log set modal ──────────────────────────────────────────────────────────
  const [showLogModal, setShowLogModal] = useState(false)
  const [logWeight, setLogWeight] = useState('')
  const [logReps, setLogReps] = useState('')
  const [logRir, setLogRir] = useState('2')
  const [logNote, setLogNote] = useState('')
  const [logShowExtra, setLogShowExtra] = useState(false)
  const [logLoading, setLogLoading] = useState(false)
  const [activeLogInput, setActiveLogInput] = useState<'weight' | 'reps' | null>(null)
  const [prMsg, setPrMsg] = useState<string | null>(null)

  // ── Extra exercise (fora rutina) ───────────────────────────────────────────
  const [showExtraLog, setShowExtraLog] = useState(false)
  const [extraExercise, setExtraExercise] = useState<Exercise>('Press Banca')
  const [extraVariant, setExtraVariant] = useState<string>('')
  const [extraWeight, setExtraWeight] = useState('')
  const [extraReps, setExtraReps] = useState('')
  const [extraRir, setExtraRir] = useState('')
  const [extraNote, setExtraNote] = useState('')
  const [extraShowExtra, setExtraShowExtra] = useState(false)
  const [activeExtraInput, setActiveExtraInput] = useState<'weight' | 'reps' | null>(null)
  const [extraLoading, setExtraLoading] = useState(false)

  // ── Quick-log form state (no-session fallback) ─────────────────────────────
  const [exercise, setExercise] = useState<Exercise>('Press Banca')
  const [variant, setVariant] = useState<string>('')
  const [weight, setWeight] = useState<string>('')
  const [reps, setReps] = useState<string>('')
  const [rir, setRir] = useState<string>('')
  const [oneRM, setOneRM] = useState<number>(0)
  const [displayedOneRM, setDisplayedOneRM] = useState(0)
  const [weightType, setWeightType] = useState('pes')
  const [savedSets, setSavedSets] = useState<any[]>([])
  const [formLoading, setFormLoading] = useState(false)
  const [customExercises, setCustomExercises] = useState<string[]>([])
  const [showModal, setShowModal] = useState(false)
  const [newExerciseName, setNewExerciseName] = useState('')
  const [newExercisePrimary, setNewExercisePrimary] = useState('')
  const [newExerciseSecondary, setNewExerciseSecondary] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [note, setNote] = useState<string>('')
  const [bestPerExercise, setBestPerExercise] = useState<Record<string, number>>({})
  const [activeInput, setActiveInput] = useState<'weight' | 'reps' | null>(null)
  const [showExtraOptions, setShowExtraOptions] = useState(false)
  const [userBodyweightKg, setUserBodyweightKg] = useState<number | null>(null)
  const animRef = useRef<number | null>(null)

  // ─── tEx: translate exercise name ─────────────────────────────────────────
  const tEx = (name: string) => {
    const bwSuffix = ' - Pes corporal'
    let displayName = name
    let isBw = false
    if (displayName.endsWith(bwSuffix)) { displayName = displayName.slice(0, -bwSuffix.length); isBw = true }
    const dotIdx = displayName.indexOf(' · ')
    let result: string
    if (dotIdx !== -1) {
      const base = displayName.slice(0, dotIdx)
      const v = displayName.slice(dotIdx + 3)
      const baseKey = EXERCISE_KEYS[base]
      const variantKey = VARIANT_KEYS[v]
      result = `${baseKey ? t(baseKey) : base} · ${variantKey ? t(variantKey) : v}`
    } else {
      const key = EXERCISE_KEYS[displayName]
      result = key ? t(key) : displayName
    }
    return isBw ? `${result} - ${t('workouts.bodyweight')}` : result
  }

  // ─── Session init ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { setSessionLoading(false); return }
    initSession()
  }, [user])

  async function initSession() {
    setSessionLoading(true)
    try {
      // User name from auth metadata
      const rawName: string = (user?.user_metadata?.username as string) || user?.email?.split('@')[0] || 'Usuari'
      const firstName = rawName.split(/[\s._]/)[0]
      const cap = firstName.charAt(0).toUpperCase() + firstName.slice(1)
      setUserName(cap)
      setUserInitials(rawName.slice(0, 2).toUpperCase())

      // Find today's routine
      const routineDays: Record<string, number[]> = JSON.parse(localStorage.getItem('routine_days') || '{}')
      const today = new Date().getDay()
      const todayRoutineId = Object.entries(routineDays).find(([, days]) => days.includes(today))?.[0]

      if (!todayRoutineId) { setSessionLoading(false); return }

      const { data: routine } = await supabase.from('routines').select('*').eq('id', todayRoutineId).eq('user_id', user!.id).single()
      if (!routine) { setSessionLoading(false); return }

      // Get or create session start time (scoped to today)
      const todayStr = new Date().toISOString().slice(0, 10)
      const stored = localStorage.getItem('active_session')
      let session: ActiveSession
      if (stored) {
        const parsed = JSON.parse(stored)
        const sessionDay = new Date(parsed.startTime).toISOString().slice(0, 10)
        if (parsed.routineId === todayRoutineId && sessionDay === todayStr) {
          session = parsed
        } else {
          session = { routineId: todayRoutineId, routineName: routine.name, startTime: Date.now() }
          localStorage.setItem('active_session', JSON.stringify(session))
        }
      } else {
        session = { routineId: todayRoutineId, routineName: routine.name, startTime: Date.now() }
        localStorage.setItem('active_session', JSON.stringify(session))
      }
      setActiveSession(session)

      // Load all data
      await Promise.all([
        loadRoutineData(todayRoutineId),
        loadTodayStats(),
        loadStreak(),
      ])
    } finally {
      setSessionLoading(false)
    }
  }

  async function loadRoutineData(routineId: string) {
    const { data: exercises } = await supabase
      .from('routine_exercises').select('*').eq('routine_id', routineId).order('order_index', { ascending: true })
    if (!exercises || exercises.length === 0) return
    setRoutineExercises(exercises)

    const ids = exercises.map((e: RoutineExercise) => e.id)
    const { data: sets } = await supabase
      .from('routine_sets').select('*').in('routine_exercise_id', ids).order('set_number', { ascending: true })
    const grouped: Record<string, RoutineSet[]> = {}
    for (const s of sets || []) {
      if (!grouped[s.routine_exercise_id]) grouped[s.routine_exercise_id] = []
      grouped[s.routine_exercise_id].push(s)
    }
    setRoutineSets(grouped)

    const exNames = exercises.map((e: RoutineExercise) => e.exercise)
    await Promise.all([loadLastSessionsFor(exNames), loadBestOneRM(exNames)])
  }

  async function loadLastSessionsFor(names: string[]) {
    if (!user || !names.length) return
    const { data } = await supabase
      .from('workout_logs').select('exercise, weight, reps, rir, created_at')
      .eq('user_id', user.id).in('exercise', names).order('created_at', { ascending: false }).limit(500)
    if (!data) return
    const grouped: LastSessions = {}
    for (const log of data) {
      const dayKey = log.created_at.slice(0, 10)
      const entry = grouped[log.exercise]
      if (!entry) {
        grouped[log.exercise] = { date: dayKey, sets: [{ weight: log.weight, reps: log.reps, rir: log.rir }] }
      } else if (entry.date === dayKey) {
        entry.sets.push({ weight: log.weight, reps: log.reps, rir: log.rir })
      }
    }
    for (const ex of Object.keys(grouped)) grouped[ex].sets.reverse()
    setLastSessions(grouped)
  }

  async function loadBestOneRM(names: string[]) {
    if (!user || !names.length) return
    const { data } = await supabase.from('workout_logs').select('exercise, one_rm').eq('user_id', user.id).in('exercise', names)
    const best: Record<string, number> = {}
    for (const l of data || []) { if ((l.one_rm || 0) > (best[l.exercise] || 0)) best[l.exercise] = l.one_rm }
    setBestOneRM(best)
  }

  async function loadTodayStats() {
    if (!user) return
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const { data: todayLogs } = await supabase
      .from('workout_logs').select('weight, reps').eq('user_id', user.id).gte('created_at', todayStart.toISOString())
    setTodayVolume((todayLogs || []).reduce((s, l) => s + l.weight * l.reps, 0))

    const prevStart = new Date(todayStart); prevStart.setDate(prevStart.getDate() - 7)
    const { data: prevLogs } = await supabase
      .from('workout_logs').select('weight, reps').eq('user_id', user.id)
      .gte('created_at', prevStart.toISOString()).lt('created_at', todayStart.toISOString())
    setPrevVolume((prevLogs || []).reduce((s, l) => s + l.weight * l.reps, 0))
  }

  async function loadStreak() {
    if (!user) return
    const { data } = await supabase
      .from('workout_logs').select('created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(365)
    const { current, best } = computeStreak(data || [])
    setStreak(current)
    setBestStreak(best)
  }

  // ─── Session elapsed timer ─────────────────────────────────────────────────
  useEffect(() => {
    if (!activeSession) return
    const iv = setInterval(() => setSessionElapsed(Math.floor((Date.now() - activeSession.startTime) / 1000)), 1000)
    return () => clearInterval(iv)
  }, [activeSession])

  // ─── Rest timer (inline, synced with RestTimer component via localStorage) ──
  useEffect(() => {
    const saved = localStorage.getItem('rest_timer_state')
    if (saved) {
      try {
        const { endTime, duration } = JSON.parse(saved)
        const left = Math.round((endTime - Date.now()) / 1000)
        if (left > 0) { setRestRemaining(left); setRestRunning(true) }
      } catch {}
    }
    function onStart(e: any) {
      const sec = e?.detail?.seconds ?? 90
      setRestRemaining(sec); setRestRunning(true)
    }
    window.addEventListener('rest-timer:start', onStart as EventListener)
    return () => window.removeEventListener('rest-timer:start', onStart as EventListener)
  }, [])

  useEffect(() => {
    if (!restRunning) return
    restIntervalRef.current = setInterval(() => {
      setRestRemaining(r => { if (r <= 1) { setRestRunning(false); return 0 } return r - 1 })
    }, 1000)
    return () => { if (restIntervalRef.current) clearInterval(restIntervalRef.current) }
  }, [restRunning])

  function skipRest() {
    setRestRemaining(0); setRestRunning(false)
    localStorage.removeItem('rest_timer_state')
  }

  // ─── Computed session values ───────────────────────────────────────────────
  const currentExercise = routineExercises.find(re => (routineSets[re.id] || []).some(s => !s.completed)) || null
  const currentExIdx = currentExercise ? routineExercises.indexOf(currentExercise) : -1
  const nextExercise = currentExIdx >= 0 ? routineExercises[currentExIdx + 1] || null : null
  const upcomingExercises = currentExIdx >= 0 ? routineExercises.slice(currentExIdx + 1) : []
  const currentSets = currentExercise ? (routineSets[currentExercise.id] || []) : []
  const nextIncompleteSet = currentSets.find(s => !s.completed) || null
  const completedSetsToday = routineExercises.reduce((sum, re) => sum + (routineSets[re.id] || []).filter(s => s.completed).length, 0)
  const totalSetsTarget = routineExercises.reduce((sum, re) => sum + re.sets_target, 0)
  const lastCompletedSet = [...currentSets].filter(s => s.completed).pop()
  const current1RM = lastCompletedSet && lastCompletedSet.weight > 0 ? calc1RM(lastCompletedSet.weight, lastCompletedSet.reps) : 0
  const best1RM = currentExercise ? (bestOneRM[currentExercise.exercise] || 0) : 0
  const oneRMDiff = current1RM > 0 && best1RM > 0 ? Math.round((current1RM - best1RM) * 10) / 10 : null

  const elapsedMins = Math.floor(sessionElapsed / 60)
  const restPreset = typeof window !== 'undefined' ? parseInt(localStorage.getItem('rest_timer_default') || '90', 10) : 90
  const remainingSets = Math.max(0, totalSetsTarget - completedSetsToday)
  const estimatedRemainingMins = Math.max(0, Math.round((remainingSets * (restPreset + 35)) / 60))

  const hour = new Date().getHours()
  const greetingKey = hour < 12 ? 'home.goodMorning' : hour < 19 ? 'home.goodAfternoon' : 'home.goodEvening'
  const dayName = new Date().toLocaleDateString(locale, { weekday: 'long' })
  const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1)

  // ─── Log set modal helpers ─────────────────────────────────────────────────
  const prevSessionSets = currentExercise ? (lastSessions[currentExercise.exercise]?.sets || []) : []
  const prevSetForCurrent = nextIncompleteSet ? prevSessionSets[nextIncompleteSet.set_number - 1] : null
  const recWeightKg = prevSetForCurrent?.weight || nextIncompleteSet?.weight || 0
  const recReps = prevSetForCurrent?.reps || currentExercise?.reps_min || 8

  function openLogModal() {
    if (!nextIncompleteSet) return
    setLogWeight(recWeightKg > 0 ? String(unit === 'kg' ? recWeightKg : Number(fromKg(recWeightKg).toFixed(1))) : '')
    setLogReps(String(recReps))
    setLogRir('2')
    setLogNote('')
    setLogShowExtra(false)
    setActiveLogInput(null)
    setShowLogModal(true)
  }

  async function handleLogSet() {
    if (!currentExercise || !user || !nextIncompleteSet || !activeSession) return
    const wInput = parseFloat(logWeight)
    const r = parseInt(logReps)
    if (isNaN(r) || r <= 0) return
    setLogLoading(true)
    try {
      const wKg = isNaN(wInput) || wInput <= 0 ? 0 : toKg(wInput)
      const rirVal = logRir === '' ? null : parseFloat(logRir)
      const one_rm = wKg > 0 ? calc1RM(wKg, r) : 0

      // Check PR
      let isPr = false
      if (one_rm > 0) {
        const prev = bestOneRM[currentExercise.exercise] || 0
        if (one_rm > prev) { isPr = true; setBestOneRM(b => ({ ...b, [currentExercise.exercise]: one_rm })) }
      }

      await supabase.from('routine_sets').update({
        weight: wKg, reps: r, rir: rirVal, completed: true, completed_at: new Date().toISOString()
      }).eq('id', nextIncompleteSet.id)

      const logInsert: any = { exercise: currentExercise.exercise, weight: wKg, reps: r, rir: rirVal, one_rm, user_id: user.id }
      if (logNote.trim()) logInsert.note = logNote.trim()
      await supabase.from('workout_logs').insert(logInsert)

      const sec = typeof window !== 'undefined' ? parseInt(localStorage.getItem('rest_timer_default') || '90', 10) : 90
      window.dispatchEvent(new CustomEvent('rest-timer:start', { detail: { seconds: sec } }))
      if (navigator.vibrate) navigator.vibrate(isPr ? [60, 40, 60, 40, 120] : 40)

      if (isPr) {
        setPrMsg(t('home.newPr', { exercise: tEx(currentExercise.exercise), value: format(one_rm), unit }))
        setTimeout(() => setPrMsg(null), 5000)
      }

      setShowLogModal(false)
      setActiveLogInput(null)
      await Promise.all([loadRoutineData(activeSession.routineId), loadTodayStats()])
    } finally {
      setLogLoading(false)
    }
  }

  async function handleExtraLogSave() {
    const wInput = parseFloat(extraWeight), r = parseInt(extraReps)
    if (isNaN(r) || r <= 0 || !user) return
    setExtraLoading(true)
    try {
      const wKg = isNaN(wInput) || wInput <= 0 ? 0 : toKg(wInput)
      const rirVal = extraRir === '' ? null : parseFloat(extraRir)
      const exBase = extraVariant ? `${extraExercise} · ${extraVariant}` : extraExercise
      const one_rm = wKg > 0 ? calc1RM(wKg, r) : 0
      const insertData: any = { exercise: exBase, weight: wKg, reps: r, rir: rirVal, one_rm, user_id: user.id }
      if (extraNote.trim()) insertData.note = extraNote.trim()
      await supabase.from('workout_logs').insert(insertData)
      if (navigator.vibrate) navigator.vibrate(40)
      setExtraWeight(''); setExtraReps(''); setExtraRir(''); setExtraNote('')
      setExtraShowExtra(false); setActiveExtraInput(null)
      await loadTodayStats()
    } finally { setExtraLoading(false) }
  }

  // ─── Quick-log form (no-session fallback) ─────────────────────────────────

  useEffect(() => {
    const saved = localStorage.getItem('custom_exercises')
    if (saved) setCustomExercises(JSON.parse(saved))
    const profile = localStorage.getItem('user_profile')
    if (profile) { const p = JSON.parse(profile); setUserBodyweightKg(p.weight ?? null) }
  }, [])

  useEffect(() => {
    if (activeSession) return
    const w = parseFloat(weight), r = parseFloat(reps)
    if (isNaN(r) || r <= 0) { setOneRM(0); return }
    const info = EXERCISE_INFO[exercise as Exercise]
    const bwKg = userBodyweightKg ?? 70
    const unilateral = variant ? isVariantUnilateral(exercise as string, variant) : false
    if (info?.addsBodyweightToRM) {
      const extKg = (!isNaN(w) && w > 0 && weightType === 'pes') ? toKg(w) : 0
      setOneRM(calc1RM(bwKg + extKg, r))
    } else if (!isNaN(w) && w > 0 && weightType === 'pes') {
      setOneRM(calc1RM(toKg(w) * (unilateral ? 2 : 1), r))
    } else { setOneRM(0) }
  }, [weight, reps, unit, exercise, weightType, userBodyweightKg, activeSession])

  useEffect(() => { if (!activeSession && user) loadSavedSets() }, [user, activeSession])

  useEffect(() => {
    if (activeSession) return
    const id = setTimeout(async () => {
      if (!exercise) return
      const { data: logs } = await supabase
        .from('workout_logs').select('*').eq('exercise', exercise).order('created_at', { ascending: false }).limit(14)
      if (!logs || logs.length < 2) { setSuggestion(null); return }
      const recent = logs.slice(0, 7), prev = logs.slice(7, 14)
      if (!prev.length) { setSuggestion(null); return }
      const avgR = recent.reduce((s, l) => s + (l.one_rm || 0), 0) / recent.length
      const avgP = prev.reduce((s, l) => s + (l.one_rm || 0), 0) / prev.length
      if (avgR <= avgP) { setSuggestion(null); return }
      const imp = Math.round(((avgR - avgP) / avgP) * 100)
      const target = Math.round((avgR + 2.5) * 10) / 10
      setSuggestion(t('home.suggestionFormat', { weight: format(target), unit, improvement: String(imp) }))
    }, 400)
    return () => clearTimeout(id)
  }, [exercise, t, format, unit, activeSession])

  useEffect(() => {
    if (activeSession) return
    if (animRef.current) cancelAnimationFrame(animRef.current)
    const start = displayedOneRM, end = oneRM
    if (start === end) return
    const duration = 400, startTime = performance.now()
    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1)
      setDisplayedOneRM(Math.round(start + (end - start) * progress))
      if (progress < 1) animRef.current = requestAnimationFrame(step)
    }
    animRef.current = requestAnimationFrame(step)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [oneRM, activeSession])

  useEffect(() => { setVariant(''); const info = EXERCISE_INFO[exercise as Exercise]; if (info && (!info.hasBodyweight || !info.hasWeight)) setWeightType('pes') }, [exercise])

  async function loadSavedSets() {
    if (!user) { setSavedSets([]); setBestPerExercise({}); return }
    const { data } = await supabase.from('workout_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8)
    if (data) {
      setSavedSets(data)
      const exs = Array.from(new Set(data.map((s: any) => s.exercise)))
      if (exs.length > 0) {
        const { data: allLogs } = await supabase.from('workout_logs').select('exercise, one_rm').eq('user_id', user.id).in('exercise', exs)
        const best: Record<string, number> = {}
        for (const l of allLogs || []) { if ((l.one_rm || 0) > (best[l.exercise] || 0)) best[l.exercise] = l.one_rm }
        setBestPerExercise(best)
      }
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const wInput = parseFloat(weight), r = parseFloat(reps)
    if (isNaN(r) || r <= 0) return
    const info = EXERCISE_INFO[exercise as Exercise]
    if (weightType === 'pes' && !info?.addsBodyweightToRM && (isNaN(wInput) || wInput <= 0)) return
    setFormLoading(true); setErrorMsg(null)
    try {
      const wKg = isNaN(wInput) ? 0 : toKg(wInput)
      const bwKg = userBodyweightKg ?? 70
      const unilateral = variant ? isVariantUnilateral(exercise as string, variant) : false
      let effectiveOneRM = 0
      if (info?.addsBodyweightToRM) { effectiveOneRM = calc1RM(bwKg + (weightType === 'pes' ? wKg : 0), r) }
      else if (weightType === 'pes') { effectiveOneRM = calc1RM(wKg * (unilateral ? 2 : 1), r) }
      const exerciseBase = variant ? `${exercise} · ${variant}` : exercise
      const exerciseToStore = weightType === 'corporal' ? `${exerciseBase} - Pes corporal` : exerciseBase
      let isPr = false
      if (effectiveOneRM > 0 && user) {
        const { data: prev } = await supabase.from('workout_logs').select('one_rm').eq('user_id', user.id).eq('exercise', exerciseToStore).order('one_rm', { ascending: false }).limit(1)
        if (effectiveOneRM > (prev?.[0]?.one_rm || 0)) isPr = true
      }
      const insertData: any = { exercise: exerciseToStore, weight: weightType === 'corporal' ? 0 : wKg, reps: r, rir: rir === '' ? null : parseFloat(rir), one_rm: effectiveOneRM, user_id: user?.id }
      if (note.trim()) insertData.note = note.trim()
      const { error } = await supabase.from('workout_logs').insert(insertData)
      if (error) { setErrorMsg(t('common.saveError') + error.message); return }
      setWeight(''); setReps(''); setRir(''); setNote(''); setActiveInput(null)
      if (navigator.vibrate) navigator.vibrate(isPr ? [60, 40, 60, 40, 120] : 40)
      if (isPr) { setPrMsg(t('home.newPr', { exercise: tEx(exerciseToStore), value: format(effectiveOneRM), unit })); setTimeout(() => setPrMsg(null), 6000) }
      await loadSavedSets()
    } finally { setFormLoading(false) }
  }

  function handleAddExercise() {
    const trimmed = newExerciseName.trim()
    if (!trimmed) { setErrorMsg(t('common.required')); return }
    if (DEFAULT_EXERCISES.includes(trimmed as Exercise) || customExercises.includes(trimmed)) { setErrorMsg(t('common.exists')); return }
    if (!newExercisePrimary) { setErrorMsg(t('exercise.primaryMuscle')); return }
    const updated = [...customExercises, trimmed]
    setCustomExercises(updated)
    localStorage.setItem('custom_exercises', JSON.stringify(updated))
    const groups: Record<string, { primary: string; secondary?: string }> = JSON.parse(localStorage.getItem('exercise_muscle_groups') || '{}')
    groups[trimmed] = { primary: newExercisePrimary, ...(newExerciseSecondary ? { secondary: newExerciseSecondary } : {}) }
    localStorage.setItem('exercise_muscle_groups', JSON.stringify(groups))
    setNewExerciseName(''); setNewExercisePrimary(''); setNewExerciseSecondary(''); setErrorMsg(null); setShowModal(false)
  }

  function handleDeleteExercise(ex: string) {
    const updated = customExercises.filter(e => e !== ex)
    setCustomExercises(updated)
    localStorage.setItem('custom_exercises', JSON.stringify(updated))
    if (exercise === ex) setExercise(DEFAULT_EXERCISES[0])
  }

  const getDisplayExercises = () => [...DEFAULT_EXERCISES, ...customExercises]

  // ─── Render ────────────────────────────────────────────────────────────────

  if (!user) return <LoggedOutView t={t} />

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[var(--border)] border-t-[var(--color-text-primary)] animate-spin" />
      </div>
    )
  }

  // ── Active session view ────────────────────────────────────────────────────
  if (activeSession) {
    const volDiff = Math.round((todayVolume - prevVolume) * 10) / 10
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">

        {/* Header */}
        <div className="px-6 pt-5 pb-3 flex items-start justify-between">
          <div>
            <p className="text-xs text-[var(--color-text-tertiary)] font-medium tracking-wide mb-0.5">
              {capitalizedDay} · {activeSession.routineName}
            </p>
            <h1 className="text-2xl font-light leading-snug">
              {t(greetingKey, { name: userName })}
            </h1>
          </div>
          <div className="w-10 h-10 rounded-full bg-[var(--surface-strong)] border border-[var(--border)] flex items-center justify-center text-xs font-semibold tracking-wider flex-shrink-0 mt-1">
            {userInitials}
          </div>
        </div>

        {/* Registrar sèrie button */}
        <div className="px-6 pb-4">
          <button
            onClick={openLogModal}
            disabled={!currentExercise || !nextIncompleteSet}
            className="w-full py-4 rounded-2xl font-medium flex items-center justify-between px-5 transition-opacity disabled:opacity-40 active:scale-[0.98]"
            style={{ backgroundColor: 'var(--accent-warn)', color: theme === 'dark' ? '#000' : '#fff' }}
          >
            <span className="text-xl font-light leading-none">+</span>
            <span className="text-base font-semibold tracking-wide">{t('home.logSet')}</span>
            <span className="text-xl font-light leading-none opacity-50">—</span>
          </button>
        </div>

        <div className="px-6 space-y-4 pb-24 max-w-2xl mx-auto animate-slide-up">

          {/* PR banner */}
          {prMsg && (
            <div className="px-4 py-3 rounded-2xl animate-bounce-in" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-warn) 14%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-warn) 45%, transparent)' }}>
              <p className="text-sm font-medium" style={{ color: 'var(--accent-warn)' }}>{prMsg}</p>
            </div>
          )}

          {/* AVUI stats */}
          <div>
            <p className="section-label mb-2">{t('home.today')}</p>
            <div className="grid grid-cols-2 gap-2">
              {/* Volume */}
              <div className="card-surface px-4 py-3">
                <p className="section-label text-[10px] mb-1">{t('home.totalVolume')}</p>
                <p className="text-xl font-light tabular-nums">
                  {format(todayVolume)} <span className="text-xs text-[var(--color-text-tertiary)]">{unit}</span>
                </p>
                {prevVolume > 0 && (
                  <p className="text-xs mt-0.5 tabular-nums" style={{ color: volDiff >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                    {volDiff >= 0 ? '+' : ''}{format(volDiff)} {t('home.vsLast')}
                  </p>
                )}
              </div>

              {/* Sèries */}
              <div className="card-surface px-4 py-3">
                <p className="section-label text-[10px] mb-1">{t('home.setsDone')}</p>
                <p className="text-xl font-light tabular-nums">
                  {completedSetsToday}<span className="text-[var(--color-text-tertiary)] text-sm">/{totalSetsTarget}</span>
                </p>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                  {routineExercises.filter(re => (routineSets[re.id] || []).every(s => s.completed) && (routineSets[re.id] || []).length > 0).length}/{routineExercises.length} {t('home.exercises')}
                </p>
              </div>

              {/* Temps */}
              <div className="card-surface px-4 py-3">
                <p className="section-label text-[10px] mb-1">{t('home.time')}</p>
                <p className="text-xl font-light tabular-nums">
                  {elapsedMins} <span className="text-xs text-[var(--color-text-tertiary)]">min</span>
                </p>
                {estimatedRemainingMins > 0 && (
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{t('home.estimatedMore', { mins: String(estimatedRemainingMins) })}</p>
                )}
              </div>

              {/* Ratxa */}
              <div className="card-surface px-4 py-3">
                <p className="section-label text-[10px] mb-1">{t('home.streak')}</p>
                <p className="text-xl font-light tabular-nums">
                  {streak} <span className="text-xs text-[var(--color-text-tertiary)]">{t('home.streakDays')}</span>
                </p>
                {bestStreak > 0 && (
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{t('home.bestStreak', { days: String(bestStreak) })}</p>
                )}
              </div>
            </div>
          </div>

          {/* DESCANS — inline rest timer */}
          {restRunning && (
            <div className="card-surface px-4 py-3 fade-in">
              <p className="section-label mb-2">{t('home.rest')}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <p className="text-3xl font-light tabular-nums">
                    {Math.floor(restRemaining / 60)}:{(restRemaining % 60).toString().padStart(2, '0')}
                  </p>
                  {nextExercise && (
                    <div>
                      <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-wide">{t('home.next')}</p>
                      <p className="text-sm text-[var(--color-text-secondary)] font-light">{tEx(nextExercise.exercise)}</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={skipRest}
                  className="px-4 py-2 rounded-xl bg-[var(--surface-strong)] text-[var(--color-text-secondary)] text-sm hover:text-[var(--color-text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                >
                  {t('home.skip')}
                </button>
              </div>
              <div className="mt-2 h-0.5 bg-[var(--surface-hover)] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-none" style={{ width: `${(restRemaining / restPreset) * 100}%`, backgroundColor: restRemaining <= 10 ? 'var(--accent-danger)' : 'var(--accent-success)' }} />
              </div>
            </div>
          )}

          {/* EN CURS */}
          {currentExercise && (
            <div className="card-surface p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-light text-[var(--color-text-primary)] truncate flex-1 mr-2">{tEx(currentExercise.exercise)}</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wide flex-shrink-0"
                      style={{ backgroundColor: 'color-mix(in srgb, var(--accent-success) 15%, transparent)', color: 'var(--accent-success)' }}>
                  {t('home.inProgress')}
                </span>
              </div>

              {/* Table header */}
              <div className="grid grid-cols-4 px-2 mb-1">
                {['#', t('home.weightCol'), t('home.repsCol'), t('common.rir')].map(h => (
                  <span key={h} className="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-wide">{h}</span>
                ))}
              </div>

              {/* Sets rows */}
              <div className="space-y-0.5">
                {currentSets.map((set, i) => {
                  const isCompleted = set.completed
                  const completedBefore = currentSets.slice(0, i).every(s => s.completed)
                  const isNext = !isCompleted && completedBefore
                  const prev = prevSessionSets[i]
                  const dispW = isCompleted ? set.weight : (prev?.weight || set.weight || 0)
                  const dispR = isCompleted ? set.reps : (prev?.reps || set.reps || currentExercise.reps_min)
                  const dispRir = isCompleted ? set.rir : (prev?.rir ?? null)

                  return (
                    <div key={set.id}
                      className={`grid grid-cols-4 px-2 py-1.5 rounded-xl items-center text-sm transition-colors ${isCompleted ? '' : isNext ? '' : 'opacity-35'}`}
                      style={isCompleted ? { backgroundColor: 'color-mix(in srgb, var(--accent-success) 10%, transparent)' } : undefined}
                    >
                      <span className="text-[var(--color-text-tertiary)] text-xs tabular-nums">{set.set_number}</span>
                      <span className="tabular-nums font-light">
                        {dispW > 0 ? `${format(unit === 'kg' ? dispW : fromKg(dispW))}${unit}` : '—'}
                      </span>
                      <span className="tabular-nums">{dispR || '—'}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="tabular-nums text-[var(--color-text-secondary)]">{dispRir ?? '—'}</span>
                        {isCompleted && <span className="text-xs leading-none" style={{ color: 'var(--accent-success)' }}>✓</span>}
                        {isNext && <span className="w-3.5 h-3.5 rounded-full border flex-shrink-0 inline-block" style={{ borderColor: 'var(--color-text-tertiary)' }} />}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* 1RM row */}
              {current1RM > 0 && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border)]">
                  <span className="text-xs text-[var(--color-text-tertiary)]">{t('home.estimated1RM')}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-light tabular-nums">{format(current1RM)} {unit}</span>
                    {oneRMDiff !== null && (
                      <span className="text-xs tabular-nums" style={{ color: oneRMDiff >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                        {oneRMDiff >= 0 ? '+' : ''}{format(Math.abs(oneRMDiff))} vs PR
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Completed state */}
          {!currentExercise && routineExercises.length > 0 && (
            <div className="card-surface p-6 text-center">
              <p className="text-2xl mb-2">🎉</p>
              <p className="font-light text-[var(--color-text-primary)]">{t('home.sessionDone')}</p>
              <p className="text-sm text-[var(--color-text-tertiary)] mt-1">{activeSession.routineName}</p>
            </div>
          )}

          {/* A CONTINUACIÓ */}
          {upcomingExercises.length > 0 && (
            <div className="card-surface p-4">
              <p className="section-label mb-3">{t('home.upcoming')}</p>
              <div className="space-y-3">
                {upcomingExercises.slice(0, 5).map(re => {
                  const baseName = re.exercise.split(' · ')[0].replace(/ - Pes corporal$/, '')
                  const muscleGroup = EXERCISE_INFO[baseName]?.muscleGroup || ''
                  const abbr = MUSCLE_ABBR[muscleGroup] || baseName.slice(0, 3).toUpperCase()
                  const lastS = lastSessions[re.exercise]
                  const recW = lastS?.sets[0]?.weight || 0
                  const prevRecW = recW > 0 ? recW : 0
                  return (
                    <div key={re.id} className="flex items-center gap-3">
                      <span className="text-[10px] font-black w-7 flex-shrink-0 text-center px-1 py-0.5 rounded-md"
                            style={{ backgroundColor: 'color-mix(in srgb, var(--accent-success) 10%, transparent)', color: 'var(--color-text-tertiary)' }}>
                        {abbr}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--color-text-secondary)] font-light truncate">{tEx(re.exercise)}</p>
                        <p className="text-xs text-[var(--color-text-tertiary)]">
                          {re.sets_target} {t('routines.seriesLabel')}
                          {prevRecW > 0 && <> · rec. {format(unit === 'kg' ? prevRecW : fromKg(prevRecW))}{unit}</>}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* EXERCICIS EXTRA (fora rutina) */}
          <div className="card-surface p-4">
            <button type="button" onClick={() => setShowExtraLog(v => !v)}
              className="w-full flex items-center justify-between text-left">
              <p className="section-label">{t('workouts.exercise')} extra</p>
              <span className={`text-[var(--color-text-tertiary)] text-lg font-light transition-transform duration-200 ${showExtraLog ? 'rotate-45' : ''}`}>+</span>
            </button>

            {showExtraLog && (
              <div className="mt-4 space-y-4 animate-slide-up">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hidden">
                  {getDisplayExercises().map(ex => (
                    <button key={ex} type="button" onClick={() => { setExtraExercise(ex as Exercise); setExtraVariant('') }}
                      className={`px-4 py-2 rounded-full text-sm whitespace-nowrap flex-shrink-0 transition-colors min-h-[40px] ${extraExercise === ex ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-primary)]' : 'bg-[var(--surface-strong)] text-[var(--color-text-primary)] hover:bg-[var(--surface-hover)]'}`}>
                      {tEx(ex)}
                    </button>
                  ))}
                </div>

                {EXERCISE_VARIANTS[extraExercise as string] && (
                  <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hidden">
                    {EXERCISE_VARIANTS[extraExercise as string].map(v => (
                      <button key={v} type="button" onClick={() => setExtraVariant(extraVariant === v ? '' : v)}
                        className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] tracking-wide transition-colors ${extraVariant === v ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-primary)]' : 'bg-[var(--surface)] text-[var(--color-text-tertiary)] border border-[var(--border)] hover:text-[var(--color-text-primary)]'}`}>
                        {VARIANT_KEYS[v] ? t(VARIANT_KEYS[v]) : v}
                      </button>
                    ))}
                  </div>
                )}

                <div>
                  <label className="section-label block mb-2">{t('workouts.weight')} ({unit})</label>
                  <input type="text" inputMode="none" readOnly value={extraWeight}
                    onClick={() => setActiveExtraInput('weight')} placeholder="0"
                    className={`w-full bg-[var(--surface-strong)] text-[var(--color-text-primary)] text-2xl font-light rounded-2xl px-4 py-3 border border-transparent focus:outline-none cursor-pointer ${activeExtraInput === 'weight' ? 'border-[var(--border)]' : ''}`}
                  />
                </div>

                <div>
                  <label className="section-label block mb-2">{t('workouts.reps')}</label>
                  <div className="flex items-center justify-between rounded-2xl px-3 py-2.5 bg-[var(--surface-strong)]">
                    <button type="button" onClick={() => { const n = parseInt(extraReps) || 0; if (n > 0) setExtraReps(String(n - 1)) }}
                      className="w-11 h-11 rounded-full flex items-center justify-center text-xl font-light bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--surface-hover)] active:scale-95 transition-all">−</button>
                    <div onClick={() => setActiveExtraInput('reps')} className="flex-1 mx-2 text-center text-4xl font-light tabular-nums cursor-pointer select-none">
                      {extraReps || <span className="text-[var(--color-text-tertiary)]">0</span>}
                    </div>
                    <button type="button" onClick={() => setExtraReps(String((parseInt(extraReps) || 0) + 1))}
                      className="w-11 h-11 rounded-full flex items-center justify-center text-xl bg-[var(--color-text-primary)] text-[var(--color-bg-primary)] hover:opacity-90 active:scale-95 transition-all">+</button>
                  </div>
                  <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-hidden">
                    {[5, 8, 10, 12, 15, 20].map(n => (
                      <button key={n} type="button" onClick={() => setExtraReps(String(n))}
                        className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors flex-shrink-0 ${extraReps === String(n) ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-primary)]' : 'bg-[var(--surface)] text-[var(--color-text-tertiary)] border border-[var(--border)] hover:bg-[var(--surface-hover)]'}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <button type="button" onClick={() => setExtraShowExtra(v => !v)}
                    className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors flex items-center gap-1">
                    <span className={`inline-block transition-transform duration-200 ${extraShowExtra ? 'rotate-45' : ''}`}>+</span>
                    {extraShowExtra ? t('workouts.lessOptions') : t('workouts.moreOptions')}
                  </button>
                </div>

                {extraShowExtra && (
                  <div className="space-y-4 animate-slide-up">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="section-label">{t('common.rir')}</label>
                        <span className="text-[var(--color-text-primary)] text-xl font-light tabular-nums w-5 text-right">{extraRir === '' ? '—' : extraRir}</span>
                      </div>
                      <input type="range" min="0" max="3" step="1" value={extraRir === '' ? 0 : extraRir} onChange={e => setExtraRir(e.target.value)}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer" style={{ accentColor: 'var(--color-text-primary)' }} />
                      <div className="flex justify-between mt-1">{[0,1,2,3].map(v => <span key={v} className="text-[10px] text-[var(--color-text-tertiary)]">{v}</span>)}</div>
                    </div>
                    <div>
                      <label className="section-label block mb-2">{t('workouts.notes')}</label>
                      <input type="text" value={extraNote} onChange={e => setExtraNote(e.target.value)} placeholder={t('workouts.notesPlaceholder')} maxLength={200}
                        className="w-full bg-[var(--surface-strong)] text-[var(--color-text-primary)] text-sm font-light rounded-2xl px-4 py-3 border border-transparent focus:outline-none focus:border-[var(--border)]" />
                    </div>
                  </div>
                )}

                <button type="button" onClick={handleExtraLogSave} disabled={extraLoading || !extraReps || parseInt(extraReps) <= 0}
                  className="w-full py-3 rounded-2xl font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: 'var(--color-text-primary)', color: 'var(--color-bg-primary)' }}>
                  {extraLoading ? '…' : t('common.save')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Log Set Modal */}
        {showLogModal && currentExercise && nextIncompleteSet && (
          <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 backdrop-blur-sm fade-in" onClick={() => { setShowLogModal(false); setActiveLogInput(null) }}>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-t-3xl px-6 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] w-full max-w-sm animate-scale-in" style={{ boxShadow: 'var(--shadow-soft)' }} onClick={e => e.stopPropagation()}>
              <p className="font-light text-lg mb-0.5">{tEx(currentExercise.exercise)}</p>
              <p className="text-xs text-[var(--color-text-tertiary)] mb-5">{t('home.setNumber', { n: String(nextIncompleteSet.set_number) })}</p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="section-label block mb-2">{t('workouts.weight')} ({unit})</label>
                  <input type="text" inputMode="none" readOnly value={logWeight}
                    onClick={() => setActiveLogInput('weight')} placeholder="0"
                    className={`w-full bg-[var(--surface-strong)] text-[var(--color-text-primary)] text-2xl font-light rounded-2xl px-4 py-3 border border-transparent focus:outline-none cursor-pointer ${activeLogInput === 'weight' ? 'border-[var(--border)]' : ''}`}
                  />
                </div>
                <div>
                  <label className="section-label block mb-2">{t('workouts.reps')}</label>
                  <div className="flex items-center justify-between rounded-2xl px-3 py-2.5 bg-[var(--surface-strong)]">
                    <button type="button" onClick={() => { const n = parseInt(logReps) || 0; if (n > 0) setLogReps(String(n - 1)) }}
                      className="w-11 h-11 rounded-full flex items-center justify-center text-xl font-light bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--surface-hover)] active:scale-95 transition-all">−</button>
                    <div onClick={() => setActiveLogInput('reps')} className="flex-1 mx-2 text-center text-4xl font-light tabular-nums cursor-pointer select-none">
                      {logReps || <span className="text-[var(--color-text-tertiary)]">0</span>}
                    </div>
                    <button type="button" onClick={() => setLogReps(String((parseInt(logReps) || 0) + 1))}
                      className="w-11 h-11 rounded-full flex items-center justify-center text-xl bg-[var(--color-text-primary)] text-[var(--color-bg-primary)] hover:opacity-90 active:scale-95 transition-all">+</button>
                  </div>
                  <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-hidden">
                    {[5, 8, 10, 12, 15, 20].map(n => (
                      <button key={n} type="button" onClick={() => setLogReps(String(n))}
                        className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors flex-shrink-0 ${logReps === String(n) ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-primary)]' : 'bg-[var(--surface)] text-[var(--color-text-tertiary)] border border-[var(--border)] hover:bg-[var(--surface-hover)]'}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <button type="button" onClick={() => setLogShowExtra(v => !v)}
                    className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors flex items-center gap-1">
                    <span className={`inline-block transition-transform duration-200 ${logShowExtra ? 'rotate-45' : ''}`}>+</span>
                    {logShowExtra ? t('workouts.lessOptions') : t('workouts.moreOptions')}
                  </button>
                </div>
                {logShowExtra && (
                  <div className="space-y-4 animate-slide-up">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="section-label">{t('common.rir')}</label>
                        <span className="text-[var(--color-text-primary)] text-xl font-light tabular-nums w-5 text-right">{logRir}</span>
                      </div>
                      <input type="range" min="0" max="3" step="1" value={logRir} onChange={e => setLogRir(e.target.value)}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer" style={{ accentColor: 'var(--color-text-primary)' }} />
                      <div className="flex justify-between mt-1">{[0,1,2,3].map(v => <span key={v} className="text-[10px] text-[var(--color-text-tertiary)]">{v}</span>)}</div>
                    </div>
                    <div>
                      <label className="section-label block mb-2">{t('workouts.notes')}</label>
                      <input type="text" value={logNote} onChange={e => setLogNote(e.target.value)} placeholder={t('workouts.notesPlaceholder')} maxLength={200}
                        className="w-full bg-[var(--surface-strong)] text-[var(--color-text-primary)] text-sm font-light rounded-2xl px-4 py-3 border border-transparent focus:outline-none focus:border-[var(--border)]" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => { setShowLogModal(false); setActiveLogInput(null) }}
                  className="flex-1 py-3 rounded-2xl bg-[var(--surface-strong)] text-[var(--color-text-secondary)] font-light hover:bg-[var(--surface-hover)] transition-colors">
                  {t('common.cancel')}
                </button>
                <button onClick={handleLogSet} disabled={logLoading}
                  className="flex-1 py-3 rounded-2xl font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: 'var(--color-text-primary)', color: 'var(--color-bg-primary)' }}>
                  {logLoading ? '…' : t('common.save')}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeLogInput === 'weight' && (
          <NumericKeyboard value={logWeight} onChange={setLogWeight} onClose={() => setActiveLogInput(null)} allowDecimal label={`${t('workouts.weight')} (${unit})`} maxLength={5} />
        )}
        {activeLogInput === 'reps' && (
          <NumericKeyboard value={logReps} onChange={setLogReps} onClose={() => setActiveLogInput(null)} allowDecimal={false} label={t('workouts.reps')} maxLength={3} />
        )}
        {activeExtraInput === 'weight' && (
          <NumericKeyboard value={extraWeight} onChange={setExtraWeight} onClose={() => setActiveExtraInput(null)} allowDecimal label={`${t('workouts.weight')} (${unit})`} maxLength={5} />
        )}
        {activeExtraInput === 'reps' && (
          <NumericKeyboard value={extraReps} onChange={setExtraReps} onClose={() => setActiveExtraInput(null)} allowDecimal={false} label={t('workouts.reps')} maxLength={3} />
        )}
      </div>
    )
  }

  // ── No-session quick-log form ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      <div className="px-6 pt-5 pb-2 flex items-center justify-between">
        <h1 className="page-title">Gymmoo.</h1>
        {displayedOneRM > 0 && (
          <div className="flex items-baseline gap-1 fade-in">
            <span className="text-2xl font-light tracking-tight tabular-nums">{format(displayedOneRM)}</span>
            <span className="text-[var(--color-text-tertiary)] text-sm">{unit}</span>
            <span className="text-[var(--color-text-tertiary)] text-xs ml-1">1RM</span>
            {EXERCISE_INFO[exercise as Exercise]?.addsBodyweightToRM && (
              <span className="text-[var(--color-text-tertiary)] text-[10px] ml-0.5">({t('workouts.bodyweightShort')})</span>
            )}
          </div>
        )}
      </div>

      <div className="px-6 space-y-4 max-w-2xl mx-auto animate-slide-up">
        {suggestion && (
          <div className="px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-2xl fade-in">
            <p className="text-[var(--color-text-secondary)] text-sm">{suggestion}</p>
          </div>
        )}
        {errorMsg && (
          <div className="px-4 py-3 rounded-2xl fade-in" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-danger) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-danger) 40%, transparent)' }}>
            <p className="text-sm" style={{ color: 'var(--accent-danger)' }}>{errorMsg}</p>
          </div>
        )}
        {prMsg && (
          <div className="px-4 py-3 rounded-2xl animate-bounce-in" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-warn) 14%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-warn) 45%, transparent)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--accent-warn)' }}>{prMsg}</p>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="section-label block mb-3">{t('workouts.exercise')}</label>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hidden">
              {getDisplayExercises().map((ex) => {
                const isActive = exercise === ex
                const isCustom = !DEFAULT_EXERCISES.includes(ex as Exercise)
                return (
                  <div key={ex} className="relative flex-shrink-0 group">
                    <button type="button" onClick={() => setExercise(ex)}
                      className={`px-4 py-2.5 rounded-full text-sm whitespace-nowrap transition-colors min-h-[44px] ${isCustom ? 'pr-8' : ''} ${isActive ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-primary)]' : 'bg-[var(--surface-strong)] text-[var(--color-text-primary)] hover:bg-[var(--surface-hover)]'}`}>
                      {tEx(ex)}
                    </button>
                    {isCustom && (
                      <button type="button" onClick={e => { e.stopPropagation(); handleDeleteExercise(ex) }}
                        className={`absolute top-1/2 -translate-y-1/2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] leading-none ${isActive ? 'text-[var(--color-bg-primary)]/70 hover:text-[var(--color-bg-primary)] hover:bg-black/10' : 'text-[var(--color-text-tertiary)] hover:text-[var(--accent-danger)] hover:bg-[var(--surface-hover)]'}`}
                        aria-label={`Delete ${ex}`}>✕</button>
                    )}
                  </div>
                )
              })}
              <button type="button" onClick={() => setShowModal(true)}
                className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-lg bg-[var(--surface-strong)] text-[var(--color-text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--color-text-primary)] transition-colors"
                aria-label={t('common.newExercise')}>+</button>
            </div>

            {EXERCISE_VARIANTS[exercise as string] && (
              <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hidden">
                {EXERCISE_VARIANTS[exercise as string].map(v => {
                  const unilateral = isVariantUnilateral(exercise as string, v)
                  return (
                    <button key={v} type="button" onClick={() => setVariant(variant === v ? '' : v)}
                      className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] tracking-wide transition-colors flex items-center gap-1 ${variant === v ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-primary)]' : 'bg-[var(--surface)] text-[var(--color-text-tertiary)] border border-[var(--border)] hover:text-[var(--color-text-primary)]'}`}>
                      {VARIANT_KEYS[v] ? t(VARIANT_KEYS[v]) : v}
                      {unilateral && <span className="opacity-50 text-[9px] leading-none">1B</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="section-label block mb-2">{t('workouts.weight')} ({unit})</label>
              <input type="text" inputMode="none" readOnly value={weight}
                onClick={() => { const isDisabled = EXERCISE_INFO[exercise as Exercise]?.hasBodyweight && EXERCISE_INFO[exercise as Exercise]?.hasWeight && weightType === 'corporal'; if (!isDisabled) setActiveInput('weight') }}
                placeholder={EXERCISE_INFO[exercise as Exercise]?.hasBodyweight && EXERCISE_INFO[exercise as Exercise]?.hasWeight ? (weightType === 'corporal' ? `0 (${t('workouts.bodyweight')})` : '0') : '0'}
                disabled={EXERCISE_INFO[exercise as Exercise]?.hasBodyweight && EXERCISE_INFO[exercise as Exercise]?.hasWeight && weightType === 'corporal'}
                className={`w-full bg-[var(--surface-strong)] text-[var(--color-text-primary)] text-2xl font-light rounded-2xl px-4 py-3 border border-transparent focus:outline-none disabled:opacity-50 cursor-pointer ${activeInput === 'weight' ? 'border-[var(--border)]' : ''}`}
              />
              {EXERCISE_INFO[exercise as Exercise]?.hasBodyweight && EXERCISE_INFO[exercise as Exercise]?.hasWeight && (
                <button type="button" onClick={() => setWeightType(weightType === 'corporal' ? 'pes' : 'corporal')}
                  className={`mt-2 px-4 py-2 rounded-full text-xs font-medium tracking-wide transition-colors min-h-[36px] ${weightType === 'corporal' ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-primary)]' : 'bg-[var(--surface-strong)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'}`}>
                  {weightType === 'corporal' ? `✓ ${t('workouts.bodyweight')}` : t('workouts.bodyweight')}
                </button>
              )}
              {EXERCISE_INFO[exercise as Exercise]?.hasBodyweight && !EXERCISE_INFO[exercise as Exercise]?.hasWeight && (
                <span className="mt-2 inline-block px-4 py-2 rounded-full text-xs font-medium tracking-wide bg-[var(--color-text-primary)] text-[var(--color-bg-primary)]">✓ {t('workouts.bodyweight')}</span>
              )}
            </div>

            <div>
              <label className="section-label block mb-3">{t('workouts.reps')}</label>
              <div className="flex items-center justify-between rounded-2xl px-3 py-2.5 bg-[var(--surface-strong)]">
                <button type="button" onClick={() => { const n = parseInt(reps) || 0; if (n > 0) setReps(String(n - 1)) }}
                  className="w-11 h-11 rounded-full flex items-center justify-center text-xl font-light bg-[var(--card)] border border-[var(--border)] text-[var(--color-text-primary)] hover:bg-[var(--surface-hover)] active:scale-95 transition-all disabled:opacity-30"
                  disabled={!reps || parseInt(reps) <= 0} aria-label={t('workouts.decreaseReps')}>−</button>
                <div onClick={() => setActiveInput('reps')} className="flex-1 mx-2 text-center text-4xl font-light text-[var(--color-text-primary)] tabular-nums cursor-pointer select-none">
                  {reps || <span className="text-[var(--color-text-tertiary)]">0</span>}
                </div>
                <button type="button" onClick={() => { const n = parseInt(reps) || 0; setReps(String(n + 1)) }}
                  className="w-11 h-11 rounded-full flex items-center justify-center text-xl font-light bg-[var(--color-text-primary)] text-[var(--color-bg-primary)] hover:opacity-90 active:scale-95 transition-all" aria-label={t('workouts.increaseReps')}>+</button>
              </div>
              <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-hidden">
                {[5, 8, 10, 12, 15, 20].map(n => (
                  <button key={n} type="button" onClick={() => setReps(String(n))}
                    className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors flex-shrink-0 ${reps === String(n) ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-primary)]' : 'bg-[var(--surface)] text-[var(--color-text-tertiary)] border border-[var(--border)] hover:bg-[var(--surface-hover)]'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <button type="button" onClick={() => setShowExtraOptions(v => !v)}
                className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors flex items-center gap-1">
                <span className={`inline-block transition-transform duration-200 ${showExtraOptions ? 'rotate-45' : ''}`}>+</span>
                {showExtraOptions ? t('workouts.lessOptions') : t('workouts.moreOptions')}
              </button>
            </div>

            {showExtraOptions && (
              <div className="space-y-4 animate-slide-up">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="section-label">{t('common.rir')}</label>
                    <span className="text-[var(--color-text-primary)] text-xl font-light tabular-nums w-5 text-right">{rir === '' ? '—' : rir}</span>
                  </div>
                  <input type="range" min="0" max="3" step="1" value={rir === '' ? 0 : rir} onChange={e => setRir(e.target.value)}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer" style={{ accentColor: 'var(--color-text-primary)' }} />
                  <div className="flex justify-between mt-1">{[0,1,2,3].map(v => <span key={v} className="text-[10px] text-[var(--color-text-tertiary)]">{v}</span>)}</div>
                </div>
                <div>
                  <label className="section-label block mb-2">{t('workouts.notes')}</label>
                  <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder={t('workouts.notesPlaceholder')} maxLength={200}
                    className="w-full bg-[var(--surface-strong)] text-[var(--color-text-primary)] text-sm font-light rounded-2xl px-4 py-3 border border-transparent focus:outline-none focus:border-[var(--border)]" />
                </div>
              </div>
            )}
          </div>

          <button type="submit" disabled={formLoading} className="w-full py-4 rounded-2xl font-medium bg-[var(--color-text-primary)] text-[var(--color-bg-primary)] hover:opacity-90 disabled:opacity-50 transition-opacity">
            {formLoading ? t('common.saving') : t('common.save')}
          </button>
        </form>

        <div className="pt-4">
          <p className="section-label mb-3">{t('home.recent')}</p>
          {savedSets.length === 0 ? (
            <p className="text-[var(--color-text-tertiary)] text-sm py-2">{t('home.noHistory')}</p>
          ) : (
            <div className="space-y-1">
              {savedSets.map((set) => {
                const isPr = set.one_rm > 0 && bestPerExercise[set.exercise] === set.one_rm
                return (
                  <div key={set.id} className="flex justify-between items-start py-3 border-b border-[var(--border)]">
                    <div className="flex-1 min-w-0">
                      <p className="text-[var(--color-text-primary)] font-light flex items-center gap-1.5 truncate">
                        {isPr && <span title={t('home.personalRecord')}>🏆</span>}
                        <span className="truncate">{tEx(set.exercise)}</span>
                      </p>
                      <p className="text-[var(--color-text-tertiary)] text-xs mt-0.5">{new Date(set.created_at).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}</p>
                      {set.note && <p className="text-[var(--color-text-tertiary)] text-xs italic mt-1 truncate">"{set.note}"</p>}
                    </div>
                    <div className="text-right ml-3 flex-shrink-0">
                      <p className="text-[var(--color-text-primary)] font-light tabular-nums">{format(set.weight)}{unit} × {set.reps}</p>
                      {set.rir != null && <p className="text-[var(--color-text-tertiary)] text-xs">RIR {set.rir}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {activeInput === 'weight' && (
        <NumericKeyboard value={weight} onChange={setWeight} onClose={() => setActiveInput(null)} allowDecimal label={`${t('workouts.weight')} (${unit})`} maxLength={5} />
      )}
      {activeInput === 'reps' && (
        <NumericKeyboard value={reps} onChange={setReps} onClose={() => setActiveInput(null)} allowDecimal={false} label={t('workouts.reps')} maxLength={3} />
      )}

      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/60 backdrop-blur-sm fade-in" onClick={() => { setShowModal(false); setNewExerciseName(''); setNewExercisePrimary(''); setNewExerciseSecondary(''); setErrorMsg(null) }}>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-t-3xl sm:rounded-3xl px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] w-full max-w-sm animate-scale-in" style={{ boxShadow: 'var(--shadow-soft)' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-light text-[var(--color-text-primary)] mb-4">{t('common.newExercise')}</h3>
            <input type="text" value={newExerciseName} onChange={e => setNewExerciseName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddExercise()} placeholder={t('common.exerciseName')}
              className="w-full bg-[var(--surface-strong)] text-[var(--color-text-primary)] rounded-2xl px-4 py-3 mb-3 border border-transparent focus:outline-none focus:border-[var(--border)]" autoFocus />
            <div className="space-y-2 mb-3">
              {(() => {
                const muscleOptions = [
                  { value: 'Pectoral', key: 'exercise.muscleGroupPectoral' }, { value: 'Esquena', key: 'exercise.muscleGroupEsquena' },
                  { value: 'Cames', key: 'exercise.muscleGroupCames' }, { value: 'Esquitxos', key: 'exercise.muscleGroupEsquitxos' },
                  { value: 'Braços', key: 'exercise.muscleGroupBracos' }, { value: 'Abdominals', key: 'exercise.muscleGroupAbdominals' },
                  { value: 'Gluts', key: 'exercise.muscleGroupGluts' }, { value: 'Full Body', key: 'exercise.muscleGroupFullBody' },
                ]
                return (
                  <>
                    <div>
                      <label className="section-label block mb-1.5">{t('exercise.primaryMuscle')}</label>
                      <select value={newExercisePrimary} onChange={e => setNewExercisePrimary(e.target.value)}
                        className="w-full bg-[var(--surface-strong)] text-[var(--color-text-primary)] rounded-xl px-4 py-2.5 text-sm border border-transparent focus:outline-none focus:border-[var(--border)]">
                        <option value="">—</option>
                        {muscleOptions.map(o => <option key={o.value} value={o.value}>{t(o.key)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="section-label block mb-1.5">{t('exercise.secondaryMuscle')}</label>
                      <select value={newExerciseSecondary} onChange={e => setNewExerciseSecondary(e.target.value)}
                        className="w-full bg-[var(--surface-strong)] text-[var(--color-text-primary)] rounded-xl px-4 py-2.5 text-sm border border-transparent focus:outline-none focus:border-[var(--border)]">
                        <option value="">{t('exercise.noSecondary')}</option>
                        {muscleOptions.map(o => <option key={o.value} value={o.value}>{t(o.key)}</option>)}
                      </select>
                    </div>
                  </>
                )
              })()}
            </div>
            {errorMsg && <p className="text-sm mb-3" style={{ color: 'var(--accent-danger)' }}>{errorMsg}</p>}
            <div className="flex gap-3">
              <button onClick={() => { setShowModal(false); setNewExerciseName(''); setNewExercisePrimary(''); setNewExerciseSecondary(''); setErrorMsg(null) }}
                className="flex-1 py-3 rounded-2xl bg-[var(--surface-strong)] text-[var(--color-text-secondary)] font-light hover:bg-[var(--surface-hover)] transition-colors">{t('common.cancel')}</button>
              <button onClick={handleAddExercise}
                className="flex-1 py-3 rounded-2xl bg-[var(--color-text-primary)] text-[var(--color-bg-primary)] font-medium hover:opacity-90 transition-opacity">{t('common.add')}</button>
            </div>
          </div>
        </div>
      )}

      <div className="h-20" />
    </div>
  )
}
