'use client'

import { useState, useEffect, useContext, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { ThemeContext } from '../contexts/ThemeContext'
import { useTranslation } from '../contexts/LanguageContext'
import { useUnit } from '../contexts/UnitContext'
import LanguageSelector from '../components/LanguageSelector'
import { getBaseExercise, getVariantFromFullName, isVariantUnilateral } from '@/types'

// ── Paleta d'elit ────────────────────────────────────────────
const C = {
  bg:      '#090707',
  surface: '#141111',
  border:  '#262020',
  text:    '#F5F5F3',
  muted:   '#5C5757',
  faint:   '#1E1A1A',
  accent:  '#ffff3f',
  danger:  '#FF4444',
} as const

type UserProfile = {
  age: number | null
  height: number | null
  weight: number | null
  gender: 'm' | 'f'
}

const STRENGTH_STANDARDS: Record<string, Record<string, { m: number; f: number }>> = {
  'Press Banca':     { novice: { m: 1.0, f: 0.5 }, beginner: { m: 1.2, f: 0.6 }, intermediate: { m: 1.5, f: 0.8 }, advanced: { m: 2.0, f: 1.1 }, elite: { m: 2.5, f: 1.4 }, worldclass: { m: 3.0, f: 1.7 } },
  'Sentadilles':     { novice: { m: 1.2, f: 0.6 }, beginner: { m: 1.5, f: 0.8 }, intermediate: { m: 2.0, f: 1.0 }, advanced: { m: 2.5, f: 1.3 }, elite: { m: 3.0, f: 1.6 }, worldclass: { m: 3.5, f: 2.0 } },
  'Leg Press':       { novice: { m: 1.5, f: 0.8 }, beginner: { m: 2.0, f: 1.0 }, intermediate: { m: 2.5, f: 1.3 }, advanced: { m: 3.0, f: 1.6 }, elite: { m: 3.5, f: 2.0 }, worldclass: { m: 4.0, f: 2.5 } },
  'Dominades':       { novice: { m: 1.0, f: 0.8 }, beginner: { m: 1.1, f: 0.9 }, intermediate: { m: 1.3, f: 1.1 }, advanced: { m: 1.5, f: 1.3 }, elite: { m: 1.8, f: 1.5 }, worldclass: { m: 2.2, f: 1.8 } },
  'Flexions':        { novice: { m: 1.0, f: 0.8 }, beginner: { m: 1.2, f: 1.0 }, intermediate: { m: 1.5, f: 1.2 }, advanced: { m: 1.8, f: 1.4 }, elite: { m: 2.2, f: 1.7 }, worldclass: { m: 2.8, f: 2.0 } },
  'Dips':            { novice: { m: 1.0, f: 0.7 }, beginner: { m: 1.2, f: 0.9 }, intermediate: { m: 1.5, f: 1.1 }, advanced: { m: 1.8, f: 1.3 }, elite: { m: 2.2, f: 1.6 }, worldclass: { m: 2.7, f: 1.9 } },
  'Lat Pulldown':    { novice: { m: 0.8, f: 0.4 }, beginner: { m: 1.0, f: 0.5 }, intermediate: { m: 1.3, f: 0.7 }, advanced: { m: 1.6, f: 0.9 }, elite: { m: 2.0, f: 1.1 }, worldclass: { m: 2.4, f: 1.3 } },
  'Press Military':  { novice: { m: 0.6, f: 0.3 }, beginner: { m: 0.8, f: 0.4 }, intermediate: { m: 1.0, f: 0.5 }, advanced: { m: 1.3, f: 0.7 }, elite: { m: 1.6, f: 0.9 }, worldclass: { m: 2.0, f: 1.1 } },
  'Curl de Bíceps':  { novice: { m: 0.4, f: 0.2 }, beginner: { m: 0.5, f: 0.25 }, intermediate: { m: 0.7, f: 0.35 }, advanced: { m: 0.9, f: 0.5 }, elite: { m: 1.1, f: 0.6 }, worldclass: { m: 1.4, f: 0.8 } },
  'Extensió Tríceps':{ novice: { m: 0.4, f: 0.2 }, beginner: { m: 0.5, f: 0.25 }, intermediate: { m: 0.7, f: 0.35 }, advanced: { m: 0.9, f: 0.5 }, elite: { m: 1.1, f: 0.6 }, worldclass: { m: 1.3, f: 0.7 } },
  'Zancades':        { novice: { m: 0.8, f: 0.4 }, beginner: { m: 1.0, f: 0.5 }, intermediate: { m: 1.3, f: 0.7 }, advanced: { m: 1.6, f: 0.9 }, elite: { m: 2.0, f: 1.1 }, worldclass: { m: 2.4, f: 1.3 } },
  'Extensiones Tricep': { novice: { m: 0.4, f: 0.2 }, beginner: { m: 0.5, f: 0.25 }, intermediate: { m: 0.7, f: 0.35 }, advanced: { m: 0.9, f: 0.5 }, elite: { m: 1.1, f: 0.6 }, worldclass: { m: 1.3, f: 0.7 } },
  'French Press':       { novice: { m: 0.3, f: 0.15 }, beginner: { m: 0.4, f: 0.2 }, intermediate: { m: 0.5, f: 0.25 }, advanced: { m: 0.7, f: 0.35 }, elite: { m: 0.9, f: 0.45 }, worldclass: { m: 1.1, f: 0.55 } },
  'Zancadas':           { novice: { m: 0.8, f: 0.4 }, beginner: { m: 1.0, f: 0.5 }, intermediate: { m: 1.3, f: 0.7 }, advanced: { m: 1.6, f: 0.9 }, elite: { m: 2.0, f: 1.1 }, worldclass: { m: 2.4, f: 1.3 } },
}

const LEVELS = [
  { key: 'novice',       color: '#555555' },
  { key: 'beginner',     color: '#22c55e' },
  { key: 'intermediate', color: '#3b82f6' },
  { key: 'advanced',     color: '#a855f7' },
  { key: 'elite',        color: '#f97316' },
  { key: 'worldclass',   color: '#ef4444' },
] as const

const LEVEL_TO_NUM: Record<string, number> = {
  novice: 1, beginner: 2, intermediate: 3, advanced: 4, elite: 5, worldclass: 6,
}

type ExerciseLevel = { exercise: string; level: string; levelColor: string; oneRM: number; isUnilateral?: boolean }
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
  const [heightUnit, setHeightUnitState] = useState<'cm' | 'ftin'>('cm')
  const [age, setAge] = useState<string>('')
  const [height, setHeight] = useState<string>('')
  const [heightFt, setHeightFt] = useState<string>('')
  const [heightIn, setHeightIn] = useState<string>('')
  const [weight, setWeight] = useState<string>('')
  const [gender, setGender] = useState<'m' | 'f'>('m')
  const [saved, setSaved] = useState(false)
  const [exerciseLevels, setExerciseLevels] = useState<ExerciseLevel[]>([])
  const [overallLevel, setOverallLevel] = useState<string>('')
  const [overallAvgPct, setOverallAvgPct] = useState<number>(0)
  const [streak, setStreak] = useState<number>(0)
  const [scheduledDaysCount, setScheduledDaysCount] = useState<number>(0)
  const [favoriteRoutines, setFavoriteRoutines] = useState<FavoriteRoutine[]>([])
  const [deletedRoutines, setDeletedRoutines] = useState<DeletedRoutine[]>([])
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null)
  const [showFavorites, setShowFavorites] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)
  const [username, setUsername] = useState('')
  const [editingUsername, setEditingUsername] = useState(false)
  const [usernameInput, setUsernameInput] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [savingUsername, setSavingUsername] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const savedUnit = localStorage.getItem('height_unit') as 'cm' | 'ftin'
    if (savedUnit === 'cm' || savedUnit === 'ftin') setHeightUnitState(savedUnit)
  }, [])

  useEffect(() => { loadProfile() }, [unit, heightUnit])
  useEffect(() => { if (weight) calculateLevels() }, [weight, gender, user])
  useEffect(() => { if (user) { loadFavoritesAndDeleted(); calculateStreak(); loadUserProfile() } }, [user])

  function setHeightUnit(u: 'cm' | 'ftin') {
    if (u === 'ftin' && height) {
      const cm = parseFloat(height)
      if (!isNaN(cm)) {
        const totalInches = cm / 2.54
        setHeightFt(Math.floor(totalInches / 12).toString())
        setHeightIn(Math.round(totalInches % 12).toString())
      }
    } else if (u === 'cm' && (heightFt || heightIn)) {
      const ft = parseInt(heightFt) || 0
      const inches = parseInt(heightIn) || 0
      const cm = Math.round((ft * 12 + inches) * 2.54)
      setHeight(cm.toString())
    }
    setHeightUnitState(u)
    localStorage.setItem('height_unit', u)
  }

  function loadProfile() {
    const saved = localStorage.getItem('user_profile')
    if (saved) {
      const p: UserProfile = JSON.parse(saved)
      setAge(p.age?.toString() || '')
      const currentHeightUnit = (localStorage.getItem('height_unit') as 'cm' | 'ftin') || 'cm'
      if (p.height != null) {
        if (currentHeightUnit === 'ftin') {
          const totalInches = p.height / 2.54
          setHeightFt(Math.floor(totalInches / 12).toString())
          setHeightIn(Math.round(totalInches % 12).toString())
        } else {
          setHeight(p.height.toString())
        }
      }
      setWeight(p.weight != null ? format(p.weight) : '')
      setGender(p.gender || 'm')
    }
  }

  function saveProfile() {
    const wInput = parseFloat(weight)
    let heightCm: number | null = null
    if (heightUnit === 'ftin') {
      const ft = parseInt(heightFt) || 0
      const inches = parseInt(heightIn) || 0
      if (ft > 0 || inches > 0) heightCm = Math.round((ft * 12 + inches) * 2.54)
    } else {
      heightCm = parseFloat(height) || null
    }
    localStorage.setItem('user_profile', JSON.stringify({
      age: parseInt(age) || null,
      height: heightCm,
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

        const best: Record<string, { weight: number; reps: number; oneRM: number; fullName: string }> = {}
        logs.forEach(l => {
          const base = getBaseExercise(l.exercise)
          if (!best[base] || (l.one_rm || 0) > best[base].oneRM) {
            best[base] = { weight: l.weight, reps: l.reps, oneRM: l.one_rm || 0, fullName: l.exercise }
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
          const variant = getVariantFromFullName(d.fullName)
          const isUnilateral = variant ? isVariantUnilateral(ex, variant) : false
          return { exercise: ex, level, levelColor: lv?.color || '#555', oneRM: d.oneRM, isUnilateral }
        }).filter(Boolean) as ExerciseLevel[]

        setExerciseLevels(levels.sort((a, b) => (LEVELS.findIndex(l => l.key === b.level)) - (LEVELS.findIndex(l => l.key === a.level))))

        if (levels.length) {
          const avgPct = levels.reduce((s, l) => s + (LEVELS.findIndex(x => x.key === l.level) + 1) * 17, 0) / levels.length
          setOverallAvgPct(Math.min(Math.round(avgPct), 100))
          if (avgPct > 80) setOverallLevel('worldclass')
          else if (avgPct > 65) setOverallLevel('elite')
          else if (avgPct > 50) setOverallLevel('advanced')
          else if (avgPct > 35) setOverallLevel('intermediate')
          else if (avgPct > 20) setOverallLevel('beginner')
          else setOverallLevel('novice')
        }
      })
  }

  async function calculateStreak() {
    if (!user) return
    const { data: logs } = await supabase
      .from('workout_logs')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!logs || logs.length === 0) { setStreak(0); return }

    // Build set of trained day-strings "YYYY-MM-DD"
    const trainedDays = new Set(logs.map(l => l.created_at.slice(0, 10)))

    // Read scheduled days from localStorage: { routineId: number[] } where 0=Sun..6=Sat
    const routineDaysRaw = localStorage.getItem('routine_days')
    const routineDaysMap: Record<string, number[]> = routineDaysRaw ? JSON.parse(routineDaysRaw) : {}
    const allScheduled = new Set<number>()
    Object.values(routineDaysMap).forEach(days => days.forEach(d => allScheduled.add(d)))

    if (allScheduled.size === 0) {
      // Legacy mode: no schedule set — classic consecutive-day streak
      const uniqueDateMs = [...new Set(logs.map(l => {
        const d = new Date(l.created_at)
        d.setHours(0, 0, 0, 0)
        return d.getTime()
      }))].sort((a, b) => b - a)
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const todayMs = today.getTime(); const dayMs = 86400000
      if (uniqueDateMs[0] < todayMs - dayMs) { setStreak(0); return }
      let s = 0; let exp = uniqueDateMs[0] === todayMs ? todayMs : todayMs - dayMs
      for (const ms of uniqueDateMs) {
        if (ms === exp) { s++; exp -= dayMs } else if (ms < exp) break
      }
      setStreak(s)
      return
    }

    setScheduledDaysCount(allScheduled.size)

    // Smart mode: walk backwards day by day; skip unscheduled days silently
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const dayMs = 86400000
    let sessions = 0
    let cursor = new Date(today)
    const maxLookback = 365

    for (let i = 0; i < maxLookback; i++) {
      const dayOfWeek = cursor.getDay() // 0=Sun..6=Sat
      const dateStr = cursor.toISOString().slice(0, 10)
      const isScheduled = allScheduled.has(dayOfWeek)

      if (!isScheduled) {
        // Rest day — skip silently
        cursor = new Date(cursor.getTime() - dayMs)
        continue
      }

      if (trainedDays.has(dateStr)) {
        sessions++
        cursor = new Date(cursor.getTime() - dayMs)
        continue
      }

      // Scheduled day was missed
      // Grace: if it's today and not yet completed, don't break
      if (i === 0) {
        cursor = new Date(cursor.getTime() - dayMs)
        continue
      }
      break
    }

    setStreak(sessions)
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

  async function loadUserProfile() {
    if (!user) return
    const { data, error } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', user.id)
      .single()
    if (data) {
      setUsername(data.username || '')
      setAvatarUrl(data.avatar_url || null)
    } else if (error) {
      // avatar_url column might not exist yet — fallback to username only
      const { data: basic } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()
      if (basic) setUsername(basic.username || '')
    }
  }

  async function handleSaveUsername() {
    const trimmed = usernameInput.trim()
    if (!trimmed) return
    if (trimmed === username) { setEditingUsername(false); return }
    setSavingUsername(true)
    setUsernameError('')

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', trimmed)
      .neq('id', user!.id)
      .maybeSingle()

    if (existing) {
      setUsernameError('Aquest nom d\'usuari ja existeix')
      setSavingUsername(false)
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({ username: trimmed })
      .eq('id', user!.id)

    if (!error) {
      setUsername(trimmed)
      setEditingUsername(false)
    } else {
      console.error('Profile update error:', error)
      if (error.code === '42501' || error.message?.includes('policy')) {
        setUsernameError('Falta permís RLS — executa el SQL de configuració')
      } else {
        setUsernameError(error.message || 'Error en desar')
      }
    }
    setSavingUsername(false)
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingAvatar(true)

    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${user.id}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      console.error('Avatar upload error:', uploadError)
    } else {
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(path)
      const url = `${urlData.publicUrl}?t=${Date.now()}`
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', user.id)
      if (!updateError) setAvatarUrl(url)
      else console.error('Avatar url save error:', updateError)
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
    setUploadingAvatar(false)
  }

  const levelColor = LEVELS.find(l => l.key === overallLevel)?.color || C.muted
  const lvlNum = LEVEL_TO_NUM[overallLevel] || 1
  const xpPct = overallAvgPct > 0 ? overallAvgPct : Math.round((lvlNum / 6) * 100)

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6"
           style={{ backgroundColor: C.bg, color: C.text }}>
        <div className="text-center space-y-6 max-w-sm">
          <h1 className="text-2xl font-black tracking-tight" style={{ color: C.accent }}>
            {t('perfil.title')}
          </h1>
          <p className="text-sm" style={{ color: C.muted }}>{t('perfil.loginRequired')}</p>
          <a href="/login"
             className="inline-block py-4 px-8 rounded-2xl font-black text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
             style={{ backgroundColor: C.accent, color: C.bg }}>
            {t('perfil.enter')}
          </a>
        </div>
      </div>
    )
  }

  const userCode = `#${user.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.bg, color: C.text }}>

      {/* ── Header RPG ── */}
      <div className="px-6 pt-10 pb-2 max-w-2xl mx-auto">
        <div className="flex items-start gap-4">

          {/* Avatar + badge LVL + upload */}
          <div className="relative flex-shrink-0">
            <label className="cursor-pointer block" title="Canvia la foto de perfil">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center text-2xl font-black select-none relative"
                   style={{
                     backgroundColor: C.surface,
                     border: streak > 0 ? `1px solid ${C.accent}55` : `1px solid ${C.border}`,
                     color: C.accent,
                     boxShadow: streak > 0 ? `0 0 18px ${C.accent}22` : 'none',
                   }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  : (user.email?.[0] || '?').toUpperCase()
                }
                {uploadingAvatar && (
                  <div className="absolute inset-0 flex items-center justify-center"
                       style={{ backgroundColor: '#00000099' }}>
                    <span className="text-xs font-black" style={{ color: C.accent }}>…</span>
                  </div>
                )}
                {/* Overlay càmera en hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                     style={{ backgroundColor: '#00000077' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </div>
              </div>
            </label>
            <div className="absolute -bottom-1.5 -right-1.5 text-[10px] font-black px-1.5 py-0.5 rounded-md tabular-nums"
                 style={{ backgroundColor: C.accent, color: C.bg }}>
              LVL {lvlNum}
            </div>
          </div>

          {/* Nom + ID permanent + nivell + barra XP */}
          <div className="flex-1 min-w-0 pt-0.5">

            {/* Username editable */}
            {editingUsername ? (
              <div className="space-y-1.5 mb-1">
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={usernameInput}
                    onChange={e => { setUsernameInput(e.target.value); setUsernameError('') }}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveUsername(); if (e.key === 'Escape') setEditingUsername(false) }}
                    className="flex-1 text-sm font-black rounded-xl px-3 py-1.5 outline-none"
                    style={{ backgroundColor: C.surface, color: C.text, border: `1px solid ${C.accent}66` }}
                    maxLength={30}
                  />
                  <button
                    onClick={handleSaveUsername}
                    disabled={savingUsername || !usernameInput.trim()}
                    className="px-3 py-1.5 rounded-xl text-xs font-black transition-all disabled:opacity-40"
                    style={{ backgroundColor: C.accent, color: C.bg }}
                  >
                    {savingUsername ? '…' : '✓'}
                  </button>
                  <button
                    onClick={() => { setEditingUsername(false); setUsernameError('') }}
                    className="px-3 py-1.5 rounded-xl text-xs font-black transition-all hover:opacity-75"
                    style={{ backgroundColor: C.surface, color: C.muted, border: `1px solid ${C.border}` }}
                  >
                    ✕
                  </button>
                </div>
                {usernameError && (
                  <p className="text-[11px] font-black" style={{ color: '#FF4444' }}>{usernameError}</p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-xl font-black truncate" style={{ color: C.text }}>
                  {username || user.email?.split('@')[0]}
                </h1>
                <button
                  onClick={() => { setUsernameInput(username || user.email?.split('@')[0] || ''); setEditingUsername(true) }}
                  className="flex-shrink-0 transition-all hover:opacity-75"
                  style={{ color: C.muted }}
                  aria-label="Editar nom d'usuari"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              </div>
            )}

            {/* Codi permanent */}
            <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: C.muted }}>
              {userCode}
            </p>

            {overallLevel && (
              <p className="text-[11px] uppercase tracking-widest font-black" style={{ color: C.accent }}>
                {t(`level.${overallLevel}`)}
              </p>
            )}
            <div className="mt-2.5">
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: C.border }}>
                <div className="h-full rounded-full transition-all duration-1000 ease-out"
                     style={{
                       width: `${xpPct}%`,
                       backgroundColor: C.accent,
                       boxShadow: `0 0 8px ${C.accent}80`,
                     }} />
              </div>
              <p className="text-[10px] mt-1 tabular-nums" style={{ color: C.muted }}>
                {xpPct}% XP · {t('perfil.toLevel')} {Math.min(lvlNum + 1, 6)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pt-6 space-y-4 max-w-2xl mx-auto">

        {/* ── STREAK — Rei de la Pantalla ── */}
        <div className="relative overflow-hidden rounded-2xl p-6 streak-pulse"
             style={{
               backgroundColor: C.surface,
               border: `1px solid ${C.accent}44`,
             }}>

          {/* Radial glow pulsant */}
          <div className="absolute inset-0 rounded-2xl animate-pulse pointer-events-none"
               style={{ background: `radial-gradient(ellipse at 50% -20%, ${C.accent}1C 0%, transparent 65%)` }} />

          {/* Línia superior accent 2px */}
          <div className="absolute top-0 left-0 right-0 h-[2px] pointer-events-none"
               style={{ background: `linear-gradient(90deg, transparent, ${C.accent}, transparent)` }} />

          {/* Corner glow decoratiu */}
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full pointer-events-none"
               style={{ background: `radial-gradient(circle, ${C.accent}0B 0%, transparent 65%)` }} />

          <div className="relative z-10 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-widest font-black mb-3"
                 style={{ color: C.accent }}>
                ⚡ {t('perfil.streakTitle')}
              </p>
              <p className="text-9xl font-black leading-none tabular-nums" style={{ color: C.text }}>
                {streak}
              </p>
              <p className="text-sm mt-2 font-medium" style={{ color: C.muted }}>
                {scheduledDaysCount > 0
                  ? t('perfil.streakSessions')
                  : streak === 1 ? t('perfil.streakDay') : t('perfil.streakDays')}
              </p>
              {scheduledDaysCount > 0 && (
                <p className="text-[10px] mt-1 font-black uppercase tracking-widest tabular-nums"
                   style={{ color: C.accent + 'BB' }}>
                  {t('perfil.daysPerWeek', { count: String(scheduledDaysCount) })}
                </p>
              )}
            </div>
            <p className="text-[7rem] select-none leading-none mb-1 flex-shrink-0" style={{ opacity: 0.05 }}>🔥</p>
          </div>
        </div>

        {/* ── BENTO GRID — Nivell + Exercicis ── */}
        {(overallLevel || exerciseLevels.length > 0) && (
          <div className="grid grid-cols-3 gap-3">

            {/* Nivell global — 2/3 */}
            <div className="col-span-2 rounded-2xl p-4 relative overflow-hidden"
                 style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
              {/* Color wash del nivell actual */}
              <div className="absolute inset-0 pointer-events-none rounded-2xl"
                   style={{ background: `linear-gradient(135deg, ${levelColor}0A 0%, transparent 55%)` }} />
              <div className="relative">
                <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: C.muted }}>
                  {t('perfil.overallLevel')}
                </p>
                <p className="text-2xl font-black" style={{ color: levelColor }}>
                  {overallLevel ? t(`level.${overallLevel}`) : '—'}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {LEVELS.map((l) => (
                    <span key={l.key}
                          className="px-2 py-0.5 rounded-full text-[10px] font-black"
                          style={{
                            backgroundColor: l.color + '18',
                            color: l.color,
                            border: overallLevel === l.key ? `1px solid ${l.color}55` : '1px solid transparent',
                          }}>
                      {t(`level.${l.key}`)}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Exercicis analitzats — 1/3 */}
            <div className="col-span-1 rounded-2xl p-4 flex flex-col justify-between"
                 style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
              <p className="text-[10px] uppercase tracking-widest" style={{ color: C.muted }}>
                {t('perfil.exercises')}
              </p>
              <p className="text-4xl font-black tabular-nums" style={{ color: C.accent }}>
                {exerciseLevels.length}
              </p>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>
                {t('perfil.exercisesAnalyzed')}
              </p>
            </div>
          </div>
        )}

        {/* ── Llista exercicis per nivell ── */}
        {exerciseLevels.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-widest mb-3 px-1" style={{ color: C.muted }}>
              {t('perfil.byExercise')}
            </p>
            <div className="space-y-2">
              {exerciseLevels.map((ex) => (
                <div key={ex.exercise}
                     className="flex justify-between items-center py-3 px-4 rounded-2xl relative overflow-hidden"
                     style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
                  {/* Franja lateral del nivell */}
                  <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full"
                       style={{ backgroundColor: ex.levelColor }} />
                  <div className="min-w-0 pl-3">
                    <span className="font-semibold truncate block" style={{ color: C.text }}>
                      {ex.exercise}
                    </span>
                    <span className="text-xs tabular-nums" style={{ color: C.muted }}>
                      {format(ex.oneRM)}{unit} 1RM
                      {ex.isUnilateral && <span className="ml-1 opacity-50"> · {t('perfil.perArm')}</span>}
                    </span>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full flex-shrink-0 ml-3 font-black"
                        style={{
                          backgroundColor: ex.levelColor + '1A',
                          color: ex.levelColor,
                          border: `1px solid ${ex.levelColor}30`,
                        }}>
                    {t(`level.${ex.level}`)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Dades Personals ── */}
        <div>
          <p className="text-[10px] uppercase tracking-widest mb-3 px-1" style={{ color: C.muted }}>
            {t('perfil.data')}
          </p>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text" inputMode="numeric" value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder={t('perfil.age')}
                className="text-sm rounded-2xl px-4 py-3 outline-none transition-all tabular-nums"
                style={{ backgroundColor: C.surface, color: C.text, border: `1px solid ${C.border}` }}
                onFocus={e => (e.target.style.borderColor = C.accent + '66')}
                onBlur={e => (e.target.style.borderColor = C.border)}
              />
              <div className="flex gap-2">
                {(['m', 'f'] as const).map((g) => (
                  <button key={g} onClick={() => setGender(g)}
                          className="flex-1 py-3 rounded-2xl text-sm font-black transition-all"
                          style={{
                            backgroundColor: gender === g ? C.accent : C.surface,
                            color: gender === g ? C.bg : C.muted,
                            border: `1px solid ${gender === g ? C.accent : C.border}`,
                          }}>
                    {g === 'm' ? t('perfil.male') : t('perfil.female')}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {heightUnit === 'ftin' ? (
                <div className="flex gap-2">
                  <input type="text" inputMode="numeric" value={heightFt}
                         onChange={(e) => setHeightFt(e.target.value)}
                         placeholder={t('perfil.heightFt')}
                         className="flex-1 text-sm rounded-2xl px-4 py-3 outline-none tabular-nums"
                         style={{ backgroundColor: C.surface, color: C.text, border: `1px solid ${C.border}` }}
                         onFocus={e => (e.target.style.borderColor = C.accent + '66')}
                         onBlur={e => (e.target.style.borderColor = C.border)} />
                  <input type="text" inputMode="numeric" value={heightIn}
                         onChange={(e) => setHeightIn(e.target.value)}
                         placeholder={t('perfil.heightIn')}
                         className="flex-1 text-sm rounded-2xl px-4 py-3 outline-none tabular-nums"
                         style={{ backgroundColor: C.surface, color: C.text, border: `1px solid ${C.border}` }}
                         onFocus={e => (e.target.style.borderColor = C.accent + '66')}
                         onBlur={e => (e.target.style.borderColor = C.border)} />
                </div>
              ) : (
                <input type="text" inputMode="numeric" value={height}
                       onChange={(e) => setHeight(e.target.value)}
                       placeholder={t('perfil.heightCm')}
                       className="text-sm rounded-2xl px-4 py-3 outline-none tabular-nums"
                       style={{ backgroundColor: C.surface, color: C.text, border: `1px solid ${C.border}` }}
                       onFocus={e => (e.target.style.borderColor = C.accent + '66')}
                       onBlur={e => (e.target.style.borderColor = C.border)} />
              )}
              <input type="text" inputMode="numeric" value={weight}
                     onChange={(e) => setWeight(e.target.value)}
                     placeholder={`${t('perfil.weightLabel')} (${unit})`}
                     className="text-sm rounded-2xl px-4 py-3 outline-none tabular-nums"
                     style={{ backgroundColor: C.surface, color: C.text, border: `1px solid ${C.border}` }}
                     onFocus={e => (e.target.style.borderColor = C.accent + '66')}
                     onBlur={e => (e.target.style.borderColor = C.border)} />
            </div>
          </div>

          <button onClick={saveProfile} type="button"
                  className="w-full mt-4 py-4 rounded-2xl font-black text-sm transition-all active:scale-[0.98] hover:opacity-85"
                  style={{
                    backgroundColor: saved ? 'transparent' : C.accent,
                    color: saved ? C.accent : C.bg,
                    border: `1px solid ${saved ? C.accent + '66' : 'transparent'}`,
                  }}>
            {saved ? `✓ ${t('perfil.saved')}` : t('perfil.save')}
          </button>
        </div>

        {/* ── Rutines Favorites i Eliminades ── */}
        {(favoriteRoutines.length > 0 || deletedRoutines.length > 0) && (
          <div className="space-y-2">
            {favoriteRoutines.length > 0 && (
              <div className="rounded-2xl overflow-hidden"
                   style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
                <button onClick={() => setShowFavorites(v => !v)}
                        className="flex items-center justify-between w-full px-4 py-3">
                  <span className="text-[10px] uppercase tracking-widest font-black" style={{ color: C.muted }}>
                    {t('routines.favoriteRoutines')} ({favoriteRoutines.length})
                  </span>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor"
                       className={`transition-transform duration-200 ${showFavorites ? 'rotate-180' : ''}`}
                       style={{ color: C.muted }}>
                    <path d="M6 8L1 3h10L6 8z" />
                  </svg>
                </button>
                {showFavorites && (
                  <div className="px-4 pb-3 space-y-2">
                    {favoriteRoutines.map(r => (
                      <div key={r.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl"
                           style={{ backgroundColor: C.faint, border: `1px solid ${C.border}` }}>
                        <span className="flex-shrink-0 text-sm" style={{ color: C.accent }}>★</span>
                        <span className="text-sm font-semibold truncate" style={{ color: C.text }}>{r.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {deletedRoutines.length > 0 && (
              <div className="rounded-2xl overflow-hidden"
                   style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
                <button onClick={() => setShowDeleted(v => !v)}
                        className="flex items-center justify-between w-full px-4 py-3">
                  <span className="text-[10px] uppercase tracking-widest font-black" style={{ color: C.muted }}>
                    {t('routines.deletedRoutines')} ({deletedRoutines.length})
                  </span>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor"
                       className={`transition-transform duration-200 ${showDeleted ? 'rotate-180' : ''}`}
                       style={{ color: C.muted }}>
                    <path d="M6 8L1 3h10L6 8z" />
                  </svg>
                </button>
                {showDeleted && (
                  <div className="px-4 pb-3 space-y-2">
                    {deletedRoutines.map(dr => (
                      <div key={dr.id + dr.deletedAt}
                           className="flex items-center justify-between gap-2 py-2.5 px-3 rounded-xl"
                           style={{ backgroundColor: C.faint, border: `1px solid ${C.border}` }}>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: C.text }}>{dr.name}</p>
                          <p className="text-xs" style={{ color: C.muted }}>
                            {t('routines.exercisesCount', { count: String(dr.exercises.length) })}
                          </p>
                        </div>
                        <button onClick={() => handleRestoreRoutine(dr)}
                                className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-black transition-all hover:opacity-80 active:scale-95"
                                style={{ backgroundColor: C.accent + '1A', color: C.accent, border: `1px solid ${C.accent}33` }}>
                          {t('routines.restore')}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {restoreMsg && (
              <p className="text-sm px-1 font-semibold" style={{ color: C.accent }}>{restoreMsg}</p>
            )}
          </div>
        )}

        {/* ── Preferències ── */}
        <div>
          <p className="text-[10px] uppercase tracking-widest mb-3 px-1" style={{ color: C.muted }}>
            {t('preferences.title')}
          </p>
          <div className="rounded-2xl overflow-hidden"
               style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>

            <div className="flex justify-between items-center px-4 py-3"
                 style={{ borderBottom: `1px solid ${C.border}` }}>
              <span className="text-sm font-semibold" style={{ color: C.text }}>{t('nav.language')}</span>
              <LanguageSelector />
            </div>

            <div className="flex justify-between items-center px-4 py-3"
                 style={{ borderBottom: `1px solid ${C.border}` }}>
              <span className="text-sm font-semibold" style={{ color: C.text }}>
                {t(theme === 'dark' ? 'nav.theme_light' : 'nav.theme_dark')}
              </span>
              <button onClick={toggleTheme}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm transition-all hover:opacity-75"
                      style={{ backgroundColor: C.faint, color: C.text, border: `1px solid ${C.border}` }}
                      aria-label={t(theme === 'dark' ? 'nav.theme_light' : 'nav.theme_dark')}>
                <span className="text-base leading-none">{theme === 'dark' ? '☀️' : '🌙'}</span>
                <span className="text-xs uppercase tracking-wider">{theme === 'dark' ? 'Light' : 'Dark'}</span>
              </button>
            </div>

            <div className="flex justify-between items-center px-4 py-3"
                 style={{ borderBottom: `1px solid ${C.border}` }}>
              <span className="text-sm font-semibold" style={{ color: C.text }}>{t('preferences.weightUnit')}</span>
              <div className="flex rounded-xl p-0.5" style={{ backgroundColor: C.faint, border: `1px solid ${C.border}` }}>
                {(['kg', 'lb'] as const).map(u => (
                  <button key={u} onClick={() => setUnit(u)}
                          className="px-3 py-1.5 text-xs uppercase tracking-wider rounded-lg transition-all font-black"
                          style={{
                            backgroundColor: unit === u ? C.accent : 'transparent',
                            color: unit === u ? C.bg : C.muted,
                          }}>
                    {u}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center px-4 py-3">
              <span className="text-sm font-semibold" style={{ color: C.text }}>{t('preferences.heightUnit')}</span>
              <div className="flex rounded-xl p-0.5" style={{ backgroundColor: C.faint, border: `1px solid ${C.border}` }}>
                {(['cm', 'ftin'] as const).map(u => (
                  <button key={u} onClick={() => setHeightUnit(u)}
                          className="px-3 py-1.5 text-xs uppercase tracking-wider rounded-lg transition-all font-black"
                          style={{
                            backgroundColor: heightUnit === u ? C.accent : 'transparent',
                            color: heightUnit === u ? C.bg : C.muted,
                          }}>
                    {u === 'cm' ? 'cm' : 'ft·in'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Tancar Sessió ── */}
        <button onClick={async () => { await signOut(); router.replace('/login') }}
                className="w-full py-3 rounded-2xl text-sm font-black transition-all hover:opacity-80 active:scale-[0.98]"
                style={{ color: C.danger, backgroundColor: C.danger + '10', border: `1px solid ${C.danger}28` }}>
          {t('nav.logout')}
        </button>
      </div>

      <div className="h-20" />
    </div>
  )
}
