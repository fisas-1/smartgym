'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './contexts/AuthContext'
import { Exercise, DEFAULT_EXERCISES, WorkoutLog, EXERCISE_INFO, EXERCISE_KEYS } from '@/types'
import { useTranslation } from './contexts/LanguageContext'
import { useTheme } from './contexts/ThemeContext'
import { useUnit } from './contexts/UnitContext'

function calculate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0
  return Math.round(weight / (1.0278 - 0.0278 * reps))
}

async function analyzeOverload(exerciseName: string, t: (key: string, variables?: Record<string, any>) => string): Promise<string | null> {
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
  const targetWeight = Math.round((avgRecent + 2.5) * 10) / 10

  return t('home.suggestionFormat', { weight: targetWeight, improvement: Math.round(improvement) })
}

export default function HomePage() {
  const { user } = useAuth()
  const { t } = useTranslation()
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [suggestion, setSuggestion] = useState<string | null>(null)

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
      if (exercise) analyzeOverload(exercise, t).then(setSuggestion)
    }, [exercise, t])

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
    if (data) setSavedSets(data)
  }

    async function handleSave(e: React.FormEvent) {
      e.preventDefault()
      const wInput = parseFloat(weight), r = parseFloat(reps)
      if (isNaN(r) || r <= 0) return
      if (weightType === "pes" && (isNaN(wInput) || wInput <= 0)) return

      setLoading(true)
      setErrorMsg(null)

      const wKg = toKg(wInput)

      // For bodyweight exercises, store with suffix to distinguish in history
      const exerciseToStore = weightType === "corporal" ? `${exercise} - Pes corporal` : exercise

      const insertData = {
        exercise: exerciseToStore,
        weight: weightType === "corporal" ? 0 : wKg,
        reps: r,
        rir: rir === '' ? null : parseFloat(rir),
        one_rm: weightType === "corporal" ? 0 : oneRM,
        user_id: user?.id,
      }
      const { data, error } = await supabase.from('workout_logs').insert(insertData).select().maybeSingle()
      setLoading(false)
      if (error) {
        console.error('Error saving set:', error)
        if (error.message.includes('column') || error.message.includes('exercise')) {
          setErrorMsg('Error: La base de dades necessita configuració. Veure SOLUZIONE.md')
        } else {
          setErrorMsg('Error al guardar: ' + error.message)
        }
        return
      }
      setWeight(''); setReps(''); setRir('')
      await loadSavedSets()
    }

  function handleAddExercise() {
    const trimmed = newExerciseName.trim()
    if (!trimmed) { setErrorMsg('Nom requerit'); return }
    if (DEFAULT_EXERCISES.includes(trimmed as Exercise) || customExercises.includes(trimmed)) {
      setErrorMsg('Ja existeix'); return
    }
    const updated = [...customExercises, trimmed]
    setCustomExercises(updated)
    localStorage.setItem('custom_exercises', JSON.stringify(updated))
    setNewExerciseName(''); setErrorMsg(null); setShowModal(false)
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
        <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] flex items-center justify-center px-6">
          <div className="text-center space-y-6">
            <h1 className="text-3xl font-light mb-2">gym.</h1>
            <p className="text-zinc-500 mb-4">{t('home.welcome')}</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="/login" className="flex-1 py-4 px-8 rounded-2xl font-medium bg-[var(--card)] text-[var(--card-foreground)] hover:bg-[var(--input)] transition-colors">
                {t('common.login')}
              </a>
              <a href="/login" className="flex-1 py-4 px-8 rounded-2xl font-medium bg-[var(--color-text-primary)] text-[var(--color-bg-primary)] hover:opacity-90 transition-colors">
                {t('common.register')}
              </a>
            </div>
          </div>
        </div>
      )
    }

  return (
     <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      <div className="px-6 pt-8 pb-6">
            <h1 className="text-xl font-medium tracking-tight text-[var(--color-text-secondary)]">gym.</h1>
      </div>

       <div className="px-6 space-y-6">
         <div className="py-8">
            <p className="text-[var(--color-text-tertiary)] text-sm mb-1">{t('home.oneRMLabel')}</p>
           <div className="flex items-baseline gap-1">
             <span className="text-7xl font-light tracking-tight">{oneRM ? format(oneRM) : '\u2014'}</span>
             <span className="text-[var(--color-text-tertiary)] text-xl">{unit}</span>
           </div>
         </div>

        {suggestion && (
          <div className="px-4 py-3 bg-[var(--input)] border border-[var(--border)] rounded-2xl">
             <p className="text-[var(--color-text-tertiary)] text-sm">{suggestion}</p>
          </div>
        )}

        {errorMsg && (
          <div className="px-4 py-3 bg-red-900/50 border border-red-800 rounded-2xl">
            <p className="text-red-400 text-sm">{errorMsg}</p>
          </div>
        )}

         <form onSubmit={handleSave} className="space-y-4">
           <div>
              <label className="text-[var(--color-text-tertiary)] text-xs uppercase tracking-wider block mb-3">{t('workouts.exercise')}</label>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hidden">
              {getDisplayExercises().map((ex) => (
<button
                   key={ex}
                   type="button"
                   onClick={() => setExercise(ex)}
                   className={`px-4 py-3 rounded-full text-sm whitespace-nowrap transition-colors min-h-[44px] ${
                        exercise === ex
                          ? 'bg-[var(--card-foreground)] text-[var(--background)]'
                          : 'bg-[var(--input)] text-[var(--foreground)]'
                     }`}
                 >
                  {tEx(ex)}
{!DEFAULT_EXERCISES.includes(ex as Exercise) && (
                      <span onClick={(e) => { e.stopPropagation(); handleDeleteExercise(ex) }} className="ml-2 w-8 h-8 flex items-center justify-center text-[var(--color-text-tertiary)] hover:text-red-400 rounded-full">x</span>
                   )}
                </button>
              ))}
               <button type="button" onClick={() => setShowModal(true)} className="px-4 py-2 rounded-full text-base bg-[var(--input)] text-[var(--foreground)] min-h-[44px]">+</button>
            </div>
          </div>

           <div className="space-y-4">
             {/* PES / PES CORPORAL section */}
             <div>
                <label className="text-[var(--color-text-tertiary)] text-xs uppercase tracking-wider block mb-2">{t('workouts.weight')} ({unit})</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder={EXERCISE_INFO[exercise as Exercise]?.hasBodyweight && EXERCISE_INFO[exercise as Exercise]?.hasWeight ? (weightType === "corporal" ? `0 (${t('workouts.bodyweight')})` : "0") : "0"}
                  disabled={EXERCISE_INFO[exercise as Exercise]?.hasBodyweight && EXERCISE_INFO[exercise as Exercise]?.hasWeight && weightType === "corporal"}
                  className={`w-full ${theme === 'light' ? 'text-zinc-900 bg-zinc-100' : 'bg-[var(--input)] text-[var(--foreground)]'} text-2xl font-light rounded-2xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-[var(--border)] disabled:opacity-50`}
                />
{EXERCISE_INFO[exercise as Exercise]?.hasBodyweight && EXERCISE_INFO[exercise as Exercise]?.hasWeight && (
                  <button
                    type="button"
                    onClick={() => setWeightType(weightType === "corporal" ? "pes" : "corporal")}
                    className="mt-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px]"
                    style={{
                      backgroundColor: weightType === "corporal" ? "white" : "#27272a",
                      color: weightType === "corporal" ? "black" : "#a1a1aa",
                    }}
                  >
                    {weightType === "corporal" ? `${t('workouts.bodyweight')} ✓` : t('workouts.bodyweight')}
                  </button>
                )}
             </div>

             {/* REPS section */}
             <div>
                <label className="text-[var(--color-text-tertiary)] text-xs uppercase tracking-wider block mb-3">{t('workouts.reps')}</label>
                <div className={`flex items-center justify-between rounded-2xl px-4 py-3 ${theme === 'light' ? 'bg-zinc-100' : 'bg-[var(--input)]'}`}>
                  <button
                    type="button"
                    onClick={() => {
                      const n = parseInt(reps) || 0
                      if (n > 0) setReps(String(n - 1))
                    }}
                    className="w-12 h-12 rounded-full flex items-center justify-center text-2xl font-light bg-[var(--card)] border border-[var(--border)] text-[var(--color-text-primary)] hover:opacity-80 active:scale-95 transition-all disabled:opacity-30"
                    disabled={!reps || parseInt(reps) <= 0}
                    aria-label="Reduir reps"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={reps}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9]/g, '')
                      setReps(v)
                    }}
                    placeholder="0"
                    className={`flex-1 mx-2 bg-transparent text-center text-4xl font-light focus:outline-none ${theme === 'light' ? 'text-zinc-900' : 'text-[var(--foreground)]'}`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const n = parseInt(reps) || 0
                      setReps(String(n + 1))
                    }}
                    className="w-12 h-12 rounded-full flex items-center justify-center text-2xl font-light bg-[var(--color-text-primary)] text-[var(--color-bg-primary)] hover:opacity-80 active:scale-95 transition-all"
                    aria-label="Augmentar reps"
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
                      className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors flex-shrink-0 ${
                        reps === String(n)
                          ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-primary)]'
                          : 'bg-[var(--input)] text-[var(--color-text-tertiary)] border border-[var(--border)]'
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
                  <label className="text-[var(--color-text-tertiary)] text-xs uppercase tracking-wider">{t('common.rir')}</label>
                  <div className="flex items-center gap-3">
                    <span className="text-[var(--color-text-primary)] text-2xl font-light">{rir === '' ? '—' : rir}</span>
                    <button
                      type="button"
                      onClick={() => setRir(rir === '' ? '0' : '')}
                      className="text-xs px-3 py-1.5 rounded-full bg-[var(--input)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                    >
                      {rir === '' ? 'Activar' : 'Sense RIR'}
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
                  className={`w-full h-2 rounded-full appearance-none cursor-pointer transition-opacity ${rir === '' ? 'opacity-30' : ''}`}
                  style={{ accentColor: 'var(--color-text-primary)' }}
                />
                <div className="flex justify-between mt-1">
                  {[0,1,2,3].map(v => (
                    <span key={v} className={`text-xs ${rir === '' ? 'text-[var(--color-text-tertiary)] opacity-50' : 'text-[var(--color-text-tertiary)]'}`}>{v}</span>
                  ))}
                </div>
            </div>
            </div>

           <button
             type="submit"
             disabled={loading}
             className="w-full py-4 rounded-2xl font-medium bg-[var(--color-text-primary)] text-[var(--color-bg-primary)] hover:opacity-90 disabled:opacity-50"
           >
             {loading ? t('common.saving') : t('common.save')}
           </button>
        </form>

        <div className="pt-4">
           <p className="text-[var(--color-text-tertiary)] text-xs uppercase tracking-wider mb-4">{t('home.recent')}</p>
           {savedSets.length === 0 ? (
              <p className="text-[var(--color-text-tertiary)] text-sm">{t('home.noHistory')}</p>
          ) : (
            <div className="space-y-2">
              {savedSets.map((set) => (
                <div key={set.id} className="flex justify-between items-center py-3 border-b border-zinc-900">
                  <div>
                    <p className="text-[var(--color-text-primary)] font-light">{tEx(set.exercise)}</p>
                    <p className="text-[var(--color-text-tertiary)] text-xs">{new Date(set.created_at).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' })}</p>
                  </div>
                   <div className="text-right">
                       <p className="text-[var(--color-text-primary)] font-light">{format(set.weight)}{unit} x {set.reps}</p>
                       {set.rir != null && <p className="text-[var(--color-text-tertiary)] text-xs">{t('workouts.rir')} {set.rir}</p>}
                   </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-[var(--card-foreground)]/80 z-50 flex items-center justify-center p-6" onClick={() => setShowModal(false)}>
           <div className="bg-[var(--card)] rounded-3xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-light text-[var(--color-text-primary)] mb-4">{t('common.newExercise')}</h3>
             <input
               type="text"
               value={newExerciseName}
               onChange={(e) => setNewExerciseName(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleAddExercise()}
               placeholder={t('common.exerciseName')}
                className="w-full bg-[var(--input)] text-[var(--foreground)] rounded-2xl px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-[var(--border)]"
               autoFocus
             />
             {errorMsg && <p className="text-red-400 text-sm mb-3">{errorMsg}</p>}
             <div className="flex gap-3">
                <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-2xl bg-[var(--input)] text-[var(--color-text-primary)] font-light">{t('common.cancel')}</button>
                <button onClick={handleAddExercise} className="flex-1 py-3 rounded-2xl bg-[var(--card)] text-[var(--card-foreground)] font-light">{t('common.add')}</button>
             </div>
           </div>
         </div>
       )}

      <div className="h-20" />
    </div>
  )
}


