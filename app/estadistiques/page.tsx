'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

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

export default function EstadistiquesPage() {
  const [stats, setStats] = useState<MuscleStats[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'30' | '90' | 'all'>('30')

  useEffect(() => { loadStats() }, [period])

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

  const totalImprovement = stats.filter(s => s.improvement > 0).reduce((sum, s) => sum + s.improvement, 0)
  const improvedCount = stats.filter(s => s.improvement > 0).length

  return (
    <div className="min-h-screen bg-black text-white">
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
                period === p.key ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-500'
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
      </div>

      <div className="h-20" />
    </div>
  )
}