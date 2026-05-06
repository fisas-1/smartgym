"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './contexts/AuthContext'

type Exercise =
  | 'Press Banca'
  | 'Lat Pulldown'
  | 'Sentadilles'
  | 'Leg Press'
  | 'Dominades'
  | 'Press Military'
  | 'Curl de Bíceps'
  | 'Extensiones Tricep'
  | 'French Press'
  | 'Zancadas'
  | string

const DEFAULT_EXERCISES: Exercise[] = [
  'Press Banca', 'Lat Pulldown', 'Sentadilles', 'Leg Press',
  'Dominades', 'Press Military', 'Curl de Bíceps', 'Extensiones Tricep',
  'French Press', 'Zancadas',
]

function calculate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0
  return Math.round(weight / (1.0278 - 0.0278 * reps))
}

async function analyzeOverload(exerciseName: string): Promise<string | null> {
  try {
    const { data: logs, error } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('exercise', exerciseName)
      .order('created_at', { ascending: false })
      .limit(14)

    if (error) {
      console.log('analyzeOverload - column exercise may not exist:', error.message)
      return null
    }
    
    if (!logs || logs.length < 2) return null

    const recentLogs = logs.slice(0, 7)
    const previousLogs = logs.slice(7, 14)
    if (previousLogs.length === 0) return null

    const avgRecent = recentLogs.reduce((sum, l) => sum + ((l as any).one_rm || 0), 0) / recentLogs.length
    const avgPrevious = previousLogs.reduce((sum, l) => sum + ((l as any).one_rm || 0), 0) / previousLogs.length

    if (avgRecent <= avgPrevious) return null

    const improvement = ((avgRecent - avgPrevious) / avgPrevious) * 100
    const targetWeight = Math.round((avgRecent + 2.5) * 10) / 10

    return `Avui: ${targetWeight}kg (${Math.round(improvement)}%↑)`
  } catch (err) {
    console.log('analyzeOverload error:', err)
    return null
  }
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
  const [isSchemaFixed, setIsSchemaFixed] = useState<boolean | null>(null)

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

  useEffect(() => { 
    if (user) {
      loadSavedSets()
      checkSchema()
    }
  }, [user])
  
  useEffect(() => { 
    if (exercise && isSchemaFixed) {
      analyzeOverload(exercise).then(setSuggestion)
    } else {
      setSuggestion(null)
    }
  }, [exercise, isSchemaFixed])

  async function checkSchema() {
    try {
      // Prova si la columna 'exercise' existe
      const { data, error } = await supabase
        .from('workout_logs')
        .select('exercise')
        .limit(1)
      
      if (error && error.message.includes('column')) {
        setIsSchemaFixed(false)
        console.log('⚠️ Schema not fixed: exercise column missing')
      } else {
        setIsSchemaFixed(true)
        console.log('✅ Schema is fixed')
      }
    } catch (err) {
      setIsSchemaFixed(false)
    }
  }

  async function loadSavedSets() {
    if (!user) {
      setSavedSets([])
      return
    }
    try {
      const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(8)
      
      if (error) {
        console.error('Error loading saved sets (may be schema issue):', error.message)
        setErrorMsg('Error carregant dades. Comprova que el schema estigui configurat.')
        return
      }
      
      if (data) setSavedSets(data)
    } catch (err) {
      console.error('Error loading sets:', err)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const w = parseFloat(weight), r = parseFloat(reps)
    if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0) return

    setLoading(true)
    setErrorMsg(null)
    
    const insertData: any = {
      exercise,
      weight: w,
      reps: r,
      rir: parseFloat(rir),
      user_id: user?.id
    }
    
    // Només afegim one_rm si el schema està fixat
    if (isSchemaFixed && oneRM > 0) {
      insertData.one_rm = oneRM
    }

    try {
      const { data, error } = await supabase
        .from('workout_logs')
        .insert(insertData)
        .select()
        .maybeSingle()
      
      setLoading(false)
      
      if (error) {
        console.error('Error saving set:', error)
        
        if (error.message.includes('column')) {
          setErrorMsg('Error: Cal configurar el schema de la base de dades. Executa deploy-schema.sql')
        } else {
          setErrorMsg('Error al guardar: ' + error.message)
        }
        return
      }
      
      setWeight(''); setReps(''); setRir('0')
      await loadSavedSets()
      setErrorMsg(null)
    } catch (err: any) {
      setLoading(false)
      console.error('Error saving:', err)
      setErrorMsg('Error inesperat. Comprova la configuració de la base de dades.')
    }
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
    <main className="flex min-h-screen flex-col items-center justify-between bg-background p-8">
      <h1 className="text-3xl font-bold text-foreground">
        Welcome to SmartGym
      </h1>
      <p className="text-foreground/60">
        Your fitness journey starts here
      </p>
    </main>
  )
}
