"use client"

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase/index'
import { useAuth } from '../app/contexts/AuthContext'
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
   const [editRoutineName, setEditRoutineName] = useState('')
   const [showEditRoutineModal, setShowEditRoutineModal] = useState(false)
   const [editingExercise, setEditingExercise] = useState<RoutineExercise | null>(null)
   const [showEditExerciseModal, setShowEditExerciseModal] = useState(false)
   const [editSetsTarget, setEditSetsTarget] = useState<number>(3)
   const [editRepsMin, setEditRepsMin] = useState<number>(8)
   const [editRepsMax, setEditRepsMax] = useState<number>(12)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isSchemaFixed, setIsSchemaFixed] = useState<boolean | null>(null)

  const allExercises = [...DEFAULT_EXERCISES, ...customExercises]

  useEffect(() => {
    if (user) {
      loadRoutines()
      loadCustomExercises()
      checkSchema()
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

  useEffect(() => {
    if (selectedRoutine && routineExercises.length > 0 && isSchemaFixed) {
      routineExercises.forEach(ex => {
        initializeExerciseSets(ex.id, ex.sets_target)
      })
    }
  }, [selectedRoutine, routineExercises, isSchemaFixed])

  async function checkSchema() {
    try {
      const { data, error } = await supabase
        .from('routines')
        .select('*')
        .limit(1)
      
      if (error && error.message.includes('table')) {
        setIsSchemaFixed(false)
        console.log('⚠️ Schema not fixed: routines table missing')
      } else {
        setIsSchemaFixed(true)
        console.log('✅ Schema is fixed')
      }
    } catch (err) {
      setIsSchemaFixed(false)
    }
  }

  async function loadRoutines() {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('routines')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error && error.message.includes('table')) {
        console.log('Tabla routines no existe (esperado antes del fix)')
        return
      }
      
      if (error) {
        console.error('Error loading routines:', error)
        return
      }
      
      if (data) setRoutines(data)
    } catch (err) {
      console.log('Error loading routines:', err)
    }
  }

  async function loadRoutineExercises(routineId: string) {
    try {
      const { data, error } = await supabase
        .from('routine_exercises')
        .select('*')
        .eq('routine_id', routineId)
        .order('order_index', { ascending: true })
      
      if (error && error.message.includes('table')) {
        console.log('Tabla routine_exercises no existe (esperado antes del fix)')
        return
      }
      
      if (error) {
        console.error('Error loading routine exercises:', error)
        return
      }
      
      if (data) setRoutineExercises(data)
    } catch (err) {
      console.log('Error loading routine exercises:', err)
    }
  }

  async function loadRoutineSets(routineId: string) {
    const exerciseIds = routineExercises.map(re => re.id)
    if (exerciseIds.length === 0) return

    try {
      const { data, error } = await supabase
        .from('routine_sets')
        .select('*')
        .in('routine_exercise_id', exerciseIds)
        .order('created_at', { ascending: true })
      
      if (error && error.message.includes('table')) {
        console.log('Tabla routine_sets no existe (esperado antes del fix)')
        return
      }
      
      if (error) {
        console.error('Error loading routine sets:', error)
        return
      }
      
      if (data) {
        const grouped = data.reduce((acc: Record<string, RoutineSet[]>, set: RoutineSet) => {
          if (!acc[set.routine_exercise_id]) acc[set.routine_exercise_id] = []
          acc[set.routine_exercise_id].push(set)
          return acc
        }, {})
        setRoutineSets(grouped)
      }
    } catch (err) {
      console.log('Error loading routine sets:', err)
    }
  }

  async function initializeExerciseSets(exerciseId: string, setsTarget: number) {
    if (!exerciseId || !isSchemaFixed) return
    
    try {
      const { data: existingSets } = await supabase
        .from('routine_sets')
        .select('*')
        .eq('routine_exercise_id', exerciseId)
      
      const currentCount = existingSets?.length || 0
      if (currentCount >= setsTarget) return

      const newSets: RoutineSet[] = []
      const setsToInsert: any[] = []
      
       for (let i = currentCount + 1; i <= setsTarget; i++) {
         const newSet = {
           id: crypto.randomUUID(),
           routine_exercise_id: exerciseId,
           set_number: i,
           completed: false,
           weight: 0,
           reps: 0,
           rir: 0,
           created_at: new Date().toISOString()
         }
         newSets.push(newSet)
         setsToInsert.push({
           routine_exercise_id: exerciseId,
           set_number: i,
           completed: false,
           weight: 0,
           reps: 0,
           rir: 0
         })
       }

      const { error } = await supabase.from('routine_sets').insert(setsToInsert)
      
      if (error && !error.message.includes('table')) {
        console.error('Error initializing sets:', error)
        return
      }
      
      if (!error || error.message.includes('table')) {
        setRoutineSets(prev => ({
          ...prev,
          [exerciseId]: [...(prev[exerciseId] || []), ...newSets]
        }))
      }
    } catch (error) {
      console.error('Error initializing sets:', error)
    }
  }

  async function toggleSetCompletion(exerciseId: string, setNumber: number, completed: boolean) {
    if (!isSchemaFixed) {
      setErrorMsg('El schema no està configurat. Completa el pas 1 primer.')
      return
    }
    
    const sets = routineSets[exerciseId] || []
    const set = sets.find(s => s.set_number === setNumber)
    if (!set) return

    try {
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
    } catch (err) {
      console.error('Error toggling set:', err)
    }
  }

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

  async function resetRoutineForNextDay() {
    if (!selectedRoutine || !isSchemaFixed) return

    const exerciseIds = routineExercises.map(re => re.id)
    const { error } = await supabase
      .from('routine_sets')
      .update({ completed: false, completed_at: null })
      .in('routine_exercise_id', exerciseIds)

    if (error) {
      setErrorMsg('Error en resetear rutina')
      return
    }

    loadRoutineSets(selectedRoutine.id)
    setSuccessMsg('Rutina resetejada per al proper dia!')
  }

  async function handleCreateRoutine() {
    if (!user) return
    if (!newRoutineName.trim()) {
      setErrorMsg('Escriu un nom per a la rutina')
      return
    }

    if (!isSchemaFixed) {
      setErrorMsg('Error: La taula "routines" no existeix. Executa deploy-schema.sql a Supabase.')
      return
    }

    setLoading(true)
    setErrorMsg(null)

    try {
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
    } catch (err) {
      setLoading(false)
      setErrorMsg('Error inesperat creant rutina')
    }
  }

  async function handleAddExercise() {
    if (!selectedRoutine || !newExerciseName.trim()) return

    const exerciseExists = routineExercises.some(re => re.name === newExerciseName.trim())
    if (exerciseExists) {
      setErrorMsg('Aquest exercici ja està a la rutina')
      return
    }

    if (!isSchemaFixed) {
      setErrorMsg('Error: La taula "routine_exercises" no existeix. Executa deploy-schema.sql a Supabase.')
      return
    }

    setLoading(true)
    setErrorMsg(null)

    try {
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
      loadRoutineExercises(selectedRoutine.id)
    } catch (err) {
      setLoading(false)
      setErrorMsg('Error inesperat afegint exercici')
    }
  }

  function handleSelectRoutine(routine: Routine) {
    setSelectedRoutine(routine)
  }

  function handleBackToList() {
    setSelectedRoutine(null)
    setRoutineExercises([])
    setRoutineSets({})
  }

  function handleAddExerciseClick() {
    setShowExerciseModal(true)
  }

  function handleCloseExerciseModal() {
    setShowExerciseModal(false)
    setNewExerciseName('')
  }

  function handleAddCustomExercise() {
    const trimmed = newExerciseName.trim()
    if (!trimmed) { setErrorMsg('Nom requerit'); return }
    if (DEFAULT_EXERCISES.includes(trimmed as Exercise) || customExercises.includes(trimmed)) { 
      setErrorMsg('Ja existeix'); return 
    }
    const updated = [...customExercises, trimmed]
    setCustomExercises(updated)
    localStorage.setItem('custom_exercises', JSON.stringify(updated))
    setNewExerciseName(''); setErrorMsg(null); setShowExerciseModal(false)
  }

  async function getWeightRecommendation(exercise: string, targetReps: number) {
    if (!isSchemaFixed || !user) return null
    
    try {
      const { data, error } = await supabase
        .rpc('get_weight_recommendation', {
          p_user_id: user.id,
          p_exercise: exercise,
          p_target_reps: targetReps
        })

      if (error) {
        console.log('Weight recommendation error (may not exist):', error.message)
        return null
      }

      return data
    } catch (err) {
      console.log('Weight recommendation error:', err)
      return null
    }
  }

  async function saveWorkoutLogFromRoutine() {
    if (!selectedRoutine || !isSchemaFixed) return

    // Guardar todos los sets completados como workout_logs
    const allSets = Object.values(routineSets).flat()
    const completedSets = allSets.filter(s => s.completed && !s.workout_log_id)
    
    if (completedSets.length === 0) {
      setErrorMsg('No hi ha sets completats per guardar')
      return
    }

    setLoading(true)
    setErrorMsg(null)

    try {
      for (const set of completedSets) {
        const exercise = routineExercises.find(re => re.id === set.routine_exercise_id)
        if (!exercise || exercise.name == null || exercise.reps_min === undefined) continue

        // Buscar recomendació de pes
        let recommendedWeight = null
        try {
                      const rec = await getWeightRecommendation(exercise.name, exercise.reps_min ?? 0)
          if (rec && rec[0]?.recommended_weight) {
            recommendedWeight = rec[0].recommended_weight
          }
        } catch (e) {
          // Ignorar si la funció no existeix
        }

        const { data, error } = await supabase
          .from('workout_logs')
          .insert({
             exercise: exercise.name,
            weight: recommendedWeight || ((exercise.reps_min ?? 0) * 5), // Estimació
            reps: Math.floor(((exercise.reps_min ?? 0) + (exercise.reps_max ?? 0)) / 2),
            rir: 0,
            one_rm: recommendedWeight ? Math.round(recommendedWeight / (1.0278 - 0.0278 * (exercise.reps_min ?? 0))) : 0,
            user_id: user!.id
          })
          .select()
          .maybeSingle()

        if (!error && data) {
          // Actualitzar el set amb el workout_log_id
          await supabase
            .from('routine_sets')
            .update({ workout_log_id: data.id })
            .eq('id', set.id)
        }
      }

      setSuccessMsg('Entrenament guardat correctament!')
      loadRoutineSets(selectedRoutine.id)
    } catch (err) {
      console.error('Error saving workout log:', err)
      setErrorMsg('Error guardant l\'entrenament')
    } finally {
      setLoading(false)
    }
  }

  const loadCustomExercises = () => {
    const saved = localStorage.getItem('custom_exercises')
    if (saved) setCustomExercises(JSON.parse(saved))
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-3xl font-light mb-2">rutines.</h1>
          <p className="text-zinc-500 mb-8">Inicia sessió per començar</p>
          <a href="/login" className="inline-block py-4 px-8 rounded-2xl font-medium bg-white text-black hover:bg-zinc-200 transition-colors">
            Entrar
          </a>
        </div>
      </div>
    )
  }

  if (!selectedRoutine) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="px-6 pt-8 pb-6">
          {isSchemaFixed === false && (
            <div className="px-4 py-3 bg-yellow-900/50 border border-yellow-800 rounded-2xl mb-4">
              <p className="text-yellow-400 text-sm">
                ⚠️ Cal configurar el schema: Executa deploy-schema.sql a Supabase SQL Editor
              </p>
            </div>
          )}
          
          <h1 className="text-xl font-medium tracking-tight text-zinc-400">rutines.</h1>
        </div>

        <div className="px-6 space-y-4">
          {routines.length === 0 ? (
            <p className="text-zinc-500 text-sm mt-4">
              {isSchemaFixed === false 
                ? 'Les taules encara no existeixen. Completa el pas 1.'
                : 'No tens cap rutina creada'
              }
            </p>
          ) : (
            routines.map(routine => (
              <div
                key={routine.id}
                onClick={() => handleSelectRoutine(routine)}
                className="border border-zinc-900 rounded-2xl p-4 cursor-pointer hover:bg-zinc-900/50 transition-colors"
              >
                <p className="text-white font-light text-lg">{routine.name}</p>
                <p className="text-zinc-500 text-xs mt-1">
                  {isSchemaFixed 
                    ? `${routineExercises.filter(re => re.routine_id === routine.id).length} exercicis`
                    : 'Carregant...'
                  }
                </p>
              </div>
            ))
          )}

          <button
            onClick={() => {
              if (isSchemaFixed === false) {
                setErrorMsg('Completa el pas 1 del fix abans de crear rutines')
                return
              }
              setShowRoutineModal(true)
            }}
            className="w-full py-4 rounded-2xl font-medium bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 transition-colors"
          >
            + Nova Rutina
          </button>
        </div>

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
                <button onClick={handleCreateRoutine} disabled={loading || isSchemaFixed === false} className="flex-1 py-3 rounded-2xl bg-white text-black font-light disabled:opacity-50">
                  {loading ? 'Creant...' : 'Crear'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="h-20" />
      </div>
    )
  }

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
        <div className="px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
          <p className="text-zinc-300 text-sm">
            Progressió: {routineExercises.filter(re => {
              const sets = routineSets[re.id] || []
              return sets.length > 0 && sets.every(s => s.completed)
            }).length}/{routineExercises.length} exercicis completats
          </p>
        </div>

        {routineExercises.map(exercise => {
          if (!exercise || !exercise.name) return null;
          
          const sets = routineSets[exercise.id] || []
          const completedSets = sets.filter(s => s.completed).length
          const allCompleted = sets.length >= exercise.sets_target && sets.every(s => s.completed)
          
          return (
            <div key={exercise.id} className="border border-zinc-900 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-white font-light">{exercise.name}</p>
                  <p className="text-zinc-500 text-xs">
                    {exercise.sets_target} sèries × {exercise.reps_min}-{exercise.reps_max} reps
                  </p>
                </div>
                <button
                  onClick={() => {
                    const newExercises = routineExercises.filter(re => re.id !== exercise.id)
                    setRoutineExercises(newExercises)
                  }}
                  className="text-zinc-500 hover:text-red-400 text-lg px-2"
                >
                  ×
                </button>
              </div>
              
              <button
                onClick={async () => {
                  if (isSchemaFixed) {
                    const rec = await getWeightRecommendation(exercise.name!, exercise.reps_min ?? 0)
                    if (rec && rec[0]) {
                      setSuccessMsg(`Recomanació per ${exercise.name!}: ${rec[0].recommended_weight}kg (anterior: ${rec[0].previous_weight}kg × ${rec[0].previous_reps})`)
                    } else {
                      setSuccessMsg('No hi ha historial per a aquest exercici')
                    }
                  }
                }}
                disabled={!isSchemaFixed}
                className="text-xs px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 disabled:opacity-50"
              >
                💡 Recomanar Pes
              </button>
              
              {sets.map((set, idx) => (
                <div 
                  key={set.id || idx}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                    set.completed 
                      ? 'bg-green-900/30 border-green-800' 
                      : 'bg-gray-900/20 border-gray-700'
                  }`}
                >
                  <div className="flex-1">
                    <p className="text-white">{set.weight}kg × {set.reps} reps</p>
                    {set.rir > 0 && <p className="text-xs text-gray-400">RIR {set.rir}</p>}
                  </div>
                  <button
                    onClick={() => {
                      const updatedSets = [...sets];
                      updatedSets[idx] = {
                        ...updatedSets[idx],
                        completed: !updatedSets[idx].completed
                      };
                      setRoutineSets({
                        ...routineSets,
                        [exercise.id]: updatedSets
                      });
                    }}
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      set.completed 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-gray-600 hover:bg-gray-500'
                    }`}
                  >
                    {set.completed ? '✓' : '+'}
                  </button>
                </div>
              ))}
              
              {!allCompleted && sets.length < exercise.sets_target && (
                <button
                  onClick={() => {
                    const updatedSets = [...sets];
                    updatedSets.push({
                      id: crypto.randomUUID(),
                      routine_exercise_id: exercise.id,
                      set_number: sets.length + 1,
                      weight: 0,
                      reps: 0,
                      rir: 0,
                      completed: false,
                      created_at: new Date().toISOString()
                    });
                    setRoutineSets({
                      ...routineSets,
                      [exercise.id]: updatedSets
                    });
                  }}
                  className="w-full mt-2 px-4 py-2 bg-gray-800/50 text-gray-300 text-sm rounded hover:bg-gray-800"
                >
                  + Afegir série
                </button>
              )}
              
              {allCompleted && (
                <button
                   onClick={async () => {
                     if (isSchemaFixed) {
                       setLoading(true);
                       try {
                         const { data, error } = await supabase
                           .from('workout_logs')
                           .insert({
                             exercise: exercise.name,
                             weight: sets.reduce((max, set) => Math.max(max, set.weight), 0),
                             reps: sets.reduce((max, set) => Math.max(max, set.reps), 0),
                             rir: 0,
                             one_rm: sets.reduce((max, set) => Math.max(max, calculate1RM(set.weight, set.reps)), 0),
                             user_id: user!.id,
                             routine_id: selectedRoutine?.id || null,
                             completed_at: new Date().toISOString()
                           });
                        
                        if (error) throw error;
                        
                        setSuccessMsg('Entrenament enregistrat correctament!');
                        setRoutineSets({
                          ...routineSets,
                          [exercise.id]: sets.map(set => ({
                            ...set,
                            completed: true
                          }))
                        });
                      } catch (err) {
                        console.error('Error saving workout:', err);
                        setErrorMsg('Error al guardar l\'entrenament');
                      } finally {
                        setLoading(false);
                      }
                    }
                  }}
                  disabled={loading}
                  className={`w-full mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded ${
                    loading ? 'opacity-50' : ''
                  }`}
                >
                  {loading ? 'Guardant...' : 'Marca com completat'}
                </button>
              )}
            </div>
          );
        })}

        <button
          onClick={handleAddExerciseClick}
          disabled={!isSchemaFixed}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400 transition-colors disabled:opacity-50"
        >
          + Afegir Exercici
        </button>

        <button
          onClick={resetRoutineForNextDay}
          disabled={!isSchemaFixed}
          className="w-full py-3 rounded-2xl bg-zinc-900 text-zinc-400 text-sm disabled:opacity-50"
        >
          🔄 Reset per a nova sessió
        </button>

        <button
          onClick={saveWorkoutLogFromRoutine}
          disabled={!isSchemaFixed}
          className="w-full py-3 rounded-2xl bg-green-900/30 border border-green-800 text-green-400 text-sm hover:bg-green-900/50 disabled:opacity-50"
        >
          💾 Guardar Entrenament
        </button>

        {showExerciseModal && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6" onClick={handleCloseExerciseModal}>
            <div className="bg-zinc-900 rounded-3xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-light text-white mb-4">Afegir Exercici</h3>
              
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
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
              
              {errorMsg && <p className="text-red-400 text-sm mb-3">{errorMsg}</p>}
              
              <div className="flex gap-3">
                <button onClick={handleCloseExerciseModal} className="flex-1 py-3 rounded-2xl bg-zinc-800 text-zinc-400 font-light">Cancel·lar</button>
              </div>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="fixed bottom-8 left-6 right-6 px-4 py-3 bg-green-900/50 border border-green-800 rounded-2xl z-50">
            <p className="text-green-400 text-sm text-center">{successMsg}</p>
          </div>
        )}
      </div>

      <div className="h-20" />
    </div>
  )
}
