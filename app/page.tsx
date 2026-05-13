'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './contexts/AuthContext'
import { Exercise, DEFAULT_EXERCISES, WorkoutLog, EXERCISE_INFO, EXERCISE_KEYS } from '@/types'
import { useTranslation } from './contexts/LanguageContext'
import { useTheme } from './contexts/ThemeContext'
import { useUnit } from './contexts/UnitContext'
import NumericKeyboard from './components/NumericKeyboard'

function calculate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0
  return Math.round(weight / (1.0278 - 0.0278 * reps))
}

async function analyzeOverload(exerciseName: string, t: (key: string, variables?: Record<string, any>) => string, format: (kg: number) => string, unit: string): Promise<string | null> {
  const { data: logs } = await supabase
    .from('workout_logs')
    .select('*')
    .eq('exercise', exerciseName)
    .order('created_at', { ascending: false })
    .limit(14)

  if (!logs || logs.length < 2) return null

  const recentLogs = logs.slice(0, 7)
  const previousLogs = logs.slice(7, 14)
  if (previousLogs.length === 0) return null

  const avgRecent = recentLogs.reduce((sum, l) => sum + (l.one_rm || 0), 0) / recentLogs.length
  const avgPrevious = previousLogs.reduce((sum, l) => sum + (l.one_rm || 0), 0) / previousLogs.length

  if (avgRecent <= avgPrevious) return null

  const improvement = ((avgRecent - avgPrevious) / avgPrevious) * 100
  const targetWeightKg = Math.round((avgRecent + 2.5) * 10) / 10

  return t('home.suggestionFormat', { weight: format(targetWeightKg), unit, improvement: Math.round(improvement) })
}

