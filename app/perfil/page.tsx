'use client'

import { useState, useEffect, useContext } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { ThemeContext } from '../contexts/ThemeContext'
import { useTranslation } from '../contexts/LanguageContext'
import { useUnit } from '../contexts/UnitContext'
import LanguageSelector from '../components/LanguageSelector'

type UserProfile = {
  age: number | null
  height: number | null
  weight: number | null
  gender: 'm' | 'f'
}

const STRENGTH_STANDARDS: Record<string, Record<string, { m: number; f: number }>> = {
  'Press Banca': { novice: { m: 1.0, f: 0.5 }, beginner: { m: 1.2, f: 0.6 }, intermediate: { m: 1.5, f: 0.8 }, advanced: { m: 2.0, f: 1.1 }, elite: { m: 2.5, f: 1.4 }, worldclass: { m: 3.0, f: 1.7 } },
  'Sentadilles': { novice: { m: 1.2, f: 0.6 }, beginner: { m: 1.5, f: 0.8 }, intermediate: { m: 2.0, f: 1.0 }, advanced: { m: 2.5, f: 1.3 }, elite: { m: 3.0, f: 1.6 }, worldclass: { m: 3.5, f: 2.0 } },
  'Leg Press': { novice: { m: 1.5, f: 0.8 }, beginner: { m: 2.0, f: 1.0 }, intermediate: { m: 2.5, f: 1.3 }, advanced: { m: 3.0, f: 1.6 }, elite: { m: 3.5, f: 2.0 }, worldclass: { m: 4.0, f: 2.5 } },
  'Dominades': { novice: { m: 0.5, f: 0.2 }, beginner: { m: 0.8, f: 0.4 }, intermediate: { m: 1.2, f: 0.6 }, advanced: { m: 1.5, f: 0.8 }, elite: { m: 2.0, f: 1.0 }, worldclass: { m: 2.5, f: 1.2 } },
  'Lat Pulldown': { novice: { m: 0.8, f: 0.4 }, beginner: { m: 1.0, f: 0.5 }, intermediate: { m: 1.3, f: 0.7 }, advanced: { m: 1.6, f: 0.9 }, elite: { m: 2.0, f: 1.1 }, worldclass: { m: 2.4, f: 1.3 } },
  'Press Military': { novice: { m: 0.6, f: 0.3 }, beginner: { m: 0.8, f: 0.4 }, intermediate: { m: 1.0, f: 0.5 }, advanced: { m: 1.3, f: 0.7 }, elite: { m: 1.6, f: 0.9 }, worldclass: { m: 2.0, f: 1.1 } },
  'Curl de Bíceps': { novice: { m: 0.4, f: 0.2 }, beginner: { m: 0.5, f: 0.25 }, intermediate: { m: 0.7, f: 0.35 }, advanced: { m: 0.9, f: 0.5 }, elite: { m: 1.1, f: 0.6 }, worldclass: { m: 1.4, f: 0.8 } },
  'Extensiones Tricep': { novice: { m: 0.4, f: 0.2 }, beginner: { m: 0.5, f: 0.25 }, intermediate: { m: 0.7, f: 0.35 }, advanced: { m: 0.9, f: 0.5 }, elite: { m: 1.1, f: 0.6 }, worldclass: { m: 1.3, f: 0.7 } },
  'French Press': { novice: { m: 0.3, f: 0.15 }, beginner: { m: 0.4, f: 0.2 }, intermediate: { m: 0.5, f: 0.25 }, advanced: { m: 0.7, f: 0.35 }, elite: { m: 0.9, f: 0.45 }, worldclass: { m: 1.1, f: 0.55 } },
  'Zancadas': { novice: { m: 0.8, f: 0.4 }, beginner: { m: 1.0, f: 0.5 }, intermediate: { m: 1.3, f: 0.7 }, advanced: { m: 1.6, f: 0.9 }, elite: { m: 2.0, f: 1.1 }, worldclass: { m: 2.4, f: 1.3 } },
}

const LEVELS = [
  { key: 'novice', color: '#666' },
  { key: 'beginner', color: '#22c55e' },
  { key: 'intermediate', color: '#3b82f6' },
  { key: 'advanced', color: '#a855f7' },
  { key: 'elite', color: '#f97316' },
  { key: 'worldclass', color: '#ef4444' },
] as const

type ExerciseLevel = { exercise: string; level: string; levelColor: string; oneRM: number }
type FavoriteRoutine = { id: string; name: string; description?: string }
type DeletedRoutine = { id: string; name: string; description?: string; exercises: { exercise: string; sets_target: number; reps_min: number; reps_max: number; order_index: number }[]; deletedAt: string }

