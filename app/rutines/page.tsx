'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Exercise, DEFAULT_EXERCISES, Routine, RoutineExercise, RoutineSet, WorkoutLog, calculate1RM, EXERCISE_KEYS } from '@/types'
import { useTranslation } from '../contexts/LanguageContext'
import { useUnit } from '../contexts/UnitContext'
import { ROUTINE_TEMPLATES } from '../lib/routineTemplates'
import RestTimer from '../components/RestTimer'
import QuickLogFab from '../components/QuickLogFab'
import { DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function SortableExerciseItem({ id, children }: { id: string; children: (handleProps: { ref: any; style: any; attributes: any; listeners: any; isDragging: boolean }) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : undefined,
  }
  return <>{children({ ref: setNodeRef, style, attributes, listeners, isDragging })}</>
}

type CustomExercises = string[]

export default function RutinesPage() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const { unit, toKg, fromKg, format } = useUnit()
  const tEx = (name: string) => { const key = EXERCISE_KEYS[name]; return key ? t(key) : name }
  const [routines, setRoutines] = useState<Routine[]>([])
  const [routineExerciseCounts, setRoutineExerciseCounts] = useState<Record<string, number>>({})
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
   const [lastSessions, setLastSessions] = useState<Record<string, { date: string; sets: { weight: number; reps: number; rir: number | null }[] }>>({})
   const [selectedTemplate, setSelectedTemplate] = useState<string>('')

  const allExercises = [...DEFAULT_EXERCISES, ...customExercises]

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  async function handleExerciseDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = routineExercises.findIndex(e => e.id === active.id)
    const newIdx = routineExercises.findIndex(e => e.id === over.id)
    if (oldIdx < 0 || newIdx < 0) return
    const reordered = arrayMove(routineExercises, oldIdx, newIdx)
    setRoutineExercises(reordered)
    // Persist new order_index for each item
    const updates = reordered.map((ex, i) => supabase.from('routine_exercises').update({ order_index: i }).eq('id', ex.id))
    const results = await Promise.all(updates)
    const firstErr = results.find(r => r.error)
    if (firstErr?.error) {
      console.error('Error reordering:', firstErr.error)
      setErrorMsg('Error en reordenar exercicis')
    }
  }

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
      loadLastSessions(routineExercises.map(e => e.exercise))
    }
  }, [selectedRoutine, routineExercises])

  async function loadLastSessions(exerciseNames: string[]) {
    if (!user || exerciseNames.length === 0) return
    const uniq = Array.from(new Set(exerciseNames))
    const { data } = await supabase
      .from('workout_logs')
      .select('exercise, weight, reps, rir, created_at')
      .eq('user_id', user.id)
      .in('exercise', uniq)
      .order('created_at', { ascending: false })
      .limit(500)

    if (!data) return
    const grouped: Record<string, { date: string; sets: { weight: number; reps: number; rir: number | null }[] }> = {}
    for (const log of data) {
      const dayKey = new Date(log.created_at).toISOString().slice(0, 10)
      const entry = grouped[log.exercise]
      if (!entry) {
        grouped[log.exercise] = { date: dayKey, sets: [{ weight: log.weight, reps: log.reps, rir: log.rir }] }
      } else if (entry.date === dayKey) {
        entry.sets.push({ weight: log.weight, reps: log.reps, rir: log.rir })
      }
    }
    // Logs come DESC; reverse each exercise's sets so set 1 = chronologically first
    for (const ex of Object.keys(grouped)) grouped[ex].sets.reverse()
    setLastSessions(grouped)
  }

  // Netejar missatges després de 3 segons
  useEffect(() => {
    if (successMsg || errorMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg(null)
        setErrorMsg(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [successMsg, errorMsg])

   // Assegurar que cada exercici té les sèries inicialitzades / sincronitzades
   useEffect(() => {
     if (selectedRoutine && routineExercises.length > 0) {
       routineExercises.forEach(ex => {
         syncExerciseSets(ex.id, ex.sets_target)
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
      if (data) {
        setRoutines(data)
        // Load exercise counts for each routine
        const counts: Record<string, number> = {}
        for (const routine of data) {
          const { count } = await supabase
            .from('routine_exercises')
            .select('*', { count: 'exact', head: true })
            .eq('routine_id', routine.id)
          counts[routine.id] = count || 0
        }
        setRoutineExerciseCounts(counts)
      }
    }

   // Càrrega d'exercicis d'una rutina
   async function loadRoutineExercises(routineId: string): Promise<RoutineExercise[]> {
     const { data, error } = await supabase
       .from('routine_exercises')
       .select('*')
       .eq('routine_id', routineId)
       .order('order_index', { ascending: true })
     
     if (error) {
       console.error('Error loading routine exercises:', error)
       return []
     }
     if (data) setRoutineExercises(data)
     return data || []
   }

   // Càrrega de series completades d'una rutina
   async function loadRoutineSets(routineId: string, exerciseIds?: string[]) {
     const ids = exerciseIds || routineExercises.map(re => re.id)
     if (ids.length === 0) return

     const { data, error } = await supabase
       .from('routine_sets')
       .select('*')
       .in('routine_exercise_id', ids)
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
    const template = ROUTINE_TEMPLATES.find(t => t.id === selectedTemplate) || null

    // If no template and no name, error
    if (!template && !newRoutineName.trim()) {
      setErrorMsg('Escriu un nom per a la rutina o tria una plantilla')
      return
    }

    setLoading(true)
    setErrorMsg(null)

    try {
      if (template) {
        // Create one routine per template entry
        for (const r of template.routines) {
          const routineName = template.routines.length === 1 && newRoutineName.trim()
            ? newRoutineName.trim()
            : r.name
          const { data: newRoutine, error: rErr } = await supabase
            .from('routines')
            .insert({ user_id: user.id, name: routineName, description: template.name })
            .select()
            .single()
          if (rErr || !newRoutine) throw rErr || new Error('No s\'ha pogut crear la rutina')

          // Insert exercises with sets
          for (let i = 0; i < r.exercises.length; i++) {
            const ex = r.exercises[i]
            const { data: newEx, error: eErr } = await supabase
              .from('routine_exercises')
              .insert({
                routine_id: newRoutine.id,
                exercise: ex.exercise,
                sets_target: ex.sets_target,
                reps_min: ex.reps_min,
                reps_max: ex.reps_max,
                order_index: i,
              })
              .select()
              .single()
            if (eErr || !newEx) throw eErr || new Error('No s\'ha pogut crear l\'exercici')
            const setsToInsert = Array.from({ length: ex.sets_target }, (_, k) => ({
              routine_exercise_id: newEx.id,
              set_number: k + 1,
              completed: false,
            }))
            await supabase.from('routine_sets').insert(setsToInsert)
          }
        }
        setSuccessMsg(template.routines.length > 1 ? 'Rutines creades!' : 'Rutina creada!')
      } else {
        const { error } = await supabase
          .from('routines')
          .insert({ user_id: user.id, name: newRoutineName.trim(), description: '' })
        if (error) throw error
        setSuccessMsg('Rutina creada!')
      }
    } catch (err: any) {
      setLoading(false)
      setErrorMsg('Error al crear rutina: ' + (err.message || 'desconegut'))
      return
    }

    setLoading(false)
    setShowRoutineModal(false)
    setNewRoutineName('')
    setSelectedTemplate('')
    loadRoutines()
  }

   // Seleccionar rutina
   function handleSelectRoutine(routine: Routine) {
     setSelectedRoutine(routine)
   }

   // Obrir modal edició rutina
   function handleOpenEditRoutine(routine: Routine) {
     setEditingRoutine(routine)
     setEditRoutineName(routine.name)
     setShowEditRoutineModal(true)
   }

   // Actualitzar nom de rutina
   async function handleUpdateRoutine() {
     if (!editingRoutine || !editRoutineName.trim()) return

     setLoading(true)
     setErrorMsg(null)

     const { error } = await supabase
       .from('routines')
       .update({ name: editRoutineName.trim() })
       .eq('id', editingRoutine.id)

     setLoading(false)

     if (error) {
       setErrorMsg('Error en actualitzar: ' + error.message)
       return
     }

     setShowEditRoutineModal(false)
     setEditingRoutine(null)
     setEditRoutineName('')
     loadRoutines()
     if (selectedRoutine?.id === editingRoutine.id) {
       setSelectedRoutine(prev => prev ? { ...prev, name: editRoutineName.trim() } : null)
     }
     setSuccessMsg('Rutina actualitzada')
   }

   // Obrir modal edició exercici
   function handleOpenEditExercise(exercise: RoutineExercise) {
     setEditingExercise(exercise)
     setEditSetsTarget(exercise.sets_target)
     setEditRepsMin(exercise.reps_min)
     setEditRepsMax(exercise.reps_max)
     setShowEditExerciseModal(true)
   }

   // Actualitzar exercici
   async function handleUpdateExercise() {
     if (!editingExercise || !selectedRoutine) return
     if (editSetsTarget <= 0 || editRepsMin <= 0 || editRepsMax <= 0 || editRepsMin > editRepsMax) {
       setErrorMsg('Valors no vàlids')
       return
     }

     setLoading(true)
     setErrorMsg(null)

     const { error } = await supabase
       .from('routine_exercises')
       .update({
         sets_target: editSetsTarget,
         reps_min: editRepsMin,
         reps_max: editRepsMax
       })
       .eq('id', editingExercise.id)

     setLoading(false)

     if (error) {
       setErrorMsg('Error en actualitzar: ' + error.message)
       return
     }

     setShowEditExerciseModal(false)
     setEditingExercise(null)
     setSuccessMsg('Exercici actualitzat')

      // Recarregar exercicis i sets per reflectir canvis
      const exercises = await loadRoutineExercises(selectedRoutine.id)
      await loadRoutineSets(selectedRoutine.id, exercises.map(e => e.id))
   }

  // Tornar a la llista de rutines
  function handleBackToList() {
    setSelectedRoutine(null)
    setRoutineExercises([])
    setRoutineSets({})
  }

// Afegir exercici a la rutina
    async function handleAddExercise(exerciseName?: string) {
      if (!user || !selectedRoutine) return

      const exercise = exerciseName || newExerciseName
      if (!exercise || !exercise.trim()) return

      const exerciseTrimmed = exercise.trim()

      // Comprovar duplicats
      const exerciseExists = routineExercises.some(re => re.exercise === exerciseTrimmed)
      if (exerciseExists) {
        setErrorMsg('Aquest exercici ja està a la rutina')
        return
      }

      setLoading(true)
      setErrorMsg(null)

      try {
        // Si és un exercici personalitzat (no està en la llista per defecte), desar-lo també a saved_exercises
        const isDefaultExercise = DEFAULT_EXERCISES.includes(exerciseTrimmed as any)
        if (!isDefaultExercise) {
          // Comprovar si ja existeix a saved_exercises per aquest usuari
          const { data: existing } = await supabase
            .from('saved_exercises')
            .select('id')
            .eq('user_id', user.id)
            .eq('exercise', exerciseTrimmed)
            .single()

          if (!existing) {
            const { error: saveError } = await supabase
              .from('saved_exercises')
              .insert({ user_id: user.id, exercise: exerciseTrimmed })

            if (saveError) {
              console.error('Error saving custom exercise:', saveError)
            }
          }
        }

         // Inserir l'exercici a la rutina
         const { data, error } = await supabase
           .from('routine_exercises')
           .insert({
             routine_id: selectedRoutine.id,
             exercise: exerciseTrimmed,
             sets_target: 3,
             reps_min: 8,
             reps_max: 12,
             order_index: routineExercises.length
           })
           .select()
           .single()

        if (error) {
          console.error('Supabase error adding exercise:', error)
          setErrorMsg('Error al afegir exercici: ' + error.message)
          return
        }

        // Generar les sèries inicials (3 per defecte)
        const newSets = []
        const newRoutineSets: Record<string, RoutineSet[]> = { ...routineSets }
        for (let i = 1; i <= 3; i++) {
          const setId = crypto.randomUUID()
          newSets.push({
            routine_exercise_id: data.id,
            set_number: i,
            completed: false
          })
          if (!newRoutineSets[data.id]) {
            newRoutineSets[data.id] = []
          }
          newRoutineSets[data.id].push({
            id: setId,
            routine_exercise_id: data.id,
            set_number: i,
            weight: 0,
            reps: 0,
            rir: 0,
            completed: false,
            created_at: new Date().toISOString()
          })
        }
        await supabase.from('routine_sets').insert(newSets)

        // Actualitzar exercicis de la rutina i recomptar
        setRoutineExercises(prev => [...prev, data])
        setRoutineSets(newRoutineSets)

        const { count } = await supabase
          .from('routine_exercises')
          .select('*', { count: 'exact', head: true })
          .eq('routine_id', selectedRoutine.id)
        setRoutineExerciseCounts(prev => ({
          ...prev,
          [selectedRoutine.id]: count || 0
        }))

        setNewExerciseName('')
        setShowExerciseModal(false)
        setSuccessMsg('Exercici afegit')
      } catch (err) {
        console.error('Error in handleAddExercise:', err)
        setErrorMsg('Error inesperat al afegir exercici')
      } finally {
        setLoading(false)
      }
    }

   // Eliminar exercici de la rutina
   async function handleRemoveExercise(exerciseId: string) {
     // Eliminar sets associats primer
     await supabase.from('routine_sets').delete().eq('routine_exercise_id', exerciseId)

     const { error } = await supabase
       .from('routine_exercises')
       .delete()
       .eq('id', exerciseId)

     if (error) {
       setErrorMsg('Error al eliminar exercici')
       return
     }

     setRoutineExercises(prev => prev.filter(re => re.id !== exerciseId))
     setRoutineSets(prev => {
       const next = { ...prev }
       delete next[exerciseId]
       return next
     })
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

   // Funció per sincronitzar els sets d'un exercici amb el seu sets_target
   async function syncExerciseSets(exerciseId: string, setsTarget: number) {
     if (!exerciseId) return

     try {
       const { data: existingSets } = await supabase
         .from('routine_sets')
         .select('*')
         .eq('routine_exercise_id', exerciseId)
         .order('set_number', { ascending: true })

       const currentCount = existingSets?.length || 0

       if (currentCount < setsTarget) {
         // Afegir sets faltants
         const newSets: RoutineSet[] = []
         for (let i = currentCount + 1; i <= setsTarget; i++) {
           newSets.push({
             id: crypto.randomUUID(),
             routine_exercise_id: exerciseId,
             set_number: i,
             weight: 0,
             reps: 0,
             rir: 0,
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
       } else if (currentCount > setsTarget) {
         // Eliminar sets sobrants (els més alts)
         const setsToRemove = (existingSets || []).slice(setsTarget).map(s => s.id)
         if (setsToRemove.length > 0) {
           await supabase.from('routine_sets').delete().in('id', setsToRemove)
           const newSets = (existingSets || []).slice(0, setsTarget)
           setRoutineSets(prev => ({
             ...prev,
             [exerciseId]: newSets
           }))
         }
       }
     } catch (error) {
       console.error('Error syncing sets:', error)
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

     // Auto-arrencar timer de descans quan es marca una sèrie completada
     if (completed && typeof window !== 'undefined') {
       const restPreset = parseInt(localStorage.getItem('rest_timer_default') || '90', 10)
       window.dispatchEvent(new CustomEvent('rest-timer:start', { detail: { seconds: restPreset } }))
     }
   }

   // Actualitzar pes i reps d'una sèrie
   async function handleUpdateSet(exerciseId: string, setId: string, weight: number, reps: number) {
     setRoutineSets(prev => {
       const current = prev[exerciseId] || []
       const updated = current.map(s => 
         s.id === setId ? { ...s, weight, reps } : s
       )
       return { ...prev, [exerciseId]: updated }
     })

     const { error } = await supabase
       .from('routine_sets')
       .update({ weight, reps })
       .eq('id', setId)

     if (error) {
       console.error('Error updating set:', error)
     }
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
      <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
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
                 className="border border-zinc-900 rounded-2xl p-4"
               >
                 <div 
                   className="cursor-pointer hover:text-zinc-300"
                   onClick={() => handleSelectRoutine(routine)}
                 >
                    <p className="text-[var(--color-text-primary)] font-light text-lg">{routine.name}</p>
                    <p className="text-zinc-500 text-xs mt-1">
                      {routineExerciseCounts[routine.id] || 0} exercicis
                    </p>
                 </div>
                 <button
                   onClick={() => handleOpenEditRoutine(routine)}
                   className="text-zinc-500 hover:text-white text-sm mt-2 px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
                 >
                   ✏️ Editar
                 </button>
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
           <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6" onClick={() => { setShowRoutineModal(false); setSelectedTemplate('') }}>
             <div className="bg-zinc-900 rounded-3xl p-6 w-full max-w-sm max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
               <h3 className="text-lg font-light text-white mb-4">Nova Rutina</h3>

               <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Plantilla</p>
               <div className="space-y-2 mb-4">
                 <button
                   type="button"
                   onClick={() => setSelectedTemplate('')}
                   className={`w-full text-left px-3 py-2 rounded-xl border transition-colors ${selectedTemplate === '' ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}`}
                 >
                   <p className="text-sm font-light">Buida</p>
                   <p className="text-xs text-zinc-500">Començar des de zero</p>
                 </button>
                 {ROUTINE_TEMPLATES.map(tpl => (
                   <button
                     key={tpl.id}
                     type="button"
                     onClick={() => setSelectedTemplate(tpl.id)}
                     className={`w-full text-left px-3 py-2 rounded-xl border transition-colors ${selectedTemplate === tpl.id ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}`}
                   >
                     <p className="text-sm font-light">{tpl.name}</p>
                     <p className="text-xs text-zinc-500">{tpl.description}</p>
                   </button>
                 ))}
               </div>

               {(!selectedTemplate || ROUTINE_TEMPLATES.find(t => t.id === selectedTemplate)?.routines.length === 1) && (
                 <input
                   type="text"
                   value={newRoutineName}
                   onChange={(e) => setNewRoutineName(e.target.value)}
                   placeholder={selectedTemplate ? 'Nom personalitzat (opcional)' : 'Nom de la rutina'}
                   className="w-full bg-black text-white rounded-2xl px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-zinc-700"
                 />
               )}
               {errorMsg && <p className="text-red-400 text-sm mb-3">{errorMsg}</p>}
               <div className="flex gap-3">
                 <button onClick={() => { setShowRoutineModal(false); setSelectedTemplate('') }} className="flex-1 py-3 rounded-2xl bg-zinc-800 text-zinc-400 font-light">Cancel·lar</button>
                  <button onClick={handleCreateRoutine} disabled={loading} className="flex-1 py-3 rounded-2xl bg-[var(--color-text-primary)] text-[var(--color-bg-primary)] font-light disabled:opacity-50">{loading ? '...' : 'Crear'}</button>
               </div>
             </div>
           </div>
         )}

         {/* Modal Editar Rutina */}
         {showEditRoutineModal && editingRoutine && (
           <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6" onClick={() => setShowEditRoutineModal(false)}>
             <div className="bg-zinc-900 rounded-3xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
               <h3 className="text-lg font-light text-white mb-4">Editar Rutina</h3>
               <input
                 type="text"
                 value={editRoutineName}
                 onChange={(e) => setEditRoutineName(e.target.value)}
                 placeholder="Nom de la rutina"
                 className="w-full bg-black text-white rounded-2xl px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-zinc-700"
                 autoFocus
               />
               {errorMsg && <p className="text-red-400 text-sm mb-3">{errorMsg}</p>}
               <div className="flex gap-3">
                 <button onClick={() => setShowEditRoutineModal(false)} className="flex-1 py-3 rounded-2xl bg-zinc-800 text-zinc-400 font-light">Cancel·lar</button>
                  <button onClick={handleUpdateRoutine} className="flex-1 py-3 rounded-2xl bg-[var(--color-text-primary)] text-[var(--color-bg-primary)] font-light">Guardar</button>
               </div>
             </div>
           </div>
         )}

        {successMsg && (
          <div className="fixed bottom-8 left-6 right-6 px-4 py-3 bg-green-900/50 border border-green-800 rounded-2xl">
            <p className="text-green-400 text-sm text-center">{successMsg}</p>
          </div>
        )}

        <QuickLogFab />
        <div className="h-20" />
      </div>
    )
  }

  // Renderitzar detall de rutina
  const screens = [{ label: 'Llista' }]

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
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
        <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleExerciseDragEnd}>
          <SortableContext items={routineExercises.map(e => e.id)} strategy={verticalListSortingStrategy}>
        {routineExercises.map(exercise => {
          const sets = routineSets[exercise.id] || []
          const completedSets = sets.filter(s => s.completed).length
          const allCompleted = sets.length >= exercise.sets_target && sets.every(s => s.completed)

          return (
            <SortableExerciseItem key={exercise.id} id={exercise.id}>
              {({ ref, style, attributes, listeners, isDragging }) => (
            <div ref={ref} style={style} {...attributes} className={`border rounded-2xl p-4 space-y-3 ${isDragging ? 'border-zinc-600 bg-zinc-900/80' : 'border-zinc-900'}`}>
               <div className="flex justify-between items-start">
                 <button
                   {...listeners}
                   type="button"
                   className="touch-none cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-300 px-2 py-1 -ml-2"
                   aria-label="Arrossegar per reordenar"
                   title="Arrossegar per reordenar"
                 >
                   <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="5" cy="3" r="1.5"/><circle cx="11" cy="3" r="1.5"/><circle cx="5" cy="8" r="1.5"/><circle cx="11" cy="8" r="1.5"/><circle cx="5" cy="13" r="1.5"/><circle cx="11" cy="13" r="1.5"/></svg>
                 </button>
                 <div className="flex-1">
                     <p className="text-[var(--color-text-primary)] font-light">{tEx(exercise.exercise)}</p>
                   <p className="text-zinc-500 text-xs">
                      {exercise.sets_target} sèries x {exercise.reps_min}-{exercise.reps_max} reps
                   </p>
                 </div>
                 <div className="flex gap-1">
                   <button
                     onClick={() => handleOpenEditExercise(exercise)}
                     className="text-zinc-500 hover:text-yellow-400 text-lg px-2"
                     title="Editar exercici"
                   >
                     ✏️
                   </button>
                    <button
                      onClick={() => handleRemoveExercise(exercise.id)}
                      className="text-zinc-500 hover:text-red-400 text-lg px-2"
                      title="Eliminar exercici"
                    >
                      x
                    </button>
                 </div>
               </div>

              {/* Última sessió */}
              {lastSessions[exercise.exercise] && (
                <div className="px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">Última sessió</p>
                    <p className="text-[10px] text-zinc-600">
                      {new Date(lastSessions[exercise.exercise].date).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {lastSessions[exercise.exercise].sets.map((s, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-md bg-zinc-800/60 text-zinc-300 font-light">
                        {format(s.weight)}{unit} × {s.reps}
                        {s.rir != null && <span className="text-zinc-500"> · RIR {s.rir}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Botó de recomanació de pes */}
<button
                  onClick={async () => {
                     const rec = await getWeightRecommendation(exercise.exercise, exercise.reps_min)
                      if (rec) {
                        setSuccessMsg(`Recomanació per ${tEx(exercise.exercise)}: ${format(rec.recommended_weight)}${unit} (anterior: ${format(rec.previous_weight)}${unit} x ${rec.previous_reps})`)
                      } else {
                        setSuccessMsg('No hi ha historial per a aquest exercici')
                      }
                  }}
                  className="text-xs px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                >
                💡 Recomanar Pes
              </button>

{/* Llista de series */}
               {sets.map((set, idx) => {
                 const prev = lastSessions[exercise.exercise]?.sets[set.set_number - 1]
                 const curW = set.weight || 0, curR = set.reps || 0
                 const hasCurrent = curR > 0 && (curW > 0 || (prev?.weight === 0))
                 const isBodyweight = prev?.weight === 0 && curW === 0
                 const curMetric = isBodyweight ? curR : calculate1RM(curW, curR)
                 const prevMetric = prev ? (isBodyweight ? prev.reps : calculate1RM(prev.weight, prev.reps)) : 0
                 const diff = curMetric - prevMetric
                 const diffPct = prevMetric > 0 ? Math.round((diff / prevMetric) * 100) : 0
                 return (
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

                   {!set.completed && (
                     <>
                       <input
                         type="number"
                         value={set.weight ? (unit === 'kg' ? set.weight : Number(fromKg(set.weight).toFixed(1))) : ''}
                         onChange={(e) => {
                           const inputVal = parseFloat(e.target.value) || 0
                           handleUpdateSet(exercise.id, set.id, toKg(inputVal), set.reps || 0)
                         }}
                         placeholder={prev ? format(prev.weight) : unit}
                         className="w-16 bg-black text-white rounded px-2 py-1 text-sm focus:outline-none"
                       />
                       <span className="text-zinc-500 text-xs">x</span>
                       <input
                         type="number"
                         value={set.reps || ''}
                         onChange={(e) => {
                           const r = parseInt(e.target.value) || 0
                           handleUpdateSet(exercise.id, set.id, set.weight || 0, r)
                         }}
                         placeholder={prev ? String(prev.reps) : 'reps'}
                         className="w-16 bg-black text-white rounded px-2 py-1 text-sm focus:outline-none"
                       />
                     </>
                   )}

                   {set.completed && (
                     <span className="text-zinc-400 text-sm">{format(set.weight)}{unit} x {set.reps} reps</span>
                   )}

                   {/* Comparador amb la sessió anterior */}
                   {prev && hasCurrent && prevMetric > 0 && (
                     <span
                       className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                         diff > 0
                           ? 'bg-green-900/50 text-green-400'
                           : diff < 0
                             ? 'bg-zinc-800 text-zinc-500'
                             : 'bg-yellow-900/40 text-yellow-400'
                       }`}
                       title={`Anterior: ${format(prev.weight)}${unit} × ${prev.reps}`}
                     >
                       {diff > 0 ? `▲ +${diffPct}%` : diff < 0 ? `▼ ${diffPct}%` : '= igual'}
                     </span>
                   )}
                   <span className="text-zinc-400 text-sm ml-auto">Sèrie {set.set_number}</span>
                   
                   {set.completed ? (
                     <span className="text-green-400 text-xs">Completada</span>
                   ) : (
                     <span className="text-zinc-600 text-xs">Pendent</span>
                   )}
                 </div>
                 )
               })}

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
              )}
            </SortableExerciseItem>
          )
        })}
          </SortableContext>
        </DndContext>

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
          <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-6" onClick={() => setShowExerciseModal(false)}>
            <div className="bg-zinc-900 rounded-3xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-light text-white mb-4">Afegir Exercici</h3>

              {errorMsg && <p className="text-red-400 text-sm mb-3">{errorMsg}</p>}

<div className="space-y-3 mb-4">
  <div className="flex gap-2">
    <input
      type="text"
      value={newExerciseName}
      onChange={(e) => setNewExerciseName(e.target.value)}
      placeholder="Nom de l'exercici..."
      className="flex-1 bg-black text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-700"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && newExerciseName.trim()) {
          handleAddExercise();
        }
      }}
    />
    <button
      onClick={() => {
        if (newExerciseName.trim()) {
          handleAddExercise();
        }
      }}
      className="px-4 py-2 rounded-xl bg-[var(--color-text-primary)] text-[var(--color-bg-primary)] text-sm font-medium whitespace-nowrap"
    >
      + Afegir
    </button>
  </div>

                 {allExercises.map(ex => (
                   <button
                     key={ex}
                     onClick={() => handleAddExercise(ex)}
                      className={`w-full px-4 py-2 rounded-xl text-sm text-left ${
                        newExerciseName === ex
                          ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-primary)]'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                   >
                     {ex}
                   </button>
                 ))}
               </div>

              <div className="flex gap-3">
                <button onClick={() => { setShowExerciseModal(false); setNewExerciseName(''); setErrorMsg(null); }} className="flex-1 py-3 rounded-2xl bg-zinc-800 text-zinc-400 font-light">Cancel·lar</button>
              </div>
            </div>
          </div>
        )}

       {/* Modal Editar Exercici */}
       {showEditExerciseModal && editingExercise && (
         <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6" onClick={() => setShowEditExerciseModal(false)}>
           <div className="bg-zinc-900 rounded-3xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
             <h3 className="text-lg font-light text-white mb-4">Editar Exercici</h3>
             <p className="text-zinc-400 text-sm mb-4">{tEx(editingExercise.exercise)}</p>
             
             <div className="space-y-4">
               <div>
                 <label className="text-zinc-500 text-xs uppercase tracking-wider block mb-2">Sèries objectiu</label>
                 <input
                   type="number"
                   min="1"
                   value={editSetsTarget}
                   onChange={(e) => setEditSetsTarget(parseInt(e.target.value) || 1)}
                   className="w-full bg-black text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-zinc-700"
                 />
               </div>
               <div>
                 <label className="text-zinc-500 text-xs uppercase tracking-wider block mb-2">Repeticions mínimes</label>
                 <input
                   type="number"
                   min="1"
                   value={editRepsMin}
                   onChange={(e) => setEditRepsMin(parseInt(e.target.value) || 1)}
                   className="w-full bg-black text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-zinc-700"
                 />
               </div>
               <div>
                 <label className="text-zinc-500 text-xs uppercase tracking-wider block mb-2">Repeticions màximes</label>
                 <input
                   type="number"
                   min="1"
                   value={editRepsMax}
                   onChange={(e) => setEditRepsMax(parseInt(e.target.value) || 1)}
                   className="w-full bg-black text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-zinc-700"
                 />
               </div>
             </div>

             {errorMsg && <p className="text-red-400 text-sm mb-3 mt-4">{errorMsg}</p>}

             <div className="flex gap-3 mt-6">
               <button onClick={() => setShowEditExerciseModal(false)} className="flex-1 py-3 rounded-2xl bg-zinc-800 text-zinc-400 font-light">Cancel·lar</button>
                <button onClick={handleUpdateExercise} className="flex-1 py-3 rounded-2xl bg-[var(--color-text-primary)] text-[var(--color-bg-primary)] font-light">Guardar</button>
             </div>
           </div>
         </div>
       )}

      {successMsg && (
        <div className="fixed bottom-8 left-6 right-6 px-4 py-3 bg-green-900/50 border border-green-800 rounded-2xl z-50">
          <p className="text-green-400 text-sm text-center">{successMsg}</p>
        </div>
      )}

      <RestTimer />
      <QuickLogFab />
      <div className="h-20" />
    </div>
  )
}
