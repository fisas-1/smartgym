'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Exercise, DEFAULT_EXERCISES, Routine, RoutineExercise, RoutineSet, WorkoutLog, calculate1RM } from '@/types'

type CustomExercises = string[]

export default function RutinesPage() {
  const { user } = useAuth()
  const [routines, setRoutines] = useState<Routine[]>([])
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null)
  const [routineExercises, setRoutineExercises] = useState<RoutineExercise[]>([])
  const [routineSets, setRoutineSets] = useState<Record<string, RoutineSet[]>>({})
  const [customExercises, setCustomExercises] = useState<CustomExercises>([])
  const [showExerciseModal, setShowExerciseModal] = useState(false)
  const [newExerciseName, setNewExerciseName] = useState('')
  const [showRoutineModal, setShowRoutineModal] = useState(false)
  const [newRoutineName, setNewRoutineName] = useState('')
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const allExercises = [...DEFAULT_EXERCISES, ...customExercises]

  // Càrrega inicial
  useEffect(() => {
    if (user) {
      loadRoutines()
      loadCustomExercises()
    }
  }, [user])

  useEffect(() => {
    if (selectedRoutine) {
      loadRoutineExercises(selectedRoutine.id)
    }
  }, [selectedRoutine])

  useEffect(() => {
    if (selectedRoutine && routineExercises.length > 0) {
      loadRoutineSets(selectedRoutine.id)
    }
  }, [selectedRoutine, routineExercises])

  // Assegurar que cada exercici té les sèries inicialitzades
  useEffect(() => {
    if (selectedRoutine && routineExercises.length > 0) {
      routineExercises.forEach(ex => {
        initializeExerciseSets(ex.id, ex.sets_target)
      })
    }
  }, [selectedRoutine, routineExercises])

  // Càrrega de rutines des de Supabase
  async function loadRoutines() {
    if (!user) return
    const { data, error } = await supabase
      .from('routines')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error loading routines:', error)
      return
    }
    if (data) setRoutines(data)
  }

  // Càrrega d'exercicis d'una rutina
  async function loadRoutineExercises(routineId: string) {
    const { data, error } = await supabase
      .from('routine_exercises')
      .select('*')
      .eq('routine_id', routineId)
      .order('order_index', { ascending: true })
    
    if (error) {
      console.error('Error loading routine exercises:', error)
      return
    }
    if (data) setRoutineExercises(data)
  }

  // Càrrega de series completades d'una rutina
  async function loadRoutineSets(routineId: string) {
    const exerciseIds = routineExercises.map(re => re.id)
    if (exerciseIds.length === 0) return

    const { data, error } = await supabase
      .from('routine_sets')
      .select('*')
      .in('routine_exercise_id', exerciseIds)
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('Error loading routine sets:', error)
      return
    }
    
    // Agrupar per exercici
    const grouped: Record<string, RoutineSet[]> = {}
    data?.forEach(set => {
      if (!grouped[set.routine_exercise_id]) grouped[set.routine_exercise_id] = []
      grouped[set.routine_exercise_id].push(set)
    })
    setRoutineSets(grouped)
  }

  // Càrrega d'exercicis personalitzats
  function loadCustomExercises() {
    const saved = localStorage.getItem('custom_exercises')
    if (saved) setCustomExercises(JSON.parse(saved))
  }

  // Crear nova rutina
  async function handleCreateRoutine() {
    if (!user) return
    if (!newRoutineName.trim()) {
      setErrorMsg('Escriu un nom per a la rutina')
      return
    }

    setLoading(true)
    setErrorMsg(null)

    const { data, error } = await supabase
      .from('routines')
      .insert({
        user_id: user.id,
        name: newRoutineName.trim(),
        description: ''
      })
      .select()
      .single()

    setLoading(false)

    if (error) {
      setErrorMsg('Error al crear rutina: ' + error.message)
      return
    }

    setSuccessMsg('Rutina creada!')
    setShowRoutineModal(false)
    setNewRoutineName('')
    loadRoutines()
  }

  // Seleccionar rutina
  function handleSelectRoutine(routine: Routine) {
    setSelectedRoutine(routine)
  }

  // Tornar a la llista de rutines
  function handleBackToList() {
    setSelectedRoutine(null)
    setRoutineExercises([])
    setRoutineSets({})
  }

  // Afegir exercici a la rutina
  async function handleAddExercise() {
    if (!selectedRoutine || !newExerciseName.trim()) return

    setLoading(true)
    setErrorMsg(null)

    const exerciseExists = routineExercises.some(re => re.exercise === newExerciseName.trim())
    if (exerciseExists) {
      setErrorMsg('Aquest exercici ja està a la rutina')
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('routine_exercises')
      .insert({
        routine_id: selectedRoutine.id,
        exercise: newExerciseName.trim(),
        sets_target: 3,
        reps_min: 8,
        reps_max: 12,
        order_index: routineExercises.length
      })
      .select()
      .single()

    setLoading(false)

    if (error) {
      setErrorMsg('Error al afegir exercici: ' + error.message)
      return
    }

    setNewExerciseName('')
    setShowExerciseModal(false)
    setRoutineExercises(prev => [...prev, data])
    setSuccessMsg('Exercici afegit')
  }

  // Eliminar exercici de la rutina
  async function handleRemoveExercise(exerciseId: string) {
    const { error } = await supabase
      .from('routine_exercises')
      .delete()
      .eq('id', exerciseId)

    if (error) {
      setErrorMsg('Error al eliminar exercici')
      return
    }

    setRoutineExercises(prev => prev.filter(re => re.id !== exerciseId))
    setSuccessMsg('Exercici eliminat')
  }

  // Actualitzar paràmetres de l'exercici
  async function updateExercise(exerciseId: string, field: string, value: number) {
    const { error } = await supabase
      .from('routine_exercises')
      .update({ [field]: value })
      .eq('id', exerciseId)

    if (error) {
      setErrorMsg('Error en actualitzar')
      return
    }

    setRoutineExercises(prev => prev.map(re => 
      re.id === exerciseId ? { ...re, [field]: value } : re
    ))
  }

  // Obtenir recomanció de pes per a un exercici
  async function getWeightRecommendation(exerciseName: string, targetReps: number) {
    if (!user) return null

    const { data, error } = await supabase.rpc('get_weight_recommendation', {
      p_user_id: user.id,
      p_exercise: exerciseName,
      p_target_reps: targetReps
    })

    if (error || !data || data.length === 0) return null

    return data[0]
  }

  // Inicialitzar series per a un exercici (auto-checkout inicial)
  async function initializeExerciseSets(exerciseId: string, setsTarget: number) {
    if (!exerciseId) return
    
    try {
      // Obtenir sets existents de la DB
      const { data: existingSets } = await supabase
        .from('routine_sets')
        .select('*')
        .eq('routine_exercise_id', exerciseId)
      
      const currentCount = existingSets?.length || 0
      if (currentCount >= setsTarget) return

      const newSets: RoutineSet[] = []
      for (let i = currentCount + 1; i <= setsTarget; i++) {
        newSets.push({
          id: crypto.randomUUID(),
          routine_exercise_id: exerciseId,
          set_number: i,
          completed: false,
          created_at: new Date().toISOString()
        })
      }

      const setsToInsert = newSets.map(s => ({
        routine_exercise_id: s.routine_exercise_id,
        set_number: s.set_number,
        completed: false
      }))

      await supabase.from('routine_sets').insert(setsToInsert)
      setRoutineSets(prev => ({
        ...prev,
        [exerciseId]: [...(prev[exerciseId] || []), ...newSets]
      }))
    } catch (error) {
      console.error('Error initializing sets:', error)
    }
  }

  // Marcar/desmarcar série com a completada
  async function toggleSetCompletion(exerciseId: string, setNumber: number, completed: boolean) {
    const set = routineSets[exerciseId]?.find(s => s.set_number === setNumber)
    if (!set) return

    const { error } = await supabase
      .from('routine_sets')
      .update({ 
        completed: completed,
        completed_at: completed ? new Date().toISOString() : null
      })
      .eq('id', set.id)

    if (error) {
      setErrorMsg('Error en actualitzar serie')
      return
    }

    setRoutineSets(prev => {
      const current = prev[exerciseId] || []
      const updated = current.map(s => 
        s.set_number === setNumber 
          ? ({ ...s, completed, completed_at: completed ? new Date().toISOString() : null } as RoutineSet)
          : s
      )
      return { ...prev, [exerciseId]: updated }
    })
  }

  // Auto-completar totes les series d'un exercici (un cop acabades)
  function autoCompleteExercise(exerciseId: string) {
    const sets = routineSets[exerciseId] || []
    const allCompleted = sets.every(s => s.completed)
    
    if (allCompleted) {
      setRoutineSets(prev => {
        const current = prev[exerciseId] || []
        const updated = current.map(s => ({ ...s, completed: false }))
        return { ...prev, [exerciseId]: updated }
      })
    }
  }

  // Reset per a la següent rutina
  async function resetRoutineForNextDay() {
    if (!selectedRoutine) return

    const exerciseIds = routineExercises.map(re => re.id)
    const { error } = await supabase
      .from('routine_sets')
      .update({ completed: false, completed_at: null })
      .in('routine_exercise_id', exerciseIds)

    if (error) {
      setErrorMsg('Error en resetear rutina')
      return
    }

    // Recarrega els sets
    loadRoutineSets(selectedRoutine.id)
    setSuccessMsg('Rutina resetejada per al proper dia!')
  }

  // Renderitzar llista de rutines
  if (!selectedRoutine) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="px-6 pt-8 pb-6">
          <h1 className="text-xl font-medium tracking-tight text-zinc-400">rutines.</h1>
        </div>

        <div className="px-6 space-y-4">
          {routines.length === 0 ? (
            <p className="text-zinc-500 text-sm">No tens cap rutina creada</p>
          ) : (
            routines.map(routine => (
              <div
                key={routine.id}
                onClick={() => handleSelectRoutine(routine)}
                className="border border-zinc-900 rounded-2xl p-4 cursor-pointer hover:bg-zinc-900/50 transition-colors"
              >
                <p className="text-white font-light text-lg">{routine.name}</p>
                <p className="text-zinc-500 text-xs mt-1">
                  {routineExercises.filter(re => re.routine_id === routine.id).length} exercicis
                </p>
              </div>
            ))
          )}

          <button
            onClick={() => setShowRoutineModal(true)}
            className="w-full py-4 rounded-2xl font-medium bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 transition-colors"
          >
            + Nova Rutina
          </button>
        </div>

        {/* Modal Nova Rutina */}
        {showRoutineModal && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6" onClick={() => setShowRoutineModal(false)}>
            <div className="bg-zinc-900 rounded-3xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-light text-white mb-4">Nova Rutina</h3>
              <input
                type="text"
                value={newRoutineName}
                onChange={(e) => setNewRoutineName(e.target.value)}
                placeholder="Nom de la rutina"
                className="w-full bg-black text-white rounded-2xl px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-zinc-700"
                autoFocus
              />
              {errorMsg && <p className="text-red-400 text-sm mb-3">{errorMsg}</p>}
              <div className="flex gap-3">
                <button onClick={() => setShowRoutineModal(false)} className="flex-1 py-3 rounded-2xl bg-zinc-800 text-zinc-400 font-light">Cancel·lar</button>
                <button onClick={handleCreateRoutine} className="flex-1 py-3 rounded-2xl bg-white text-black font-light">Crear</button>
              </div>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="fixed bottom-8 left-6 right-6 px-4 py-3 bg-green-900/50 border border-green-800 rounded-2xl">
            <p className="text-green-400 text-sm text-center">{successMsg}</p>
          </div>
        )}

        <div className="h-20" />
      </div>
    )
  }

  // Renderitzar detall de rutina
  const screens = [{ label: 'Llista' }]

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="px-6 pt-8 pb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleBackToList}
            className="text-zinc-400 hover:text-white"
          >
            ← Tornar
          </button>
        </div>
        <h1 className="text-xl font-medium tracking-tight text-zinc-400 mt-2">{selectedRoutine?.name}</h1>
      </div>

      <div className="px-6 space-y-6">
        {/* Progres general */}
        <div className="px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
          <p className="text-zinc-300 text-sm">
            Progressió: {routineExercises.filter(re => {
            const sets = routineSets[re.id] || []
            return sets.length > 0 && sets.every(s => s.completed)
          }).length}/{routineExercises.length} exercicis completats
          </p>
        </div>

        {/* Llista d'exercicis */}
        {routineExercises.map(exercise => {
          const sets = routineSets[exercise.id] || []
          const completedSets = sets.filter(s => s.completed).length
          const allCompleted = sets.length >= exercise.sets_target && sets.every(s => s.completed)
          
          return (
            <div key={exercise.id} className="border border-zinc-900 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-white font-light">{exercise.exercise}</p>
                  <p className="text-zinc-500 text-xs">
                    {exercise.sets_target} sèries × {exercise.reps_min}-{exercise.reps_max} reps
                  </p>
                </div>
                <button
                  onClick={() => handleRemoveExercise(exercise.id)}
                  className="text-zinc-500 hover:text-red-400 text-lg px-2"
                >
                  ×
                </button>
              </div>

              {/* Botó de recomanació de pes */}
              <button
                onClick={async () => {
                  const rec = await getWeightRecommendation(exercise.exercise, exercise.reps_min)
                  if (rec) {
                    setSuccessMsg(`Recomanació per ${exercise.exercise}: ${rec.recommended_weight}kg (anterior: ${rec.previous_weight}kg × ${rec.previous_reps})`)
                  } else {
                    setSuccessMsg('No hi ha historial per a aquest exercici')
                  }
                }}
                className="text-xs px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              >
                💡 Recomanar Pes
              </button>

              {/* Llista de series */}
              {sets.map((set, idx) => (
                <div 
                  key={set.id} 
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                    set.completed 
                      ? 'bg-green-900/30 border-green-800' 
                      : 'bg-zinc-900 border-zinc-800'
                  }`}
                >
                  <button
                    onClick={() => toggleSetCompletion(exercise.id, set.set_number, !set.completed)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      set.completed
                        ? 'bg-green-500 border-green-500 text-black'
                        : 'border-zinc-600 hover:border-zinc-400'
                    }`}
                  >
                    {set.completed && '✓'}
                  </button>
                  <span className="text-zinc-400 text-sm">Sèrie {set.set_number}</span>
                  
                  {set.completed ? (
                    <span className="text-green-400 text-xs ml-auto">Completada</span>
                  ) : (
                    <span className="text-zinc-600 text-xs ml-auto">Pendent</span>
                  )}
                </div>
              ))}

              {/* Auto-completar quan totes les series estan fetes */}
              {allCompleted && (
                <button
                  onClick={() => autoCompleteExercise(exercise.id)}
                  className="w-full text-xs py-2 rounded-lg bg-green-900/30 text-green-400 border border-green-800 hover:bg-green-900/50"
                >
                  ✅ Exercici Completat (toc per desmarcar)
                </button>
              )}

              {/* Stats ràpides */}
              <div className="text-xs text-zinc-500 pt-2 border-t border-zinc-800">
                Progrés: {completedSets}/{exercise.sets_target} series
              </div>
            </div>
          )
        })}

        {/* Afegir exercici */}
        <button
          onClick={() => setShowExerciseModal(true)}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400 transition-colors"
        >
          + Afegir Exercici
        </button>

        {/* Reset per demà */}
        <button
          onClick={resetRoutineForNextDay}
          className="w-full py-3 rounded-2xl bg-zinc-900 text-zinc-400 text-sm"
        >
          🔄 Reset per a nova sessió
        </button>
      </div>

      {/* Modal Afegir Exercici */}
      {showExerciseModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6" onClick={() => setShowExerciseModal(false)}>
          <div className="bg-zinc-900 rounded-3xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-light text-white mb-4">Afegir Exercici</h3>
            
            <div className="space-y-3 mb-4">
              {allExercises.map(ex => (
                <button
                  key={ex}
                  onClick={() => {
                    setNewExerciseName(ex)
                    handleAddExercise()
                  }}
                  className={`w-full px-4 py-2 rounded-xl text-sm text-left ${
                    newExerciseName === ex 
                      ? 'bg-white text-black' 
                      : 'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  {ex}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowExerciseModal(false)} className="flex-1 py-3 rounded-2xl bg-zinc-800 text-zinc-400 font-light">Cancel·lar</button>
            </div>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="fixed bottom-8 left-6 right-6 px-4 py-3 bg-green-900/50 border border-green-800 rounded-2xl z-50">
          <p className="text-green-400 text-sm text-center">{successMsg}</p>
        </div>
      )}

      <div className="h-20" />
    </div>
  )
}