export default function PerfilPage() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const { t } = useTranslation()
  const { unit, setUnit, toKg, format } = useUnit()
  const themeContext = useContext(ThemeContext)
  const theme = themeContext?.theme ?? 'dark'
  const toggleTheme = themeContext?.toggleTheme ?? (() => {})
  const [age, setAge] = useState<string>('')
  const [height, setHeight] = useState<string>('')
  const [weight, setWeight] = useState<string>('')
  const [gender, setGender] = useState<'m' | 'f'>('m')
  const [saved, setSaved] = useState(false)
  const [exerciseLevels, setExerciseLevels] = useState<ExerciseLevel[]>([])
  const [overallLevel, setOverallLevel] = useState<string>('')
  const [favoriteRoutines, setFavoriteRoutines] = useState<FavoriteRoutine[]>([])
  const [deletedRoutines, setDeletedRoutines] = useState<DeletedRoutine[]>([])
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null)

  useEffect(() => { loadProfile() }, [unit])
  useEffect(() => { if (weight) calculateLevels() }, [weight, gender, user])
  useEffect(() => { if (user) loadFavoritesAndDeleted() }, [user])

  function loadProfile() {
    const saved = localStorage.getItem('user_profile')
    if (saved) {
      const p: UserProfile = JSON.parse(saved)
      setAge(p.age?.toString() || '')
      setHeight(p.height?.toString() || '')
      setWeight(p.weight != null ? format(p.weight) : '')
      setGender(p.gender || 'm')
    }
  }

  function saveProfile() {
    const wInput = parseFloat(weight)
    localStorage.setItem('user_profile', JSON.stringify({
      age: parseInt(age) || null,
      height: parseFloat(height) || null,
      weight: isNaN(wInput) ? null : toKg(wInput),
      gender,
    }))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function calculateLevels() {
    if (!user) return
    const wInput = parseFloat(weight)
    const w = isNaN(wInput) ? 70 : toKg(wInput)
    supabase.from('workout_logs').select('exercise, weight, reps, one_rm')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }).then(({ data: logs }) => {
        if (!logs) return
        const best: Record<string, { weight: number; reps: number; oneRM: number }> = {}
        logs.forEach(l => {
          if (!best[l.exercise] || (l.one_rm || 0) > best[l.exercise].oneRM) {
            best[l.exercise] = { weight: l.weight, reps: l.reps, oneRM: l.one_rm || 0 }
          }
        })

        const levels: ExerciseLevel[] = Object.entries(best).map(([ex, d]) => {
          const std = STRENGTH_STANDARDS[ex]
          if (!std) return null
          const ratio = d.oneRM / w
          const stdg = gender === 'm' 
            ? { worldclass: std.worldclass.m, elite: std.elite.m, advanced: std.advanced.m, intermediate: std.intermediate.m, beginner: std.beginner.m, novice: std.novice.m }
            : { worldclass: std.worldclass.f, elite: std.elite.f, advanced: std.advanced.f, intermediate: std.intermediate.f, beginner: std.beginner.f, novice: std.novice.f }
          let level = 'novice'
          if (ratio >= stdg.worldclass) level = 'worldclass'
          else if (ratio >= stdg.elite) level = 'elite'
          else if (ratio >= stdg.advanced) level = 'advanced'
          else if (ratio >= stdg.intermediate) level = 'intermediate'
          else if (ratio >= stdg.beginner) level = 'beginner'
          const lv = LEVELS.find(l => l.key === level)
          return { exercise: ex, level, levelColor: lv?.color || '#666', oneRM: d.oneRM }
        }).filter(Boolean) as ExerciseLevel[]

        setExerciseLevels(levels.sort((a, b) => (LEVELS.findIndex(l => l.key === b.level)) - (LEVELS.findIndex(l => l.key === a.level))))

        if (levels.length) {
          const avgPct = levels.reduce((s, l) => s + (LEVELS.findIndex(x => x.key === l.level) + 1) * 17, 0) / levels.length
          if (avgPct > 80) setOverallLevel('worldclass')
          else if (avgPct > 65) setOverallLevel('elite')
          else if (avgPct > 50) setOverallLevel('advanced')
          else if (avgPct > 35) setOverallLevel('intermediate')
          else if (avgPct > 20) setOverallLevel('beginner')
          else setOverallLevel('novice')
        }
      })
  }

  async function loadFavoritesAndDeleted() {
    if (!user) return
    const favIds: string[] = JSON.parse(localStorage.getItem('favorite_routine_ids') || '[]')
    if (favIds.length > 0) {
      const { data } = await supabase.from('routines').select('id, name, description').in('id', favIds).eq('user_id', user.id)
      setFavoriteRoutines(data || [])
    } else {
      setFavoriteRoutines([])
    }
    const deleted: DeletedRoutine[] = JSON.parse(localStorage.getItem('deleted_routines') || '[]')
    setDeletedRoutines(deleted)
  }

  async function handleRestoreRoutine(dr: DeletedRoutine) {
    if (!user) return
    const { data: newRoutine, error } = await supabase
      .from('routines')
      .insert({ user_id: user.id, name: dr.name, description: dr.description || '' })
      .select()
      .single()
    if (error || !newRoutine) return

    for (let i = 0; i < dr.exercises.length; i++) {
      const ex = dr.exercises[i]
      const { data: newEx } = await supabase
        .from('routine_exercises')
        .insert({ routine_id: newRoutine.id, exercise: ex.exercise, sets_target: ex.sets_target, reps_min: ex.reps_min, reps_max: ex.reps_max, order_index: i })
        .select()
        .single()
      if (newEx) {
        const sets = Array.from({ length: ex.sets_target }, (_, k) => ({ routine_exercise_id: newEx.id, set_number: k + 1, completed: false }))
        await supabase.from('routine_sets').insert(sets)
      }
    }

    const remaining = deletedRoutines.filter(d => d.id !== dr.id)
    setDeletedRoutines(remaining)
    localStorage.setItem('deleted_routines', JSON.stringify(remaining))
    setRestoreMsg(t('routines.restored'))
    setTimeout(() => setRestoreMsg(null), 3000)
  }

  const levelColor = LEVELS.find(l => l.key === overallLevel)?.color || '#666'

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-xl font-medium tracking-tight mb-8 bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">{t('perfil.title')}</h1>
          <p className="text-zinc-500 mb-8">{t('perfil.loginRequired')}</p>
           <a href="/login" className="inline-block py-4 px-8 rounded-2xl font-medium bg-[var(--color-text-primary)] text-[var(--color-bg-primary)] hover:opacity-90 transition-colors">
             {t('perfil.enter')}
           </a>
         </div>
       </div>
     )
   }

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
       <div className="px-6 pt-8 pb-4 max-w-2xl mx-auto">
          <h1 className="text-xl font-medium tracking-tight bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">{t('perfil.title')}</h1>
          {overallLevel && (
            <p className="mt-1 text-sm" style={{ color: levelColor }}>{t(`level.${overallLevel}`)}</p>
          )}
        </div>

     <div className="px-6 space-y-6 max-w-2xl mx-auto animate-slide-up">
          {exerciseLevels.length > 0 && (
          <div>
             <p className="section-label mb-3">{t('perfil.byExercise')}</p>
             <div className="space-y-1">
               {exerciseLevels.map((ex) => (
                 <div key={ex.exercise} className="flex justify-between items-center py-3 px-3 rounded-xl hover:bg-[var(--surface)] transition-colors">
                   <span className="font-light text-[var(--color-text-primary)] truncate">{ex.exercise}</span>
                   <span className="text-xs px-2.5 py-1 rounded-full flex-shrink-0 ml-3" style={{ backgroundColor: ex.levelColor + '22', color: ex.levelColor }}>{t(`level.${ex.level}`)}</span>
                 </div>
               ))}
              </div>
            </div>
          )}

          <div>
            <p className="section-label mb-3">{t('perfil.data')}</p>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 <input
                   type="text"
                   inputMode="numeric"
                   value={age}
                   onChange={(e) => setAge(e.target.value)}
                   placeholder={t('perfil.age')}
                   className="bg-[var(--surface-strong)] text-[var(--color-text-primary)] text-sm rounded-xl px-4 py-3 border border-transparent focus:outline-none focus:border-[var(--border)]"
                 />
                 <div className="flex gap-2">
                   <button
                     onClick={() => setGender('m')}
                     className={`flex-1 py-3 rounded-xl text-sm transition-colors ${
                       gender === 'm'
                         ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-primary)]'
                         : 'bg-[var(--surface-strong)] text-[var(--color-text-secondary)] hover:bg-[var(--surface-hover)]'
                     }`}
                   >
                     {t('perfil.male')}
                   </button>
                   <button
                     onClick={() => setGender('f')}
                     className={`flex-1 py-3 rounded-xl text-sm transition-colors ${
                       gender === 'f'
                         ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-primary)]'
                         : 'bg-[var(--surface-strong)] text-[var(--color-text-secondary)] hover:bg-[var(--surface-hover)]'
                     }`}
                   >
                     {t('perfil.female')}
                   </button>
                 </div>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 <input
                   type="text"
                   inputMode="numeric"
                   value={height}
                   onChange={(e) => setHeight(e.target.value)}
                   placeholder={t('perfil.heightCm')}
                   className="bg-[var(--surface-strong)] text-[var(--color-text-primary)] text-sm rounded-xl px-4 py-3 border border-transparent focus:outline-none focus:border-[var(--border)]"
                 />
                 <input
                   type="text"
                   inputMode="numeric"
                   value={weight}
                   onChange={(e) => setWeight(e.target.value)}
                   placeholder={`${t('perfil.weightLabel')} (${unit})`}
                   className="bg-[var(--surface-strong)] text-[var(--color-text-primary)] text-sm rounded-xl px-4 py-3 border border-transparent focus:outline-none focus:border-[var(--border)]"
                 />
               </div>
             </div>
             <button
               onClick={saveProfile}
               type="button"
               className="w-full mt-4 py-4 rounded-2xl font-medium bg-[var(--color-text-primary)] text-[var(--color-bg-primary)] hover:opacity-90 transition-opacity"
             >
               {saved ? `✓ ${t('perfil.saved')}` : t('perfil.save')}
             </button>
          </div>

          <div>
            <p className="section-label mb-3">{t('perfil.scale')}</p>
           <div className="flex flex-wrap gap-1.5">
             {LEVELS.map((l) => (
               <span key={l.key} className="px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ backgroundColor: l.color + '22', color: l.color }}>
                 {t(`level.${l.key}`)}
               </span>
             ))}
           </div>
         </div>

          {(favoriteRoutines.length > 0 || deletedRoutines.length > 0) && (
            <div>
              <p className="section-label mb-3">{t('routines.favoriteRoutines')}</p>
              {favoriteRoutines.length === 0 ? (
                <p className="text-[var(--color-text-tertiary)] text-sm py-1">{t('routines.noFavorites')}</p>
              ) : (
                <div className="space-y-1 mb-4">
                  {favoriteRoutines.map(r => (
                    <div key={r.id} className="flex items-center gap-2 py-2.5 px-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                      <span className="text-yellow-400 text-base flex-shrink-0">★</span>
                      <span className="text-[var(--color-text-primary)] text-sm font-light truncate">{r.name}</span>
                    </div>
                  ))}
                </div>
              )}
              {deletedRoutines.length > 0 && (
                <>
                  <p className="section-label mb-2 mt-3">{t('routines.deletedRoutines')}</p>
                  <div className="space-y-1">
                    {deletedRoutines.map(dr => (
                      <div key={dr.id + dr.deletedAt} className="flex items-center justify-between gap-2 py-2.5 px-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                        <div className="min-w-0">
                          <p className="text-[var(--color-text-primary)] text-sm font-light truncate">{dr.name}</p>
                          <p className="text-[var(--color-text-tertiary)] text-xs">{t('routines.exercisesCount', { count: String(dr.exercises.length) })}</p>
                        </div>
                        <button
                          onClick={() => handleRestoreRoutine(dr)}
                          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-text-primary)] text-[var(--color-bg-primary)] hover:opacity-90 transition-opacity"
                        >
                          {t('routines.restore')}
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {restoreMsg && (
                <p className="text-sm mt-2" style={{ color: 'var(--accent-success)' }}>{restoreMsg}</p>
              )}
            </div>
          )}

          <div>
            <p className="section-label mb-3">{t('preferences.title')}</p>
            <div className="card-surface divide-y divide-[var(--border)]">
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-sm font-light text-[var(--color-text-primary)]">{t('nav.language')}</span>
                <LanguageSelector />
              </div>
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-sm font-light text-[var(--color-text-primary)]">{t(theme === 'dark' ? 'nav.theme_light' : 'nav.theme_dark')}</span>
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface-strong)] text-sm text-[var(--color-text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                  aria-label={t(theme === 'dark' ? 'nav.theme_light' : 'nav.theme_dark')}
                >
                  <span className="text-base leading-none">{theme === 'dark' ? '☀️' : '🌙'}</span>
                  <span className="text-xs uppercase tracking-wider">{theme === 'dark' ? 'Light' : 'Dark'}</span>
                </button>
              </div>
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-sm font-light text-[var(--color-text-primary)]">{t('preferences.weightUnit')}</span>
                <div className="flex bg-[var(--surface-strong)] rounded-lg overflow-hidden p-0.5">
                  <button
                    onClick={() => setUnit('kg')}
                    className={`px-3 py-1.5 text-xs uppercase tracking-wider rounded-md transition-colors ${
                      unit === 'kg'
                        ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-primary)]'
                        : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
                    }`}
                  >
                    kg
                  </button>
                  <button
                    onClick={() => setUnit('lb')}
                    className={`px-3 py-1.5 text-xs uppercase tracking-wider rounded-md transition-colors ${
                      unit === 'lb'
                        ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-primary)]'
                        : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
                    }`}
                  >
                    lb
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={async () => { await signOut(); router.replace('/login') }}
            className="w-full py-3 rounded-2xl text-sm font-light transition-colors"
            style={{ color: 'var(--accent-danger)', backgroundColor: 'color-mix(in srgb, var(--accent-danger) 10%, transparent)' }}
          >
            {t('nav.logout')}
          </button>
       </div>

       <div className="h-20" />
     </div>
  )
}
