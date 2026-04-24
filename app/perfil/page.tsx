'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

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
  { key: 'novice', label: 'Novato', color: '#666' },
  { key: 'beginner', label: 'Principiant', color: '#22c55e' },
  { key: 'intermediate', label: 'Intermedi', color: '#3b82f6' },
  { key: 'advanced', label: 'Avançat', color: '#a855f7' },
  { key: 'elite', label: 'Elit', color: '#f97316' },
  { key: 'worldclass', label: 'Mundial', color: '#ef4444' },
]

type ExerciseLevel = { exercise: string; level: string; levelLabel: string; levelColor: string; oneRM: number }

export default function PerfilPage() {
  const [age, setAge] = useState<string>('')
  const [height, setHeight] = useState<string>('')
  const [weight, setWeight] = useState<string>('')
  const [gender, setGender] = useState<'m' | 'f'>('m')
  const [saved, setSaved] = useState(false)
  const [exerciseLevels, setExerciseLevels] = useState<ExerciseLevel[]>([])
  const [overallLevel, setOverallLevel] = useState<string>('')

  useEffect(() => { loadProfile() }, [])
  useEffect(() => { if (weight) calculateLevels() }, [weight, gender])

  function loadProfile() {
    const saved = localStorage.getItem('user_profile')
    if (saved) {
      const p: UserProfile = JSON.parse(saved)
      setAge(p.age?.toString() || '')
      setHeight(p.height?.toString() || '')
      setWeight(p.weight?.toString() || '')
      setGender(p.gender || 'm')
    }
  }

  function saveProfile() {
    localStorage.setItem('user_profile', JSON.stringify({
      age: parseInt(age) || null,
      height: parseFloat(height) || null,
      weight: parseFloat(weight) || null,
      gender,
    }))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function calculateLevels() {
    const w = parseFloat(weight) || 70
    supabase.from('workout_logs').select('exercise, weight, reps, one_rm')
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
            // novice is the default level, no check needed
          const lv = LEVELS.find(l => l.key === level)
          return { exercise: ex, level, levelLabel: lv?.label || level, levelColor: lv?.color || '#666', oneRM: d.oneRM }
        }).filter(Boolean) as ExerciseLevel[]

        setExerciseLevels(levels.sort((a, b) => (LEVELS.findIndex(l => l.key === b.level)) - (LEVELS.findIndex(l => l.key === a.level))))

        if (levels.length) {
          const avgPct = levels.reduce((s, l) => s + (LEVELS.findIndex(x => x.key === l.level) + 1) * 17, 0) / levels.length
          if (avgPct > 80) setOverallLevel('Mundial')
          else if (avgPct > 65) setOverallLevel('Elit')
          else if (avgPct > 50) setOverallLevel('Avançat')
          else if (avgPct > 35) setOverallLevel('Intermedi')
          else if (avgPct > 20) setOverallLevel('Principiant')
          else setOverallLevel('Novato')
        }
      })
  }

  const levelColor = overallLevel === 'Mundial' ? '#ef4444' :
                     overallLevel === 'Elit' ? '#f97316' :
                     overallLevel === 'Avançat' ? '#a855f7' :
                     overallLevel === 'Intermedi' ? '#3b82f6' :
                     overallLevel === 'Principiant' ? '#22c55e' : '#666'

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
       <div className="px-6 pt-8 pb-6">
         <h1 className="text-xl font-medium tracking-tight bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">perfil.</h1>
       </div>

    <div className="px-6 space-y-6">
         {exerciseLevels.length > 0 && (
           <div>
             <p className="text-slate-300 text-xs uppercase tracking-wider mb-4">Per Exercici</p>
             <div className="space-y-2">
               {exerciseLevels.map((ex) => (
                 <div key={ex.exercise} className="flex justify-between items-center py-3 border-b border-slate-700/50 rounded-lg px-3 hover:bg-slate-800/30 transition-colors">
                   <span className="font-light text-slate-200">{ex.exercise}</span>
                   <span className="text-sm" style={{ color: ex.levelColor }}>{ex.levelLabel}</span>
                 </div>
               ))}
             </div>
           </div>
         )}

        <div>
          <p className="text-zinc-500 text-xs uppercase tracking-wider mb-4">Dades</p>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="Edat"
                  className="bg-slate-800/60 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-600/50 border border-slate-700/50"
                />
               <div className="flex gap-2">
                 <button
                   onClick={() => setGender('m')}
                   className={`flex-1 py-3 rounded-xl text-sm transition-colors ${gender === 'm' ? 'bg-white text-black' : 'bg-slate-800/60 text-slate-300 border border-slate-700/50'}`}
                 >
                   Home
                 </button>
                 <button
                   onClick={() => setGender('f')}
                   className={`flex-1 py-3 rounded-xl text-sm transition-colors ${gender === 'f' ? 'bg-white text-black' : 'bg-slate-800/60 text-slate-300 border border-slate-700/50'}`}
                 >
                   Dona
                 </button>
               </div>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="Altura (cm)"
                  className="bg-slate-800/60 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-600/50 border border-slate-700/50"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="Pes (kg)"
                  className="bg-slate-800/60 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-600/50 border border-slate-700/50"
                />
             </div>
          </div>
           <button
             type="button"
             onClick={saveProfile}
             className="w-full mt-4 py-4 rounded-2xl font-medium bg-white text-black hover:bg-zinc-200 transition-colors"
           >
             {saved ? 'Guardat' : 'Guardar'}
           </button>
        </div>

        {exerciseLevels.length > 0 && (
          <div>
            <p className="text-zinc-500 text-xs uppercase tracking-wider mb-4">Per Exercici</p>
            <div className="space-y-2">
              {exerciseLevels.map((ex) => (
                <div key={ex.exercise} className="flex justify-between items-center py-3 border-b border-zinc-900">
                  <span className="font-light">{ex.exercise}</span>
                  <span className="text-sm" style={{ color: ex.levelColor }}>{ex.levelLabel}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-zinc-500 text-xs uppercase tracking-wider mb-3">Escala</p>
          <div className="flex flex-wrap gap-2">
            {LEVELS.map((l) => (
              <span key={l.key} className="px-3 py-1 rounded-full text-xs" style={{ backgroundColor: l.color + '22', color: l.color }}>
                {l.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="h-20" />
    </div>
  )
}