export default function HomePage() {
  const { user } = useAuth()
  const { t, locale } = useTranslation()
  const { theme } = useTheme()
  const { unit, toKg, format } = useUnit()
  const [exercise, setExercise] = useState<Exercise>('Press Banca')
  const [weight, setWeight] = useState<string>('')
  const [reps, setReps] = useState<string>('')
  const [rir, setRir] = useState<string>('')
  const [oneRM, setOneRM] = useState<number>(0)
  const [weightType, setWeightType] = useState("pes")
  const [savedSets, setSavedSets] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [customExercises, setCustomExercises] = useState<string[]>([])
  const [showModal, setShowModal] = useState(false)
  const [newExerciseName, setNewExerciseName] = useState('')
  const [newExercisePrimary, setNewExercisePrimary] = useState('')
  const [newExerciseSecondary, setNewExerciseSecondary] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [note, setNote] = useState<string>('')
  const [prMsg, setPrMsg] = useState<string | null>(null)
  const [bestPerExercise, setBestPerExercise] = useState<Record<string, number>>({})
  const [activeInput, setActiveInput] = useState<'weight' | 'reps' | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('custom_exercises')
    if (saved) setCustomExercises(JSON.parse(saved))
  }, [])

  useEffect(() => {
    const w = parseFloat(weight), r = parseFloat(reps)
    if (!isNaN(w) && !isNaN(r) && w > 0 && r > 0) {
      setOneRM(calculate1RM(toKg(w), r))
    } else {
      setOneRM(0)
    }
  }, [weight, reps, unit])

  useEffect(() => { loadSavedSets() }, [user])
  useEffect(() => {
    const id = setTimeout(() => {
      if (exercise) analyzeOverload(exercise, t, format, unit).then(setSuggestion)
    }, 400)
    return () => clearTimeout(id)
  }, [exercise, t, format, unit])

    const getDisplayExercises = () => [...DEFAULT_EXERCISES, ...customExercises]

    const tEx = (name: string) => {
      const bodywaterSuffix = ' - Pes corporal'
      if (name.endsWith(bodywaterSuffix)) {
        const base = name.slice(0, -bodywaterSuffix.length)
        const key = EXERCISE_KEYS[base]
        return `${key ? t(key) : base} - ${t('workouts.bodyweight')}`
      }
      const key = EXERCISE_KEYS[name]
      return key ? t(key) : name
    }

    // Reset weightType to "pes" when exercise changes if it doesn't support bodyweight
    useEffect(() => {
      const info = EXERCISE_INFO[exercise as Exercise]
      if (info && (!info.hasBodyweight || !info.hasWeight)) {
        setWeightType("pes")
      }
    }, [exercise])

   async function loadSavedSets() {
    if (!user) {
      setSavedSets([])
      setBestPerExercise({})
      return
    }
    const { data, error } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(8)
    if (error) {
      console.error('Error loading saved sets:', error)
      return
    }
    if (data) {
      setSavedSets(data)
      // Load all-time max 1RM per exercise (for PR badge)
      const exercises = Array.from(new Set(data.map((s: any) => s.exercise)))
      if (exercises.length > 0) {
        const { data: allLogs } = await supabase
          .from('workout_logs')
          .select('exercise, one_rm')
          .eq('user_id', user.id)
          .in('exercise', exercises)
        const best: Record<string, number> = {}
        for (const l of allLogs || []) {
          if ((l.one_rm || 0) > (best[l.exercise] || 0)) best[l.exercise] = l.one_rm
        }
        setBestPerExercise(best)
      }
    }
  }

    async function handleSave(e: React.FormEvent) {
      e.preventDefault()
      const wInput = parseFloat(weight), r = parseFloat(reps)
      if (isNaN(r) || r <= 0) return
      if (weightType === "pes" && (isNaN(wInput) || wInput <= 0)) return

      setLoading(true)
      setErrorMsg(null)

      try {
        const wKg = toKg(wInput)

        const exerciseToStore = weightType === "corporal" ? `${exercise} - Pes corporal` : exercise

        let isPr = false
        if (weightType !== "corporal" && oneRM > 0 && user) {
          const { data: prev } = await supabase
            .from('workout_logs')
            .select('one_rm')
            .eq('user_id', user.id)
            .eq('exercise', exerciseToStore)
            .order('one_rm', { ascending: false })
            .limit(1)
          const prevMax = prev?.[0]?.one_rm || 0
          if (oneRM > prevMax) isPr = true
        }

        const insertData: any = {
          exercise: exerciseToStore,
          weight: weightType === "corporal" ? 0 : wKg,
          reps: r,
          rir: rir === '' ? null : parseFloat(rir),
          one_rm: weightType === "corporal" ? 0 : oneRM,
          user_id: user?.id,
        }
        if (note.trim()) insertData.note = note.trim()
        const { error } = await supabase.from('workout_logs').insert(insertData)
        if (error) {
          console.error('Error saving set:', error)
          setErrorMsg(t('common.saveError') + error.message)
          return
        }
        setWeight(''); setReps(''); setRir(''); setNote('')
        setActiveInput(null)
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(isPr ? [60, 40, 60, 40, 120] : 40)
        }
        if (isPr) {
          setPrMsg(t('home.newPr', { exercise: tEx(exerciseToStore), value: format(oneRM), unit }))
          setTimeout(() => setPrMsg(null), 6000)
        }
        await loadSavedSets()
      } catch (err: any) {
        console.error('Unexpected error saving set:', err)
        setErrorMsg(t('common.error') + ': ' + (err?.message || String(err)))
      } finally {
        setLoading(false)
      }
    }

  function handleAddExercise() {
    const trimmed = newExerciseName.trim()
    if (!trimmed) { setErrorMsg(t('common.required')); return }
    if (DEFAULT_EXERCISES.includes(trimmed as Exercise) || customExercises.includes(trimmed)) {
      setErrorMsg(t('common.exists')); return
    }
    if (!newExercisePrimary) { setErrorMsg(t('exercise.primaryMuscle')); return }
    const updated = [...customExercises, trimmed]
    setCustomExercises(updated)
    localStorage.setItem('custom_exercises', JSON.stringify(updated))
    // Store muscle group info
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

  const allExercises = [...DEFAULT_EXERCISES, ...customExercises]

    if (!user) {
      return (
        <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] flex flex-col px-6 py-16">
          <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto space-y-8 animate-slide-up">
            <div className="text-center space-y-3">
              <h1 className="text-4xl font-light tracking-tight">gym.</h1>
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

  return (
     <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      <div className="px-6 pt-5 pb-2 flex items-center justify-between">
        <h1 className="page-title">gym.</h1>
        {oneRM > 0 && (
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-light tracking-tight tabular-nums">{format(oneRM)}</span>
            <span className="text-[var(--color-text-tertiary)] text-sm">{unit}</span>
            <span className="text-[var(--color-text-tertiary)] text-xs ml-1">1RM</span>
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
            <p className="text-sm font-medium" style={{ color: 'var(--accent-warn)' }}>\ud83c\udfc6 {prMsg}</p>
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
                    <button
                      type="button"
                      onClick={() => setExercise(ex)}
                      className={`px-4 py-2.5 rounded-full text-sm whitespace-nowrap transition-colors min-h-[44px] ${isCustom ? 'pr-8' : ''} ${
                        isActive
                          ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-primary)]'
                          : 'bg-[var(--surface-strong)] text-[var(--color-text-primary)] hover:bg-[var(--surface-hover)]'
                      }`}
                    >
                      {tEx(ex)}
                    </button>
                    {isCustom && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteExercise(ex) }}
                        className={`absolute top-1/2 -translate-y-1/2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] leading-none ${
                          isActive ? 'text-[var(--color-bg-primary)]/70 hover:text-[var(--color-bg-primary)] hover:bg-black/10'
                                   : 'text-[var(--color-text-tertiary)] hover:text-[var(--accent-danger)] hover:bg-[var(--surface-hover)]'
                        }`}
                        aria-label={`Delete ${ex}`}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )
              })}
               <button
                 type="button"
                 onClick={() => setShowModal(true)}
                 className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-lg bg-[var(--surface-strong)] text-[var(--color-text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--color-text-primary)] transition-colors"
                 aria-label={t('common.newExercise')}
               >
                 +
               </button>
            </div>
          </div>

           <div className="space-y-4">
             {/* PES / PES CORPORAL section */}
             <div>
                <label className="section-label block mb-2">{t('workouts.weight')} ({unit})</label>
                <input
                  type="text"
                  inputMode="none"
                  readOnly
                  value={weight}
                  onClick={() => {
                    const isDisabled = EXERCISE_INFO[exercise as Exercise]?.hasBodyweight && EXERCISE_INFO[exercise as Exercise]?.hasWeight && weightType === "corporal"
                    if (!isDisabled) setActiveInput('weight')
                  }}
                  placeholder={EXERCISE_INFO[exercise as Exercise]?.hasBodyweight && EXERCISE_INFO[exercise as Exercise]?.hasWeight ? (weightType === "corporal" ? `0 (${t('workouts.bodyweight')})` : "0") : "0"}
                  disabled={EXERCISE_INFO[exercise as Exercise]?.hasBodyweight && EXERCISE_INFO[exercise as Exercise]?.hasWeight && weightType === "corporal"}
                  className={`w-full bg-[var(--surface-strong)] text-[var(--color-text-primary)] text-2xl font-light rounded-2xl px-4 py-3 border border-transparent focus:outline-none disabled:opacity-50 cursor-pointer ${activeInput === 'weight' ? 'border-[var(--border)]' : ''}`}
                />
                {EXERCISE_INFO[exercise as Exercise]?.hasBodyweight && EXERCISE_INFO[exercise as Exercise]?.hasWeight && (
                  <button
                    type="button"
                    onClick={() => setWeightType(weightType === "corporal" ? "pes" : "corporal")}
                    className={`mt-2 px-4 py-2 rounded-full text-xs font-medium tracking-wide transition-colors min-h-[36px] ${
                      weightType === "corporal"
                        ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-primary)]'
                        : 'bg-[var(--surface-strong)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
                    }`}
                  >
                    {weightType === "corporal" ? `✓ ${t('workouts.bodyweight')}` : t('workouts.bodyweight')}
                  </button>
                )}
             </div>

             {/* REPS section */}
             <div>
                <label className="section-label block mb-3">{t('workouts.reps')}</label>
                <div className="flex items-center justify-between rounded-2xl px-3 py-2.5 bg-[var(--surface-strong)]">
                  <button
                    type="button"
                    onClick={() => {
                      const n = parseInt(reps) || 0
                      if (n > 0) setReps(String(n - 1))
                    }}
                    className="w-11 h-11 rounded-full flex items-center justify-center text-xl font-light bg-[var(--card)] border border-[var(--border)] text-[var(--color-text-primary)] hover:bg-[var(--surface-hover)] active:scale-95 transition-all disabled:opacity-30"
                    disabled={!reps || parseInt(reps) <= 0}
                    aria-label={t('workouts.decreaseReps')}
                  >
                    −
                  </button>
                  <div
                    onClick={() => setActiveInput('reps')}
                    className="flex-1 mx-2 text-center text-4xl font-light text-[var(--color-text-primary)] tabular-nums cursor-pointer select-none"
                  >
                    {reps || <span className="text-[var(--color-text-tertiary)]">0</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const n = parseInt(reps) || 0
                      setReps(String(n + 1))
                    }}
                    className="w-11 h-11 rounded-full flex items-center justify-center text-xl font-light bg-[var(--color-text-primary)] text-[var(--color-bg-primary)] hover:opacity-90 active:scale-95 transition-all"
                    aria-label={t('workouts.increaseReps')}
                  >
                    +
                  </button>
                </div>
                <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-hidden">
                  {[5, 8, 10, 12, 15, 20].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setReps(String(n))}
                      className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors flex-shrink-0 ${
                        reps === String(n)
                          ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-primary)]'
                          : 'bg-[var(--surface)] text-[var(--color-text-tertiary)] border border-[var(--border)] hover:bg-[var(--surface-hover)]'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
            </div>

             {/* RIR section */}
             <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="section-label">{t('common.rir')}</label>
                  <div className="flex items-center gap-3">
                    <span className="text-[var(--color-text-primary)] text-xl font-light tabular-nums w-5 text-right">{rir === '' ? '—' : rir}</span>
                    <button
                      type="button"
                      onClick={() => setRir(rir === '' ? '0' : '')}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-[var(--surface-strong)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                    >
                      {rir === '' ? t('workouts.activate') : t('workouts.noRir')}
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="1"
                  value={rir === '' ? 0 : rir}
                  onChange={(e) => setRir(e.target.value)}
                  className={`w-full h-1.5 rounded-full appearance-none cursor-pointer transition-opacity ${rir === '' ? 'opacity-30' : ''}`}
                  style={{ accentColor: 'var(--color-text-primary)' }}
                />
                <div className="flex justify-between mt-1">
                  {[0,1,2,3].map(v => (
                    <span key={v} className="text-[10px] text-[var(--color-text-tertiary)]">{v}</span>
                  ))}
                </div>
            </div>

             {/* 1RM inline */}
             {oneRM > 0 && (
               <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl fade-in">
                 <span className="text-[var(--color-text-tertiary)] text-xs uppercase tracking-wider">{t('home.oneRMLabel')}</span>
                 <span className="text-[var(--color-text-primary)] font-light tabular-nums">
                   {format(oneRM)}<span className="text-[var(--color-text-tertiary)] text-xs ml-0.5">{unit}</span>
                 </span>
               </div>
             )}

             {/* NOTES section (optional) */}
             <div>
                <label className="section-label block mb-2">{t('workouts.notes')} <span className="opacity-60 normal-case font-normal">{t('workouts.notesOptional')}</span></label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t('workouts.notesPlaceholder')}
                  maxLength={200}
                  className="w-full bg-[var(--surface-strong)] text-[var(--color-text-primary)] text-sm font-light rounded-2xl px-4 py-3 border border-transparent focus:outline-none focus:border-[var(--border)]"
                />
            </div>
            </div>

           <button
             type="submit"
             disabled={loading}
             className="w-full py-4 rounded-2xl font-medium bg-[var(--color-text-primary)] text-[var(--color-bg-primary)] hover:opacity-90 disabled:opacity-50 transition-opacity"
           >
             {loading ? t('common.saving') : t('common.save')}
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
                    {set.note && <p className="text-[var(--color-text-tertiary)] text-xs italic mt-1 truncate">“{set.note}”</p>}
                  </div>
                   <div className="text-right ml-3 flex-shrink-0">
                       <p className="text-[var(--color-text-primary)] font-light tabular-nums">{format(set.weight)}{unit} × {set.reps}</p>
                       {set.rir != null && <p className="text-[var(--color-text-tertiary)] text-xs">RIR {set.rir}</p>}
                   </div>
                </div>
              )})}
            </div>
          )}
        </div>
      </div>

      {activeInput === 'weight' && (
        <NumericKeyboard
          value={weight}
          onChange={setWeight}
          onClose={() => setActiveInput(null)}
          allowDecimal
          label={`${t('workouts.weight')} (${unit})`}
          maxLength={5}
        />
      )}
      {activeInput === 'reps' && (
        <NumericKeyboard
          value={reps}
          onChange={setReps}
          onClose={() => setActiveInput(null)}
          allowDecimal={false}
          label={t('workouts.reps')}
          maxLength={3}
        />
      )}

      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/60 backdrop-blur-sm fade-in" onClick={() => { setShowModal(false); setNewExerciseName(''); setNewExercisePrimary(''); setNewExerciseSecondary(''); setErrorMsg(null) }}>
           <div className="bg-[var(--card)] border border-[var(--border)] rounded-t-3xl sm:rounded-3xl px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] w-full max-w-sm animate-scale-in" style={{ boxShadow: 'var(--shadow-soft)' }} onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-light text-[var(--color-text-primary)] mb-4">{t('common.newExercise')}</h3>
             <input
               type="text"
               value={newExerciseName}
               onChange={(e) => setNewExerciseName(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleAddExercise()}
               placeholder={t('common.exerciseName')}
                className="w-full bg-[var(--surface-strong)] text-[var(--color-text-primary)] rounded-2xl px-4 py-3 mb-3 border border-transparent focus:outline-none focus:border-[var(--border)]"
               autoFocus
             />
             <div className="space-y-2 mb-3">
               {(() => {
                 const muscleOptions: { value: string; key: string }[] = [
                   { value: 'Pectoral', key: 'exercise.muscleGroupPectoral' },
                   { value: 'Esquena', key: 'exercise.muscleGroupEsquena' },
                   { value: 'Cames', key: 'exercise.muscleGroupCames' },
                   { value: 'Esquitxos', key: 'exercise.muscleGroupEsquitxos' },
                   { value: 'Braços', key: 'exercise.muscleGroupBracos' },
                   { value: 'Abdominals', key: 'exercise.muscleGroupAbdominals' },
                   { value: 'Gluts', key: 'exercise.muscleGroupGluts' },
                   { value: 'Full Body', key: 'exercise.muscleGroupFullBody' },
                 ]
                 return (
                   <>
                     <div>
                       <label className="section-label block mb-1.5">{t('exercise.primaryMuscle')}</label>
                       <select
                         value={newExercisePrimary}
                         onChange={(e) => setNewExercisePrimary(e.target.value)}
                         className="w-full bg-[var(--surface-strong)] text-[var(--color-text-primary)] rounded-xl px-4 py-2.5 text-sm border border-transparent focus:outline-none focus:border-[var(--border)]"
                       >
                         <option value="">—</option>
                         {muscleOptions.map(o => <option key={o.value} value={o.value}>{t(o.key)}</option>)}
                       </select>
                     </div>
                     <div>
                       <label className="section-label block mb-1.5">{t('exercise.secondaryMuscle')}</label>
                       <select
                         value={newExerciseSecondary}
                         onChange={(e) => setNewExerciseSecondary(e.target.value)}
                         className="w-full bg-[var(--surface-strong)] text-[var(--color-text-primary)] rounded-xl px-4 py-2.5 text-sm border border-transparent focus:outline-none focus:border-[var(--border)]"
                       >
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
                <button onClick={() => { setShowModal(false); setNewExerciseName(''); setNewExercisePrimary(''); setNewExerciseSecondary(''); setErrorMsg(null) }} className="flex-1 py-3 rounded-2xl bg-[var(--surface-strong)] text-[var(--color-text-secondary)] font-light hover:bg-[var(--surface-hover)] transition-colors">{t('common.cancel')}</button>
                <button onClick={handleAddExercise} className="flex-1 py-3 rounded-2xl bg-[var(--color-text-primary)] text-[var(--color-bg-primary)] font-medium hover:opacity-90 transition-opacity">{t('common.add')}</button>
             </div>
           </div>
         </div>
       )}

      <div className="h-20" />
    </div>
  )
}


