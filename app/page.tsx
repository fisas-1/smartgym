'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './contexts/AuthContext'
import { Exercise, DEFAULT_EXERCISES, WorkoutLog, EXERCISE_INFO, EXERCISE_KEYS, EXERCISE_VARIANTS, VARIANT_KEYS, isVariantUnilateral, RoutineExercise, RoutineSet, calculate1RM } from '@/types'
import { useTranslation } from './contexts/LanguageContext'
import { useTheme } from './contexts/ThemeContext'
import { useUnit } from './contexts/UnitContext'
import NumericKeyboard from './components/NumericKeyboard'
import Logo from './components/Logo'

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
    <div className="min-h-screen flex flex-col px-5 py-16" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto gap-8 dop-slide-up">
        <div className="text-center space-y-2">
          <Logo size="lg" />
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.12em' }}>
            el teu gimnàs
          </p>
        </div>

        <div className="rounded-[14px] overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--rule)', boxShadow: 'var(--shadow)' }}>
          {[
            { icon: '📈', label: t('home.featureProgress') },
            { icon: '📋', label: t('home.featureRoutines') },
            { icon: '🏆', label: t('home.featureFriends') },
          ].map(({ icon, label }, i) => (
            <div key={icon} className="flex items-center gap-3 px-4 py-3.5" style={{ borderTop: i > 0 ? '1px solid var(--rule-soft)' : 'none' }}>
              <span className="text-lg w-7 text-center flex-shrink-0">{icon}</span>
              <span className="text-sm" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-sans)' }}>{label}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <a href="/login"
            className="w-full py-4 px-6 rounded-[999px] font-medium text-center text-sm transition-opacity hover:opacity-90"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            {t('common.register')}
          </a>
          <a href="/login"
            className="w-full py-4 px-6 rounded-[999px] font-medium text-center text-sm transition-colors hover:opacity-80"
            style={{ border: '1px solid var(--rule)', color: 'var(--text-2)', background: 'transparent' }}>
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
  const [rir, setRir] = useState<string>('2')
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
  const [notesOpen, setNotesOpen] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
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
      const rawName: string = (user?.user_metadata?.username as string) || user?.email?.split('@')[0] || 'Usuari'
      const firstName = rawName.split(/[\s._]/)[0]
      const cap = firstName.charAt(0).toUpperCase() + firstName.slice(1)
      setUserName(cap)
      setUserInitials(rawName.slice(0, 2).toUpperCase())

      const routineDays: Record<string, number[]> = JSON.parse(localStorage.getItem('routine_days') || '{}')
      const today = new Date().getDay()
      const todayRoutineId = Object.entries(routineDays).find(([, days]) => days.includes(today))?.[0]

      if (!todayRoutineId) { setSessionLoading(false); return }

      const { data: routine } = await supabase.from('routines').select('*').eq('id', todayRoutineId).eq('user_id', user!.id).single()
      if (!routine) { setSessionLoading(false); return }

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

  // ─── Rest timer ────────────────────────────────────────────────────────────
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
      setWeight(''); setReps(''); setRir('2'); setNote(''); setActiveInput(null); setNotesOpen(false)
      if (navigator.vibrate) navigator.vibrate(isPr ? [60, 40, 60, 40, 120] : 40)
      if (isPr) {
        setJustSaved(true)
        setPrMsg(t('home.newPr', { exercise: tEx(exerciseToStore), value: format(effectiveOneRM), unit }))
        setTimeout(() => { setPrMsg(null); setJustSaved(false) }, 6000)
      } else {
        setJustSaved(true)
        setTimeout(() => setJustSaved(false), 1600)
      }
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="w-6 h-6 rounded-full border-2 animate-spin"
          style={{ borderColor: 'var(--rule)', borderTopColor: 'var(--accent)' }} />
      </div>
    )
  }

  // ── Active session view ────────────────────────────────────────────────────
  if (activeSession) {
    const volDiff = Math.round((todayVolume - prevVolume) * 10) / 10
    const volPct = prevVolume > 0 ? Math.round(((todayVolume - prevVolume) / prevVolume) * 100) : 0

    return (
      <div className="min-h-screen pb-28" style={{ background: 'var(--bg)', color: 'var(--text)' }}>

        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between">
          <div className="dop-slide-up">
            <Logo />
            <p className="mt-1" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.06em' }}>
              {capitalizedDay} · {activeSession.routineName}
            </p>
          </div>
          {/* Streak chip */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl dop-slide-up"
            style={{ background: 'var(--card-hi)', border: '1px solid var(--rule)' }}>
            <span className="dop-flame text-sm">🔥</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text)', fontWeight: 500 }}>{streak}</span>
          </div>
        </div>

        {/* Today recap strip */}
        <div className="mx-5 mb-4 rounded-[14px] overflow-hidden"
          style={{ background: 'var(--card)', border: '1px solid var(--rule)', boxShadow: 'var(--shadow)' }}>
          <div className="grid grid-cols-3">
            {[
              { label: 'sèries', value: `${completedSetsToday}`, sub: `/${totalSetsTarget}`, accent: false },
              { label: 'volum', value: todayVolume > 0 ? `${(todayVolume / 1000).toFixed(2)}t` : '—', sub: prevVolume > 0 ? `${volPct >= 0 ? '+' : ''}${volPct}%` : '', accent: volPct > 0 },
              { label: 'sessió', value: `${elapsedMins}`, sub: 'min', accent: false },
            ].map((s, i) => (
              <div key={i} className="py-3 text-center" style={{ borderLeft: i > 0 ? '1px solid var(--rule-soft)' : 'none' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 500, color: 'var(--text)', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: s.accent ? 'var(--good)' : 'var(--text-3)' }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* PR banner */}
        {prMsg && (
          <div className="mx-5 mb-3 px-4 py-3 rounded-[14px] animate-bounce-in"
            style={{ background: 'var(--accent-tint)', border: '1px solid var(--accent-soft)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--accent)' }}>{prMsg}</p>
          </div>
        )}

        {/* Log Set CTA */}
        <div className="px-5 mb-4">
          <button
            onClick={openLogModal}
            disabled={!currentExercise || !nextIncompleteSet}
            className="w-full py-4 rounded-2xl font-medium flex items-center justify-between px-5 transition-all disabled:opacity-40 active:scale-[0.98] dop-breathe"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            <span className="text-xl font-light leading-none">+</span>
            <span className="text-base font-semibold tracking-wide">{t('home.logSet')}</span>
            <span className="text-xl font-light leading-none opacity-50">—</span>
          </button>
        </div>

        <div className="px-5 space-y-3 max-w-2xl mx-auto">

          {/* Rest timer */}
          {restRunning && (
            <div className="rounded-[14px] px-4 py-3 fade-in" style={{ background: 'var(--card)', border: '1px solid var(--rule)', boxShadow: 'var(--shadow)' }}>
              <p className="section-label mb-2">{t('home.rest')}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <p className="text-3xl font-light tabular-nums" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>
                    {Math.floor(restRemaining / 60)}:{(restRemaining % 60).toString().padStart(2, '0')}
                  </p>
                  {nextExercise && (
                    <div>
                      <p className="section-label">{t('home.next')}</p>
                      <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>{tEx(nextExercise.exercise)}</p>
                    </div>
                  )}
                </div>
                <button onClick={skipRest}
                  className="px-4 py-2 rounded-xl text-sm transition-colors"
                  style={{ background: 'var(--card-hi)', border: '1px solid var(--rule)', color: 'var(--text-2)' }}>
                  {t('home.skip')}
                </button>
              </div>
              <div className="mt-2 h-0.5 rounded-full overflow-hidden" style={{ background: 'var(--rule)' }}>
                <div className="h-full rounded-full transition-none"
                  style={{ width: `${(restRemaining / restPreset) * 100}%`, background: restRemaining <= 10 ? 'var(--danger)' : 'var(--accent)' }} />
              </div>
            </div>
          )}

          {/* Current exercise */}
          {currentExercise && (
            <div className="rounded-[14px] p-4" style={{ background: 'var(--card)', border: '1px solid var(--rule)', boxShadow: 'var(--shadow)' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="font-medium truncate flex-1 mr-2" style={{ color: 'var(--text)' }}>{tEx(currentExercise.exercise)}</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wide flex-shrink-0"
                  style={{ background: 'var(--accent-tint)', color: 'var(--accent)' }}>
                  {t('home.inProgress')}
                </span>
              </div>

              <div className="grid grid-cols-4 px-2 mb-1">
                {['#', t('home.weightCol'), t('home.repsCol'), t('common.rir')].map(h => (
                  <span key={h} className="section-label">{h}</span>
                ))}
              </div>

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
                      className={`grid grid-cols-4 px-2 py-1.5 rounded-xl items-center text-sm transition-colors ${!isCompleted && !isNext ? 'opacity-35' : ''}`}
                      style={isCompleted ? { background: 'var(--accent-tint)' } : undefined}
                    >
                      <span className="text-xs tabular-nums" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{set.set_number}</span>
                      <span className="tabular-nums" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>
                        {dispW > 0 ? `${format(unit === 'kg' ? dispW : fromKg(dispW))}${unit}` : '—'}
                      </span>
                      <span className="tabular-nums" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{dispR || '—'}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="tabular-nums" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-2)' }}>{dispRir ?? '—'}</span>
                        {isCompleted && <span className="text-xs leading-none" style={{ color: 'var(--good)' }}>✓</span>}
                        {isNext && <span className="w-3.5 h-3.5 rounded-full border flex-shrink-0 inline-block" style={{ borderColor: 'var(--text-3)' }} />}
                      </div>
                    </div>
                  )
                })}
              </div>

              {current1RM > 0 && (
                <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid var(--rule)' }}>
                  <span className="text-xs" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{t('home.estimated1RM')}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm tabular-nums" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{format(current1RM)} {unit}</span>
                    {oneRMDiff !== null && (
                      <span className="text-xs tabular-nums" style={{ fontFamily: 'var(--font-mono)', color: oneRMDiff >= 0 ? 'var(--good)' : 'var(--danger)' }}>
                        {oneRMDiff >= 0 ? '+' : ''}{format(Math.abs(oneRMDiff))} vs PR
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Session done */}
          {!currentExercise && routineExercises.length > 0 && (
            <div className="rounded-[14px] p-6 text-center" style={{ background: 'var(--card)', border: '1px solid var(--rule)' }}>
              <p className="text-2xl mb-2">🎉</p>
              <p className="font-medium" style={{ color: 'var(--text)' }}>{t('home.sessionDone')}</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{activeSession.routineName}</p>
            </div>
          )}

          {/* Upcoming */}
          {upcomingExercises.length > 0 && (
            <div className="rounded-[14px] p-4" style={{ background: 'var(--card)', border: '1px solid var(--rule)' }}>
              <p className="section-label mb-3">{t('home.upcoming')}</p>
              <div className="space-y-3">
                {upcomingExercises.slice(0, 5).map(re => {
                  const baseName = re.exercise.split(' · ')[0].replace(/ - Pes corporal$/, '')
                  const muscleGroup = EXERCISE_INFO[baseName]?.muscleGroup || ''
                  const abbr = MUSCLE_ABBR[muscleGroup] || baseName.slice(0, 3).toUpperCase()
                  const lastS = lastSessions[re.exercise]
                  const recW = lastS?.sets[0]?.weight || 0
                  return (
                    <div key={re.id} className="flex items-center gap-3">
                      <span className="text-[10px] font-bold w-7 flex-shrink-0 text-center px-1 py-0.5 rounded-md"
                        style={{ background: 'var(--accent-tint)', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                        {abbr}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate" style={{ color: 'var(--text-2)' }}>{tEx(re.exercise)}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                          {re.sets_target} {t('routines.seriesLabel')}
                          {recW > 0 && <> · rec. {format(unit === 'kg' ? recW : fromKg(recW))}{unit}</>}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Extra exercise */}
          <div className="rounded-[14px] p-4" style={{ background: 'var(--card)', border: '1px solid var(--rule)' }}>
            <button type="button" onClick={() => setShowExtraLog(v => !v)} className="w-full flex items-center justify-between text-left">
              <p className="section-label">{t('workouts.exercise')} extra</p>
              <span className={`transition-transform duration-200 ${showExtraLog ? 'rotate-45' : ''}`}
                style={{ color: 'var(--text-3)', fontSize: 18, fontWeight: 300 }}>+</span>
            </button>

            {showExtraLog && (
              <div className="mt-4 space-y-4 animate-slide-up">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hidden">
                  {getDisplayExercises().map(ex => (
                    <button key={ex} type="button" onClick={() => { setExtraExercise(ex as Exercise); setExtraVariant('') }}
                      className="px-4 py-2 rounded-full text-sm whitespace-nowrap flex-shrink-0 transition-all min-h-[40px]"
                      style={{
                        background: extraExercise === ex ? 'var(--text)' : 'transparent',
                        color: extraExercise === ex ? 'var(--bg)' : 'var(--text-2)',
                        border: `1px solid ${extraExercise === ex ? 'var(--text)' : 'var(--rule)'}`,
                      }}>
                      {tEx(ex)}
                    </button>
                  ))}
                </div>

                {EXERCISE_VARIANTS[extraExercise as string] && (
                  <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hidden">
                    {EXERCISE_VARIANTS[extraExercise as string].map(v => (
                      <button key={v} type="button" onClick={() => setExtraVariant(extraVariant === v ? '' : v)}
                        className="flex-shrink-0 px-3 py-1 rounded-full text-[11px] transition-all"
                        style={{
                          background: extraVariant === v ? 'var(--text)' : 'transparent',
                          color: extraVariant === v ? 'var(--bg)' : 'var(--text-3)',
                          border: `1px solid ${extraVariant === v ? 'var(--text)' : 'var(--rule)'}`,
                        }}>
                        {VARIANT_KEYS[v] ? t(VARIANT_KEYS[v]) : v}
                      </button>
                    ))}
                  </div>
                )}

                <div>
                  <label className="section-label block mb-2">{t('workouts.weight')} ({unit})</label>
                  <input type="text" inputMode="none" readOnly value={extraWeight}
                    onClick={() => setActiveExtraInput('weight')} placeholder="0"
                    className="w-full text-2xl font-light rounded-[14px] px-4 py-3 border cursor-pointer outline-none"
                    style={{
                      background: 'var(--card-hi)', color: 'var(--text)', fontFamily: 'var(--font-mono)',
                      borderColor: activeExtraInput === 'weight' ? 'var(--accent)' : 'var(--rule)',
                    }}
                  />
                </div>

                <div>
                  <label className="section-label block mb-2">{t('workouts.reps')}</label>
                  <div className="flex items-center justify-between rounded-[14px] px-3 py-2.5" style={{ background: 'var(--card-hi)' }}>
                    <button type="button" onClick={() => { const n = parseInt(extraReps) || 0; if (n > 0) setExtraReps(String(n - 1)) }}
                      className="w-11 h-11 rounded-[14px] flex items-center justify-center text-xl transition-all active:scale-95"
                      style={{ background: 'var(--card)', border: '1px solid var(--rule)', color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>−</button>
                    <div onClick={() => setActiveExtraInput('reps')} className="flex-1 mx-2 text-center text-4xl cursor-pointer select-none"
                      style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                      {extraReps || <span style={{ color: 'var(--text-3)' }}>0</span>}
                    </div>
                    <button type="button" onClick={() => setExtraReps(String((parseInt(extraReps) || 0) + 1))}
                      className="w-11 h-11 rounded-[14px] flex items-center justify-center text-xl transition-all active:scale-95"
                      style={{ background: 'var(--accent)', color: '#fff', fontFamily: 'var(--font-mono)' }}>+</button>
                  </div>
                  <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-hidden">
                    {[5, 8, 10, 12, 15, 20].map(n => (
                      <button key={n} type="button" onClick={() => setExtraReps(String(n))}
                        className="px-3 py-1.5 rounded-full text-sm whitespace-nowrap flex-shrink-0 transition-all"
                        style={{
                          background: extraReps === String(n) ? 'var(--accent)' : 'transparent',
                          color: extraReps === String(n) ? '#fff' : 'var(--text-2)',
                          border: `1px solid ${extraReps === String(n) ? 'var(--accent)' : 'var(--rule)'}`,
                          fontFamily: 'var(--font-mono)',
                        }}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <button type="button" onClick={() => setExtraShowExtra(v => !v)}
                    className="text-xs flex items-center gap-1 transition-colors"
                    style={{ color: 'var(--text-3)' }}>
                    <span className={`inline-block transition-transform duration-200 ${extraShowExtra ? 'rotate-45' : ''}`}>+</span>
                    {extraShowExtra ? t('workouts.lessOptions') : t('workouts.moreOptions')}
                  </button>
                </div>

                {extraShowExtra && (
                  <div className="space-y-4 animate-slide-up">
                    <div>
                      <label className="section-label block mb-2">{t('workouts.notes')}</label>
                      <input type="text" value={extraNote} onChange={e => setExtraNote(e.target.value)} placeholder={t('workouts.notesPlaceholder')} maxLength={200}
                        className="w-full text-sm rounded-[14px] px-4 py-3 outline-none"
                        style={{ background: 'var(--card-hi)', color: 'var(--text)', border: '1px solid var(--rule)' }} />
                    </div>
                  </div>
                )}

                <button type="button" onClick={handleExtraLogSave} disabled={extraLoading || !extraReps || parseInt(extraReps) <= 0}
                  className="w-full py-3 rounded-2xl font-medium disabled:opacity-40 transition-opacity hover:opacity-90"
                  style={{ background: 'var(--accent)', color: '#fff' }}>
                  {extraLoading ? '…' : t('common.save')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Log Set Modal */}
        {showLogModal && currentExercise && nextIncompleteSet && (
          <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 backdrop-blur-sm fade-in"
            onClick={() => { setShowLogModal(false); setActiveLogInput(null) }}>
            <div className="rounded-t-3xl px-6 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] w-full max-w-sm animate-scale-in"
              style={{ background: 'var(--card)', border: '1px solid var(--rule)', boxShadow: 'var(--shadow)' }}
              onClick={e => e.stopPropagation()}>
              <p className="font-medium text-lg mb-0.5" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>{tEx(currentExercise.exercise)}</p>
              <p className="text-xs mb-5" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{t('home.setNumber', { n: String(nextIncompleteSet.set_number) })}</p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="section-label block mb-2">{t('workouts.weight')} ({unit})</label>
                  <input type="text" inputMode="none" readOnly value={logWeight}
                    onClick={() => setActiveLogInput('weight')} placeholder="0"
                    className="w-full text-2xl font-light rounded-[14px] px-4 py-3 border cursor-pointer outline-none"
                    style={{
                      background: 'var(--card-hi)', color: 'var(--text)', fontFamily: 'var(--font-mono)',
                      borderColor: activeLogInput === 'weight' ? 'var(--accent)' : 'var(--rule)',
                    }}
                  />
                </div>
                <div>
                  <label className="section-label block mb-2">{t('workouts.reps')}</label>
                  <div className="flex items-center justify-between rounded-[14px] px-3 py-2.5" style={{ background: 'var(--card-hi)' }}>
                    <button type="button" onClick={() => { const n = parseInt(logReps) || 0; if (n > 0) setLogReps(String(n - 1)) }}
                      className="w-11 h-11 rounded-[14px] flex items-center justify-center text-xl transition-all active:scale-95"
                      style={{ background: 'var(--card)', border: '1px solid var(--rule)', color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>−</button>
                    <div onClick={() => setActiveLogInput('reps')} className="flex-1 mx-2 text-center text-4xl cursor-pointer select-none"
                      style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                      {logReps || <span style={{ color: 'var(--text-3)' }}>0</span>}
                    </div>
                    <button type="button" onClick={() => setLogReps(String((parseInt(logReps) || 0) + 1))}
                      className="w-11 h-11 rounded-[14px] flex items-center justify-center text-xl transition-all active:scale-95"
                      style={{ background: 'var(--accent)', color: '#fff', fontFamily: 'var(--font-mono)' }}>+</button>
                  </div>
                  <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-hidden">
                    {[5, 8, 10, 12, 15, 20].map(n => (
                      <button key={n} type="button" onClick={() => setLogReps(String(n))}
                        className="px-3 py-1.5 rounded-full text-sm whitespace-nowrap flex-shrink-0 transition-all"
                        style={{
                          background: logReps === String(n) ? 'var(--accent)' : 'transparent',
                          color: logReps === String(n) ? '#fff' : 'var(--text-2)',
                          border: `1px solid ${logReps === String(n) ? 'var(--accent)' : 'var(--rule)'}`,
                          fontFamily: 'var(--font-mono)',
                        }}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <button type="button" onClick={() => setLogShowExtra(v => !v)}
                    className="text-xs flex items-center gap-1 transition-colors"
                    style={{ color: 'var(--text-3)' }}>
                    <span className={`inline-block transition-transform duration-200 ${logShowExtra ? 'rotate-45' : ''}`}>+</span>
                    {logShowExtra ? t('workouts.lessOptions') : t('workouts.moreOptions')}
                  </button>
                </div>
                {logShowExtra && (
                  <div className="space-y-4 animate-slide-up">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="section-label">{t('common.rir')}</label>
                        <span className="text-xl tabular-nums w-5 text-right" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{logRir}</span>
                      </div>
                      <input type="range" min="0" max="3" step="1" value={logRir} onChange={e => setLogRir(e.target.value)}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer" style={{ accentColor: 'var(--accent)' }} />
                      <div className="flex justify-between mt-1">{[0,1,2,3].map(v => <span key={v} className="section-label">{v}</span>)}</div>
                    </div>
                    <div>
                      <label className="section-label block mb-2">{t('workouts.notes')}</label>
                      <input type="text" value={logNote} onChange={e => setLogNote(e.target.value)} placeholder={t('workouts.notesPlaceholder')} maxLength={200}
                        className="w-full text-sm rounded-[14px] px-4 py-3 outline-none"
                        style={{ background: 'var(--card-hi)', color: 'var(--text)', border: '1px solid var(--rule)' }} />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => { setShowLogModal(false); setActiveLogInput(null) }}
                  className="flex-1 py-3 rounded-2xl transition-colors"
                  style={{ background: 'var(--card-hi)', color: 'var(--text-2)', border: '1px solid var(--rule)' }}>
                  {t('common.cancel')}
                </button>
                <button onClick={handleLogSet} disabled={logLoading}
                  className="flex-1 py-3 rounded-2xl font-medium disabled:opacity-50 transition-opacity hover:opacity-90"
                  style={{ background: 'var(--accent)', color: '#fff' }}>
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

  const wNum = parseFloat(weight)
  const rNum = parseInt(reps)
  const exInfo = EXERCISE_INFO[exercise as Exercise]
  const repsMin = exInfo?.repsMin ?? 8
  const repsMax = exInfo?.repsMax ?? 12
  const inRange = !isNaN(rNum) && rNum >= repsMin && rNum <= repsMax
  const isPRweight = !isNaN(wNum) && wNum > 0 && (bestPerExercise[exercise] || 0) > 0 && calc1RM(toKg(wNum), rNum || 1) > (bestPerExercise[exercise] || 0)
  const repPills = [5, 8, 10, 12, 15, 20]
  const rirLabels: Record<string, string> = { '0': 'fallo', '1': 'molt', '2': 'dur', '3': 'còmode', '4': 'fàcil' }
  const ctaEnabled = !isNaN(rNum) && rNum > 0

  return (
    <div className="min-h-screen pb-28" style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between">
        <div className="dop-slide-up">
          <Logo />
          <p className="mt-1" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.06em' }}>
            Bon dia, {userName || 'usuari'} — entrenem?
          </p>
        </div>
        {/* Streak chip */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl dop-slide-up"
          style={{ background: 'var(--card-hi)', border: '1px solid var(--rule)' }}>
          <span className="dop-flame text-sm">🔥</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text)', fontWeight: 500 }}>{streak}</span>
        </div>
      </div>

      {/* Today recap strip */}
      <div className="mx-5 mb-4 rounded-[14px] overflow-hidden"
        style={{ background: 'var(--card)', border: '1px solid var(--rule)', boxShadow: 'var(--shadow)' }}>
        <div className="grid grid-cols-3">
          {[
            { label: 'sèries', value: savedSets.length > 0 ? String(savedSets.length) : '—', sub: 'avui', accent: false },
            { label: 'volum', value: todayVolume > 0 ? `${(todayVolume / 1000).toFixed(2)}t` : '—', sub: prevVolume > 0 && todayVolume > 0 ? `+${Math.round(((todayVolume - prevVolume) / prevVolume) * 100)}%` : '', accent: todayVolume > prevVolume },
            { label: '1RM', value: displayedOneRM > 0 ? `${format(displayedOneRM)}` : '—', sub: displayedOneRM > 0 ? unit : '', accent: false },
          ].map((s, i) => (
            <div key={i} className="py-3 text-center" style={{ borderLeft: i > 0 ? '1px solid var(--rule-soft)' : 'none' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 500, color: 'var(--text)', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: s.accent ? 'var(--good)' : 'var(--text-3)' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Suggestion / error banners */}
      {suggestion && (
        <div className="mx-5 mb-3 px-4 py-3 rounded-[14px] fade-in"
          style={{ background: 'var(--card-hi)', border: '1px solid var(--rule)' }}>
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>{suggestion}</p>
        </div>
      )}
      {errorMsg && (
        <div className="mx-5 mb-3 px-4 py-3 rounded-[14px] fade-in"
          style={{ background: 'var(--accent-tint)', border: '1px solid var(--accent-soft)' }}>
          <p className="text-sm" style={{ color: 'var(--danger)' }}>{errorMsg}</p>
        </div>
      )}
      {prMsg && (
        <div className="mx-5 mb-3 px-4 py-3 rounded-[14px] animate-bounce-in"
          style={{ background: 'var(--accent-tint)', border: '1px solid var(--accent-soft)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--accent)' }}>{prMsg}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="px-5 space-y-4 max-w-2xl mx-auto">

        {/* Exercise pills */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 500 }}>
              exercici
            </span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hidden">
            {getDisplayExercises().map(ex => {
              const isActive = exercise === ex
              const info = EXERCISE_INFO[ex as Exercise]
              const muscleGroup = info?.muscleGroup || ''
              const abbr = MUSCLE_ABBR[muscleGroup] || ''
              const isCustom = !DEFAULT_EXERCISES.includes(ex as Exercise)
              return (
                <div key={ex} className="relative flex-shrink-0 group">
                  <button type="button" onClick={() => setExercise(ex)}
                    className={`flex items-center gap-1.5 whitespace-nowrap transition-all min-h-[40px] ${isCustom ? 'pr-7' : ''}`}
                    style={{
                      padding: '8px 14px', borderRadius: 9999, fontSize: 14,
                      background: isActive ? 'var(--text)' : 'transparent',
                      color: isActive ? 'var(--bg)' : 'var(--text-2)',
                      border: `1px solid ${isActive ? 'var(--text)' : 'var(--rule)'}`,
                      fontFamily: 'var(--font-sans)',
                    }}>
                    {tEx(ex)}
                    {abbr && !isActive && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, padding: '1px 5px', background: 'var(--rule)', color: 'var(--text-3)', borderRadius: 4, letterSpacing: '0.06em' }}>{abbr}</span>
                    )}
                  </button>
                  {isCustom && (
                    <button type="button" onClick={e => { e.stopPropagation(); handleDeleteExercise(ex) }}
                      className="absolute top-1/2 -translate-y-1/2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                      style={{ color: isActive ? 'rgba(255,255,255,0.7)' : 'var(--text-3)' }}>✕</button>
                  )}
                </div>
              )
            })}
            <button type="button" onClick={() => setShowModal(true)}
              className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all"
              style={{ background: 'var(--card-hi)', color: 'var(--text-2)', border: '1px solid var(--rule)' }}
              aria-label={t('common.newExercise')}>+</button>
          </div>

          {/* Variant pills */}
          {EXERCISE_VARIANTS[exercise as string] && (
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hidden mt-1">
              {EXERCISE_VARIANTS[exercise as string].map(v => (
                <button key={v} type="button" onClick={() => setVariant(variant === v ? '' : v)}
                  className="flex-shrink-0 px-3 py-1 rounded-full text-xs tracking-wide transition-all flex items-center gap-1"
                  style={{
                    background: variant === v ? 'var(--text)' : 'transparent',
                    color: variant === v ? 'var(--bg)' : 'var(--text-3)',
                    border: `1px solid ${variant === v ? 'var(--text)' : 'var(--rule)'}`,
                    fontFamily: 'var(--font-mono)',
                  }}>
                  {VARIANT_KEYS[v] ? t(VARIANT_KEYS[v]) : v}
                  {isVariantUnilateral(exercise as string, v) && <span className="opacity-50 text-[9px]">1B</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Weight card */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 500 }}>
              pes ({unit})
            </span>
            {!isNaN(wNum) && wNum > 0 && lastSessions[exercise] && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)' }}>
                anterior {format(unit === 'kg' ? (lastSessions[exercise]?.sets[0]?.weight || 0) : fromKg(lastSessions[exercise]?.sets[0]?.weight || 0))}{unit}
              </span>
            )}
          </div>
          <div className="relative rounded-[18px] flex items-center gap-3 p-4 transition-all"
            style={{
              background: 'var(--input-big)',
              border: `1px solid ${isPRweight ? 'var(--accent)' : 'var(--rule)'}`,
              boxShadow: 'var(--shadow)',
            }}>
            {isPRweight && (
              <span className="absolute top-3 right-4 dop-scale-pop"
                style={{ fontFamily: 'var(--font-mono)', fontSize: 9, padding: '2px 7px', background: 'var(--accent)', color: '#fff', borderRadius: 9999, letterSpacing: '0.06em', fontWeight: 500 }}>
                RÈCORD
              </span>
            )}
            <button type="button"
              onClick={() => { const v = Math.max(0, (parseFloat(weight) || 0) - 2.5); setWeight(v % 1 === 0 ? String(v) : v.toFixed(1)) }}
              className="w-14 h-14 flex items-center justify-center text-2xl flex-shrink-0 rounded-[18px] transition-all active:scale-95"
              style={{ background: 'var(--card)', border: '1px solid var(--rule)', color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>−</button>
            <div className="flex-1 text-center relative" onClick={() => setActiveInput('weight')}>
              <div className="cursor-pointer select-none leading-none"
                style={{ fontFamily: 'var(--font-mono)', fontWeight: 400, fontSize: 56, color: isPRweight ? 'var(--accent)' : (weight ? 'var(--text)' : 'var(--text-3)'), fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', transition: 'color 200ms' }}>
                {weight || '0'}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)', marginTop: 4, letterSpacing: '0.08em' }}>±2.5</div>
            </div>
            <button type="button"
              onClick={() => { const v = (parseFloat(weight) || 0) + 2.5; setWeight(v % 1 === 0 ? String(v) : v.toFixed(1)) }}
              className="w-14 h-14 flex items-center justify-center text-2xl flex-shrink-0 rounded-[18px] transition-all active:scale-95"
              style={{ background: 'var(--card)', border: '1px solid var(--rule)', color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>+</button>
          </div>
          {exInfo?.hasBodyweight && exInfo?.hasWeight && (
            <button type="button" onClick={() => setWeightType(weightType === 'corporal' ? 'pes' : 'corporal')}
              className="mt-2 px-4 py-2 rounded-full text-xs font-medium tracking-wide transition-all"
              style={{
                background: weightType === 'corporal' ? 'var(--text)' : 'var(--card-hi)',
                color: weightType === 'corporal' ? 'var(--bg)' : 'var(--text-3)',
                border: '1px solid var(--rule)', fontFamily: 'var(--font-mono)',
              }}>
              {weightType === 'corporal' ? `✓ ${t('workouts.bodyweight')}` : t('workouts.bodyweight')}
            </button>
          )}
        </div>

        {/* Reps card */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 500 }}>
              reps
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)' }}>
              obj. {repsMin}–{repsMax}
            </span>
          </div>
          <div className="relative rounded-[18px] p-4" style={{ background: 'var(--input-big)', border: '1px solid var(--rule)', boxShadow: 'var(--shadow)' }}>
            <div className="flex items-center gap-3">
              <button type="button"
                onClick={() => { const n = parseInt(reps) || 0; if (n > 0) setReps(String(n - 1)) }}
                className="w-11 h-11 flex items-center justify-center text-xl flex-shrink-0 rounded-[14px] transition-all active:scale-95"
                style={{ background: 'var(--card)', border: '1px solid var(--rule)', color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>−</button>
              <div className="flex-1 text-center relative" onClick={() => setActiveInput('reps')}>
                <div key={reps} className="cursor-pointer select-none leading-none"
                  style={{
                    fontFamily: 'var(--font-mono)', fontWeight: 400, fontSize: 44,
                    color: reps ? (inRange ? 'var(--accent)' : 'var(--text)') : 'var(--text-3)',
                    fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
                    animation: reps ? 'dopFlip 280ms cubic-bezier(.34,1.56,.64,1) both' : 'none',
                    transition: 'color 200ms',
                  }}>
                  {reps || 0}
                </div>
                {inRange && rNum > 0 && (
                  <span className="absolute -top-1 right-2 dop-scale-pop"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 9, padding: '2px 6px', background: 'var(--accent-tint)', color: 'var(--accent)', borderRadius: 9999, letterSpacing: '0.06em', fontWeight: 500 }}>
                    OBJECTIU ✓
                  </span>
                )}
              </div>
              <button type="button"
                onClick={() => setReps(String((parseInt(reps) || 0) + 1))}
                className="w-11 h-11 flex items-center justify-center text-xl flex-shrink-0 rounded-[14px] transition-all active:scale-95"
                style={{ background: 'var(--card)', border: '1px solid var(--rule)', color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>+</button>
            </div>
          </div>
          {/* Quick-rep pills */}
          <div className="flex gap-1.5 mt-2">
            {repPills.map(n => {
              const sel = reps === String(n)
              const highlighted = n >= repsMin && n <= repsMax
              return (
                <button key={n} type="button" onClick={() => setReps(String(n))}
                  className="flex-1 py-2 rounded-full relative transition-all active:scale-95"
                  style={{
                    background: sel ? 'var(--accent)' : 'transparent',
                    color: sel ? '#fff' : 'var(--text-2)',
                    border: `1px solid ${sel ? 'var(--accent)' : highlighted ? 'var(--accent-soft)' : 'var(--rule)'}`,
                    fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500,
                    boxShadow: sel ? '0 4px 12px rgba(177,78,44,0.35)' : 'none',
                  }}>
                  {n}
                  {highlighted && !sel && (
                    <span className="absolute top-1 right-1.5 w-1 h-1 rounded-full" style={{ background: 'var(--accent)' }} />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* RIR row */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 500 }}>
              RIR
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)' }}>repeticions en reserva</span>
          </div>
          <div className="flex gap-1.5">
            {['0','1','2','3','4'].map(n => (
              <button key={n} type="button" onClick={() => setRir(n)}
                className="flex-1 py-3 rounded-[14px] flex flex-col items-center gap-0.5 transition-all"
                style={{
                  background: rir === n ? 'var(--card-hi)' : 'transparent',
                  border: `1px solid ${rir === n ? 'var(--accent)' : 'var(--rule)'}`,
                  boxShadow: rir === n ? `0 0 0 3px var(--accent-tint)` : 'none',
                  color: rir === n ? 'var(--text)' : 'var(--text-2)',
                }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 500, color: rir === n ? 'var(--accent)' : 'var(--text-2)', lineHeight: 1 }}>{n}</span>
                <span style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.04em', fontFamily: 'var(--font-mono)' }}>{rirLabels[n]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 1RM cards */}
        {(displayedOneRM > 0 || bestPerExercise[exercise]) && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-[14px] p-3" style={{ background: 'var(--card)', border: '1px solid var(--rule)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 4 }}>1RM estimat</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: displayedOneRM > (bestPerExercise[exercise] || 0) ? 'var(--accent)' : 'var(--text)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {displayedOneRM || '—'}<span style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 2 }}>{unit}</span>
              </div>
            </div>
            <div className="rounded-[14px] p-3" style={{ background: 'var(--card)', border: '1px solid var(--rule)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 4 }}>millor 1RM</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {bestPerExercise[exercise] || '—'}<span style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 2 }}>{unit}</span>
              </div>
            </div>
          </div>
        )}

        {/* Notes collapsible */}
        {!notesOpen ? (
          <button type="button" onClick={() => setNotesOpen(true)}
            className="flex items-center gap-2 transition-colors"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', fontFamily: 'var(--font-sans)', fontSize: 12, cursor: 'pointer', padding: '4px 0' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>+</span> afegir nota
          </button>
        ) : (
          <div className="animate-slide-up">
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6 }}>nota</div>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder="Sensació, tècnica, dolor..."
              className="w-full rounded-[14px] px-4 py-3 text-sm resize-none outline-none"
              style={{ background: 'var(--card-hi)', border: '1px solid var(--rule)', color: 'var(--text)', fontFamily: 'var(--font-sans)', minHeight: 64 }} />
          </div>
        )}

        {/* CTA */}
        <div className="relative pb-2">
          <button type="submit" disabled={formLoading || !ctaEnabled}
            className="w-full py-4 rounded-2xl font-medium disabled:opacity-40 transition-all"
            style={{
              background: ctaEnabled ? 'var(--accent)' : 'var(--card-hi)',
              color: ctaEnabled ? '#fff' : 'var(--text-3)',
              border: 'none',
              fontSize: 15,
              boxShadow: ctaEnabled ? '0 8px 22px rgba(177,78,44,0.35), 0 2px 4px rgba(177,78,44,0.2)' : 'none',
              animation: ctaEnabled ? 'dopBreathe 2400ms ease-in-out infinite' : 'none',
            }}>
            {formLoading ? t('common.saving') : ctaEnabled
              ? <span className="flex items-center justify-center gap-2">
                  <span>Anotar sèrie</span>
                  <span style={{ opacity: 0.75, fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                    · {weight || 0}<span style={{ opacity: 0.6 }}>{unit}</span> × {reps}
                  </span>
                  {isPRweight && <span>🏆</span>}
                </span>
              : <span>Posa les reps per anotar</span>
            }
          </button>
        </div>

        {/* Recent sets */}
        {savedSets.length > 0 && (
          <div className="pt-2">
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 10 }}>
              {t('home.recent')}
            </div>
            <div className="space-y-0">
              {savedSets.map((set) => {
                const isPr = set.one_rm > 0 && bestPerExercise[set.exercise] === set.one_rm
                return (
                  <div key={set.id} className="flex justify-between items-start py-3" style={{ borderBottom: '1px solid var(--rule-soft)' }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm flex items-center gap-1.5 truncate" style={{ color: 'var(--text)' }}>
                        {isPr && <span>🏆</span>}
                        <span className="truncate">{tEx(set.exercise)}</span>
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                        {new Date(set.created_at).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                      </p>
                      {set.note && <p className="text-xs italic mt-1 truncate" style={{ color: 'var(--text-3)' }}>"{set.note}"</p>}
                    </div>
                    <div className="text-right ml-3 flex-shrink-0">
                      <p className="tabular-nums" style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text)' }}>{format(set.weight)}{unit} × {set.reps}</p>
                      {set.rir != null && <p className="text-xs" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>RIR {set.rir}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </form>

      {/* Numeric keyboards */}
      {activeInput === 'weight' && (
        <NumericKeyboard value={weight} onChange={setWeight} onClose={() => setActiveInput(null)} allowDecimal label={`${t('workouts.weight')} (${unit})`} maxLength={5} />
      )}
      {activeInput === 'reps' && (
        <NumericKeyboard value={reps} onChange={setReps} onClose={() => setActiveInput(null)} allowDecimal={false} label={t('workouts.reps')} maxLength={3} />
      )}

      {/* Add exercise modal */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/60 backdrop-blur-sm fade-in"
          onClick={() => { setShowModal(false); setNewExerciseName(''); setNewExercisePrimary(''); setNewExerciseSecondary(''); setErrorMsg(null) }}>
          <div className="rounded-t-3xl sm:rounded-3xl px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] w-full max-w-sm animate-scale-in"
            style={{ background: 'var(--card)', border: '1px solid var(--rule)', boxShadow: 'var(--shadow)' }}
            onClick={e => e.stopPropagation()}>
            <h3 className="text-lg mb-4" style={{ color: 'var(--text)', fontWeight: 600, letterSpacing: '-0.02em' }}>{t('common.newExercise')}</h3>
            <input type="text" value={newExerciseName} onChange={e => setNewExerciseName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddExercise()} placeholder={t('common.exerciseName')}
              className="w-full rounded-[14px] px-4 py-3 mb-3 outline-none"
              style={{ background: 'var(--card-hi)', color: 'var(--text)', border: '1px solid var(--rule)' }} autoFocus />
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
                        className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
                        style={{ background: 'var(--card-hi)', color: 'var(--text)', border: '1px solid var(--rule)' }}>
                        <option value="">—</option>
                        {muscleOptions.map(o => <option key={o.value} value={o.value}>{t(o.key)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="section-label block mb-1.5">{t('exercise.secondaryMuscle')}</label>
                      <select value={newExerciseSecondary} onChange={e => setNewExerciseSecondary(e.target.value)}
                        className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
                        style={{ background: 'var(--card-hi)', color: 'var(--text)', border: '1px solid var(--rule)' }}>
                        <option value="">{t('exercise.noSecondary')}</option>
                        {muscleOptions.map(o => <option key={o.value} value={o.value}>{t(o.key)}</option>)}
                      </select>
                    </div>
                  </>
                )
              })()}
            </div>
            {errorMsg && <p className="text-sm mb-3" style={{ color: 'var(--danger)' }}>{errorMsg}</p>}
            <div className="flex gap-3">
              <button onClick={() => { setShowModal(false); setNewExerciseName(''); setNewExercisePrimary(''); setNewExerciseSecondary(''); setErrorMsg(null) }}
                className="flex-1 py-3 rounded-2xl transition-colors"
                style={{ background: 'var(--card-hi)', color: 'var(--text-2)', border: '1px solid var(--rule)' }}>{t('common.cancel')}</button>
              <button onClick={handleAddExercise}
                className="flex-1 py-3 rounded-2xl font-medium transition-opacity hover:opacity-90"
                style={{ background: 'var(--accent)', color: '#fff' }}>{t('common.add')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
