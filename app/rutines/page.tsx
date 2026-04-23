'use client'

import { useState, useEffect } from 'react'

const DAYS_OF_WEEK = ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte', 'Diumenge']

const MUSCLE_GROUPS = [
  { id: 'pit', label: 'Pit' },
  { id: 'esquena', label: 'Esquena' },
  { id: 'cames', label: 'Cames' },
  { id: 'espatles', label: 'Espatles' },
  { id: 'biceps', label: 'Bíceps' },
  { id: 'triceps', label: 'Tríceps' },
  { id: 'abdominals', label: 'Abs' },
  { id: 'gluts', label: 'Gluts' },
]

type RoutineDay = { day: string; muscles: string[] }

export default function RutinesPage() {
  const [daysPerWeek, setDaysPerWeek] = useState<number>(3)
  const [routines, setRoutines] = useState<RoutineDay[]>([])
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('user_routines')
    if (saved) {
      const data = JSON.parse(saved)
      setDaysPerWeek(data.days_per_week || 3)
      setRoutines(data.routines || [])
    } else {
      setRoutines(Array(3).fill(null).map((_, i) => ({ day: DAYS_OF_WEEK[i], muscles: [] })))
    }
  }, [])

  useEffect(() => {
    if (routines.length > 0) {
      const newRoutines: RoutineDay[] = []
      for (let i = 0; i < daysPerWeek; i++) {
        newRoutines.push(routines[i] || { day: DAYS_OF_WEEK[i], muscles: [] })
      }
      setRoutines(newRoutines)
    }
  }, [daysPerWeek])

  function handleSave() {
    localStorage.setItem('user_routines', JSON.stringify({ days_per_week: daysPerWeek, routines }))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function toggleMuscle(dayIndex: number, muscleId: string) {
    const updated = [...routines]
    const muscles = updated[dayIndex].muscles
    updated[dayIndex].muscles = muscles.includes(muscleId)
      ? muscles.filter(m => m !== muscleId)
      : [...muscles, muscleId]
    setRoutines(updated)
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="px-6 pt-8 pb-6">
        <h1 className="text-xl font-medium tracking-tight text-zinc-400">rutines.</h1>
      </div>

      <div className="px-6 space-y-6">
        <div>
          <p className="text-zinc-500 text-xs uppercase tracking-wider mb-3">Dies/setmana</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
              <button
                key={day}
                onClick={() => setDaysPerWeek(day)}
                className={`w-10 h-10 rounded-full text-sm transition-colors ${
                  daysPerWeek === day ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {routines.map((routine, idx) => (
            <div key={idx} className="border border-zinc-900 rounded-2xl p-4">
              <p className="text-zinc-500 text-xs uppercase tracking-wider mb-3">{routine.day}</p>
              <div className="flex flex-wrap gap-2">
                {MUSCLE_GROUPS.map((muscle) => (
                  <button
                    key={muscle.id}
                    onClick={() => toggleMuscle(idx, muscle.id)}
                    className={`px-3 py-2 rounded-full text-xs transition-colors ${
                      routine.muscles.includes(muscle.id)
                        ? 'bg-white text-black'
                        : 'bg-zinc-900 text-zinc-500'
                    }`}
                  >
                    {muscle.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          className="w-full py-4 rounded-2xl font-medium bg-white text-black hover:bg-zinc-200 transition-colors"
        >
          {saved ? 'Guardat' : 'Guardar'}
        </button>
      </div>

      <div className="h-20" />
    </div>
  )
}