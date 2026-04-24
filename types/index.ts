// Tipus compartits per a l'aplicació

export type Exercise = 
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

export const DEFAULT_EXERCISES: Exercise[] = [
  'Press Banca', 'Lat Pulldown', 'Sentadilles', 'Leg Press',
  'Dominades', 'Press Military', 'Curl de Bíceps', 'Extensiones Tricep',
  'French Press', 'Zancadas',
]

export interface WorkoutLog {
  id: string
  user_id: string
  exercise: Exercise
  weight: number
  reps: number
  rir: number
  one_rm: number
  created_at: string
}

export interface Routine {
  id: string
  user_id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
}

export interface RoutineExercise {
  id: string
  routine_id: string
  exercise: Exercise
  sets_target: number
  reps_min: number
  reps_max: number
  order_index: number
}

export interface RoutineSet {
  id: string
  routine_exercise_id: string
  workout_log_id?: string | null
  set_number: number
  completed: boolean
  notes?: string | null
  completed_at?: string | null
  created_at: string
}

// Funcions auxiliars
export function calculate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0
  return Math.round(weight / (1.0278 - 0.0278 * reps) * 10) / 10
}
