'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './contexts/AuthContext'
import { Exercise, DEFAULT_EXERCISES, WorkoutLog } from '@/types'

function calculate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0
  return Math.round(weight / (1.0278 - 0.0278 * reps))
}

async function analyzeOverload(exerciseName: string): Promise<string | null> {
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

  return `Avui: ${targetWeight}kg (${Math.round(improvement)}%↑)`
}

export default function HomePage() {
  const { user } = useAuth()
  const [exercise, setExercise] = useState<Exercise>('Press Banca')
  const [weight, setWeight] = useState<string>('')
  const [reps, setReps] = useState<string>('')
  const [rir, setRir] = useState<string>('0')
  const [oneRM, setOneRM] = useState<number>(0)
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
      setOneRM(calculate1RM(w, r))
    } else {
      setOneRM(0)
    }
  }, [weight, reps])

  useEffect(() => { loadSavedSets() }, [user])
  useEffect(() => { if (exercise) analyzeOverload(exercise).then(setSuggestion) }, [exercise])

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
    const w = parseFloat(weight), r = parseFloat(reps)
    if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0) return

    setLoading(true)
    setErrorMsg(null)
    const { data, error } = await supabase.from('workout_logs').insert({
      exercise, weight: w, reps: r, rir: parseFloat(rir), one_rm: oneRM,
      user_id: user?.id
    }).select().maybeSingle()
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
    setWeight(''); setReps(''); setRir('0')
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
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-3xl font-light mb-2">gym.</h1>
          <p className="text-zinc-500 mb-8">Inicia sessió per començar</p>
          <a href="/login" className="inline-block py-4 px-8 rounded-2xl font-medium bg-white text-black hover:bg-zinc-200 transition-colors">
            Entrar
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="px-6 pt-8 pb-6">
        <h1 className="text-xl font-medium tracking-tight text-zinc-400">gym.</h1>
      </div>

      <div className="px-6 space-y-6">
        <div className="py-8">
          <p className="text-zinc-500 text-sm mb-1">1RM estimat</p>
          <div className="flex items-baseline gap-1">
            <span className="text-7xl font-light tracking-tight">{oneRM || '—'}</span>
            <span className="text-zinc-600 text-xl">kg</span>
          </div>
        </div>

        {suggestion && (
          <div className="px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
            <p className="text-zinc-300 text-sm">{suggestion}</p>
          </div>
        )}

        {errorMsg && (
          <div className="px-4 py-3 bg-red-900/50 border border-red-800 rounded-2xl">
            <p className="text-red-400 text-sm">{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-wider block mb-3">Exercici</label>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {allExercises.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setExercise(ex)}
                  className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                    exercise === ex
                      ? 'bg-white text-black'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {ex}
                  {!DEFAULT_EXERCISES.includes(ex as Exercise) && (
                    <span onClick={(e) => { e.stopPropagation(); handleDeleteExercise(ex) }} className="ml-1 text-zinc-500">×</span>
                  )}
                </button>
              ))}
              <button type="button" onClick={() => setShowModal(true)} className="px-4 py-2 rounded-full text-sm bg-zinc-900 text-zinc-400">+</button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider block mb-2">Pes</label>
              <input
                type="number"
                inputMode="numeric"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="0"
                className="w-full bg-zinc-900 text-2xl font-light rounded-2xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-zinc-700"
              />
            </div>
            <div>
              <label className="text-zinc-500 text-xs uppercase tracking-wider block mb-2">Reps</label>
              <input
                type="number"
                inputMode="numeric"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder="0"
                className="w-full bg-zinc-900 text-2xl font-light rounded-2xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-zinc-700"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-zinc-500 text-xs uppercase tracking-wider">RIR</label>
              <span className="text-zinc-300 font-light">{rir}</span>
            </div>
            <input
              type="range"
              min="0" max="5"
              value={rir}
              onChange={(e) => setRir(e.target.value)}
              className="w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl font-medium bg-white text-black hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            {loading ? 'Guardant...' : 'Guardar'}
          </button>
        </form>

        <div className="pt-4">
          <p className="text-zinc-500 text-xs uppercase tracking-wider mb-4">Recents</p>
          {savedSets.length === 0 ? (
            <p className="text-zinc-600 text-sm">Sense històric</p>
          ) : (
            <div className="space-y-2">
              {savedSets.map((set) => (
                <div key={set.id} className="flex justify-between items-center py-3 border-b border-zinc-900">
                  <div>
                    <p className="text-white font-light">{set.exercise}</p>
                    <p className="text-zinc-500 text-xs">{new Date(set.created_at).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-light">{set.weight}kg × {set.reps}</p>
                    <p className="text-zinc-600 text-xs">RIR {set.rir}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6" onClick={() => setShowModal(false)}>
          <div className="bg-zinc-900 rounded-3xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-light text-white mb-4">Nou exercici</h3>
            <input
              type="text"
              value={newExerciseName}
              onChange={(e) => setNewExerciseName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddExercise()}
              placeholder="Nom de l'exercici"
              className="w-full bg-black text-white rounded-2xl px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-zinc-700"
              autoFocus
            />
            {errorMsg && <p className="text-red-400 text-sm mb-3">{errorMsg}</p>}
            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-2xl bg-zinc-800 text-zinc-400 font-light">Cancel</button>
              <button onClick={handleAddExercise} className="flex-1 py-3 rounded-2xl bg-white text-black font-light">Afegir</button>
            </div>
          </div>
        </div>
      )}

      <div className="h-20" />
    </div>
  )
}
