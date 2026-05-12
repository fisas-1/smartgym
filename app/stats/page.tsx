'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useUnit } from '../contexts/UnitContext'
import { EXERCISE_KEYS } from '@/types'
import { useTranslation } from '../contexts/LanguageContext'
import QuickLogFab from '../components/QuickLogFab'

const MUSCLE_GROUPS = [
  { id: 'pit', label: 'Pit', color: '#888' },
  { id: 'esquena', label: 'Esquena', color: '#888' },
  { id: 'cames', label: 'Cames', color: '#888' },
  { id: 'espatles', label: 'Espatles', color: '#888' },
  { id: 'biceps', label: 'Bíceps', color: '#888' },
  { id: 'triceps', label: 'Tríceps', color: '#888' },
  { id: 'abdominals', label: 'Abs', color: '#888' },
  { id: 'gluts', label: 'Gluts', color: '#888' },
]

const EXERCISE_MUSCLE_MAP: Record<string, string> = {
  'Press Banca': 'pit', 'Lat Pulldown': 'esquena', 'Sentadilles': 'cames',
  'Leg Press': 'cames', 'Dominades': 'esquena', 'Press Military': 'espatles',
  'Curl de Bíceps': 'biceps', 'Extensiones Tricep': 'triceps', 'French Press': 'triceps', 'Zancadas': 'cames',
}

type MuscleStats = { muscle: string; label: string; improvement: number; currentMax: number; previousMax: number }
type LogEntry = { id: string; exercise: string; weight: number; reps: number; rir: number | null; one_rm: number; note: string | null; created_at: string }

export default function EstadistiquesPage() {
  const { user } = useAuth()
  const { unit, format } = useUnit()
  const { t } = useTranslation()
  const tEx = (name: string) => { const key = EXERCISE_KEYS[name]; return key ? t(key) : name }
  const [stats, setStats] = useState<MuscleStats[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'30' | '90' | 'all'>('30')

  const [exerciseList, setExerciseList] = useState<string[]>([])
  const [selectedExercise, setSelectedExercise] = useState<string>('')
  const [exerciseLogs, setExerciseLogs] = useState<LogEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [weeklyVolume, setWeeklyVolume] = useState<{ muscle: string; label: string; thisWeek: number; lastWeek: number }[]>([])

  useEffect(() => { loadStats() }, [period])
  useEffect(() => { if (user) { loadExerciseList(); loadWeeklyVolume() } }, [user])
  useEffect(() => { if (selectedExercise) loadExerciseHistory(selectedExercise) }, [selectedExercise, user])

  async function loadWeeklyVolume() {
    if (!user) return
    const now = new Date()
    const dayMs = 24 * 60 * 60 * 1000
    const dayOfWeek = (now.getDay() + 6) % 7 // Monday = 0
    const startThis = new Date(now.getTime() - dayOfWeek * dayMs)
    startThis.setHours(0, 0, 0, 0)
    const startLast = new Date(startThis.getTime() - 7 * dayMs)

    const { data } = await supabase
      .from('workout_logs')
      .select('exercise, weight, reps, created_at')
      .eq('user_id', user.id)
      .gte('created_at', startLast.toISOString())

    const byMuscle: Record<string, { thisWeek: number; lastWeek: number }> = {}
    for (const m of MUSCLE_GROUPS) byMuscle[m.id] = { thisWeek: 0, lastWeek: 0 }

    for (const log of data || []) {
      // Strip "- Pes corporal" suffix to find muscle group
      const cleanName = (log.exercise as string).replace(' - Pes corporal', '')
      const muscle = EXERCISE_MUSCLE_MAP[cleanName]
      if (!muscle) continue
      const vol = (log.weight || 0) * (log.reps || 0)
      if (vol <= 0) continue
      const ts = new Date(log.created_at).getTime()
      if (ts >= startThis.getTime()) byMuscle[muscle].thisWeek += vol
      else byMuscle[muscle].lastWeek += vol
    }

    const result = MUSCLE_GROUPS.map(m => ({
      muscle: m.id,
      label: m.label,
      thisWeek: byMuscle[m.id].thisWeek,
      lastWeek: byMuscle[m.id].lastWeek,
    })).filter(r => r.thisWeek > 0 || r.lastWeek > 0)
    setWeeklyVolume(result)
  }

  async function loadStats() {
    setLoading(true)
    const days = period === 'all' ? 365 : parseInt(period)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)

    const { data: logs } = await supabase
      .from('workout_logs')
      .select('*')
      .gte('created_at', cutoff.toISOString())
      .order('created_at', { ascending: true })

    const muscleData: Record<string, { current: number; previous: number }> = {}
    MUSCLE_GROUPS.forEach(m => { muscleData[m.id] = { current: 0, previous: 0 } })

    if (logs?.length) {
      const mid = Math.floor(logs.length / 2)
      logs.forEach((log, idx) => {
        const muscle = EXERCISE_MUSCLE_MAP[log.exercise]
        if (!muscle || !log.one_rm) return
        if (idx >= mid && log.one_rm > muscleData[muscle].current) {
          muscleData[muscle].current = log.one_rm
        } else if (idx < mid && log.one_rm > muscleData[muscle].previous) {
          muscleData[muscle].previous = log.one_rm
        }
      })
    }

    const calculated: MuscleStats[] = MUSCLE_GROUPS.map(m => {
      const d = muscleData[m.id]
      const imp = d.previous > 0 && d.current > d.previous
        ? Math.round(((d.current - d.previous) / d.previous) * 100)
        : d.current > 0 ? 100 : 0
      return { muscle: m.id, label: m.label, improvement: imp, currentMax: d.current, previousMax: d.previous }
    })

    setStats(calculated)
    setLoading(false)
  }

  async function loadExerciseList() {
    if (!user) return
    const { data } = await supabase
      .from('workout_logs')
      .select('exercise')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1000)
    if (!data) return
    const uniq = Array.from(new Set(data.map(r => r.exercise as string)))
    setExerciseList(uniq)
    if (uniq.length && !selectedExercise) setSelectedExercise(uniq[0])
  }

  async function loadExerciseHistory(exercise: string) {
    if (!user) return
    setHistoryLoading(true)
    const { data } = await supabase
      .from('workout_logs')
      .select('id, exercise, weight, reps, rir, one_rm, note, created_at')
      .eq('user_id', user.id)
      .eq('exercise', exercise)
      .order('created_at', { ascending: false })
      .limit(200)
    setExerciseLogs((data as LogEntry[]) || [])
    setHistoryLoading(false)
  }

  const groupedByDay = useMemo(() => {
    const map: Record<string, LogEntry[]> = {}
    for (const l of exerciseLogs) {
      const key = new Date(l.created_at).toISOString().slice(0, 10)
      ;(map[key] ||= []).push(l)
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
  }, [exerciseLogs])

  const chartData = useMemo(() => {
    const points = groupedByDay
      .map(([day, logs]) => ({ day, max: Math.max(...logs.map(l => l.one_rm || 0)) }))
      .filter(p => p.max > 0)
      .reverse()
    return points
  }, [groupedByDay])

  const totalImprovement = stats.filter(s => s.improvement > 0).reduce((sum, s) => sum + s.improvement, 0)
  const improvedCount = stats.filter(s => s.improvement > 0).length

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      <div className="px-6 pt-8 pb-6">
        <h1 className="text-xl font-medium tracking-tight text-zinc-400">stats.</h1>
      </div>

      <div className="px-6 space-y-6">
        <div className="flex gap-2">
          {[
            { key: '30', label: '1M' },
            { key: '90', label: '3M' },
            { key: 'all', label: 'All' },
          ].map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key as '30' | '90' | 'all')}
               className={`flex-1 py-2 rounded-full text-xs uppercase tracking-wider transition-colors ${
                period === p.key ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-primary)]' : 'bg-zinc-900 text-zinc-500'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-20 text-center text-zinc-600">Carregant...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-900/50 rounded-2xl p-4">
                <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Millora Total</p>
                <p className="text-3xl font-light">{totalImprovement}%</p>
              </div>
              <div className="bg-zinc-900/50 rounded-2xl p-4">
                <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Grups Millorats</p>
                <p className="text-3xl font-light">{improvedCount}</p>
              </div>
            </div>

            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-wider mb-4">Per Grup Muscular</p>
              <div className="space-y-3">
                {stats.sort((a, b) => b.improvement - a.improvement).map((stat) => (
                  <div key={stat.muscle}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-zinc-300 font-light">{stat.label}</span>
                      <span className={stat.improvement > 0 ? 'text-green-500' : 'text-zinc-600'}>
                        {stat.improvement > 0 ? '+' : ''}{stat.improvement}%
                      </span>
                    </div>
                    <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(Math.abs(stat.improvement), 100)}%`,
                          backgroundColor: stat.improvement > 0 ? '#22c55e' : stat.improvement < 0 ? '#ef4444' : '#333',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Volum setmanal per grup muscular */}
        {weeklyVolume.length > 0 && (
          <div className="pt-4 border-t border-zinc-900">
            <p className="text-zinc-500 text-xs uppercase tracking-wider mb-3">Volum setmanal (pes × reps)</p>
            <div className="space-y-3">
              {weeklyVolume.sort((a, b) => b.thisWeek - a.thisWeek).map(v => {
                const max = Math.max(v.thisWeek, v.lastWeek, 1)
                const diff = v.lastWeek > 0 ? Math.round(((v.thisWeek - v.lastWeek) / v.lastWeek) * 100) : (v.thisWeek > 0 ? 100 : 0)
                return (
                  <div key={v.muscle}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-zinc-300 font-light">{v.label}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-zinc-300">{format(v.thisWeek)}{unit}</span>
                        {v.lastWeek > 0 && (
                          <span className={`text-xs ${diff > 0 ? 'text-green-500' : diff < 0 ? 'text-red-500' : 'text-zinc-500'}`}>
                            {diff > 0 ? '+' : ''}{diff}%
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="relative h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                      <div className="absolute h-full bg-zinc-700 rounded-full" style={{ width: `${(v.lastWeek / max) * 100}%` }} />
                      <div className="absolute h-full bg-green-500 rounded-full" style={{ width: `${(v.thisWeek / max) * 100}%`, opacity: 0.85 }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-[10px] text-zinc-600 mt-3">Barra fosca: setmana anterior · Verda: aquesta setmana</p>
          </div>
        )}

        {/* Historial per exercici */}
        {exerciseList.length > 0 && (
          <div className="pt-4 border-t border-zinc-900">
            <p className="text-zinc-500 text-xs uppercase tracking-wider mb-3">Historial per exercici</p>

            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hidden mb-4">
              {exerciseList.map(ex => (
                <button
                  key={ex}
                  onClick={() => setSelectedExercise(ex)}
                  className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors flex-shrink-0 ${
                    selectedExercise === ex
                      ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-primary)]'
                      : 'bg-zinc-900 text-zinc-400'
                  }`}
                >
                  {tEx(ex)}
                </button>
              ))}
            </div>

            {historyLoading ? (
              <div className="py-10 text-center text-zinc-600 text-sm">Carregant historial...</div>
            ) : exerciseLogs.length === 0 ? (
              <p className="text-zinc-600 text-sm py-6 text-center">Sense historial</p>
            ) : (
              <>
                {/* Mini-gràfic d'evolució 1RM */}
                {chartData.length >= 2 && (
                  <ProgressChart points={chartData} unit={unit} format={format} />
                )}

                {/* Sessions agrupades per dia */}
                {(() => {
                  const allTimeMax = Math.max(...exerciseLogs.map(l => l.one_rm || 0))
                  return (
                <div className="space-y-3 mt-4">
                  {groupedByDay.map(([day, logs]) => {
                    const maxOneRM = Math.max(...logs.map(l => l.one_rm || 0))
                    const isPrDay = maxOneRM > 0 && maxOneRM === allTimeMax
                    const notes = logs.map(l => l.note).filter(Boolean) as string[]
                    return (
                      <div key={day} className={`bg-zinc-900/40 border rounded-xl p-3 ${isPrDay ? 'border-yellow-700/50' : 'border-zinc-900'}`}>
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm font-light text-zinc-300 flex items-center gap-1.5">
                            {isPrDay && <span title="Rècord personal">🏆</span>}
                            {new Date(day).toLocaleDateString('ca-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                          {maxOneRM > 0 && (
                            <p className="text-xs text-zinc-500">1RM: <span className="text-zinc-300">{format(maxOneRM)}{unit}</span></p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {logs.map(l => (
                            <span key={l.id} className="text-xs px-2 py-1 rounded-md bg-zinc-800/60 text-zinc-300 font-light">
                              {format(l.weight)}{unit} × {l.reps}
                              {l.rir != null && <span className="text-zinc-500"> · RIR {l.rir}</span>}
                            </span>
                          ))}
                        </div>
                        {notes.length > 0 && (
                          <div className="mt-2 space-y-0.5">
                            {notes.map((n, i) => (
                              <p key={i} className="text-xs text-zinc-500 italic">"{n}"</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                  )
                })()}
              </>
            )}
          </div>
        )}
      </div>

      <QuickLogFab />
      <div className="h-20" />
    </div>
  )
}

function ProgressChart({ points, unit, format }: { points: { day: string; max: number }[]; unit: string; format: (kg: number) => string }) {
  const W = 320, H = 100, P = 12
  const xs = points.map((_, i) => P + (i * (W - 2 * P)) / Math.max(1, points.length - 1))
  const maxY = Math.max(...points.map(p => p.max))
  const minY = Math.min(...points.map(p => p.max))
  const range = maxY - minY || 1
  const ys = points.map(p => H - P - ((p.max - minY) / range) * (H - 2 * P))
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x} ${ys[i]}`).join(' ')
  const areaPath = `${path} L ${xs[xs.length - 1]} ${H - P} L ${xs[0]} ${H - P} Z`
  const first = points[0].max, last = points[points.length - 1].max
  const trend = last - first
  const trendPct = first > 0 ? Math.round((trend / first) * 100) : 0

  return (
    <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-4">
      <div className="flex justify-between items-baseline mb-2">
        <p className="text-xs uppercase tracking-wider text-zinc-500">Evolució 1RM</p>
        <p className={`text-xs ${trend > 0 ? 'text-green-500' : trend < 0 ? 'text-red-500' : 'text-zinc-500'}`}>
          {trend > 0 ? '+' : ''}{format(trend)}{unit} ({trendPct > 0 ? '+' : ''}{trendPct}%)
        </p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#chartGrad)" />
        <path d={path} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {xs.map((x, i) => (
          <circle key={i} cx={x} cy={ys[i]} r={i === xs.length - 1 ? 3 : 2} fill="#22c55e" />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
        <span>{new Date(points[0].day).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' })}</span>
        <span>{format(minY)}–{format(maxY)}{unit}</span>
        <span>{new Date(points[points.length - 1].day).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' })}</span>
      </div>
    </div>
  )
}
