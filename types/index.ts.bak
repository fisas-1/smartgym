// Tipus compartits per a l'aplicacio

export type MuscleGroup =
  | 'Pectoral'
  | 'Esquena'
  | 'Cames'
  | 'Esquitxos'
  | 'Braços'
  | 'Abdominals'
  | 'Full Body'

export type Exercise =
  | 'Press Banca'
  | 'Press Banca - Pes Corporal'
  | 'Lat Pulldown'
  | 'Sentadilles'
  | 'Sentadilles - Pes Corporal'
  | 'Leg Press'
  | 'Leg Press - Pes Corporal'
  | 'Dominades'
  | 'Dominades - Pes Corporal'
  | 'Press Military'
  | 'Curl de Bíceps'
  | 'Extensiones Tricep'
  | 'French Press'
  | 'Zancades'
  | 'Zancades - Pes Corporal'
  | string

export interface ExerciseInfo {
  name: Exercise
  muscleGroup: MuscleGroup
  defaultSets: number
  defaultRepsMin: number
  defaultRepsMax: number
  hasBodyweight: boolean
  hasWeight: boolean
}

export const DEFAULT_EXERCISES: Exercise[] = [
  'Press Banca', 'Press Banca - Pes Corporal',
  'Lat Pulldown', 'Sentadilles', 'Sentadilles - Pes Corporal',
  'Leg Press', 'Leg Press - Pes Corporal', 'Dominades', 'Dominades - Pes Corporal',
  'Press Military', 'Curl de Bíceps', 'Extensiones Tricep', 'French Press',
  'Zancades', 'Zancades - Pes Corporal',
]

export const EXERCISE_INFO: Record<Exercise, ExerciseInfo> = {
  'Press Banca': { name: 'Press Banca', muscleGroup: 'Pectoral', defaultSets: 3, defaultRepsMin: 8, defaultRepsMax: 12, hasBodyweight: true, hasWeight: true },
  'Press Banca - Pes Corporal': { name: 'Press Banca - Pes Corporal', muscleGroup: 'Pectoral', defaultSets: 3, defaultRepsMin: 8, defaultRepsMax: 15, hasBodyweight: true, hasWeight: false },
  'Lat Pulldown': { name: 'Lat Pulldown', muscleGroup: 'Esquena', defaultSets: 3, defaultRepsMin: 8, defaultRepsMax: 12, hasBodyweight: false, hasWeight: true },
  'Sentadilles': { name: 'Sentadilles', muscleGroup: 'Cames', defaultSets: 3, defaultRepsMin: 8, defaultRepsMax: 12, hasBodyweight: true, hasWeight: true },
  'Sentadilles - Pes Corporal': { name: 'Sentadilles - Pes Corporal', muscleGroup: 'Cames', defaultSets: 3, defaultRepsMin: 10, defaultRepsMax: 20, hasBodyweight: true, hasWeight: false },
  'Leg Press': { name: 'Leg Press', muscleGroup: 'Cames', defaultSets: 3, defaultRepsMin: 10, defaultRepsMax: 15, hasBodyweight: false, hasWeight: true },
  'Leg Press - Pes Corporal': { name: 'Leg Press - Pes Corporal', muscleGroup: 'Cames', defaultSets: 3, defaultRepsMin: 12, defaultRepsMax: 20, hasBodyweight: true, hasWeight: false },
  'Dominades': { name: 'Dominades', muscleGroup: 'Esquena', defaultSets: 3, defaultRepsMin: 5, defaultRepsMax: 8, hasBodyweight: true, hasWeight: true },
  'Dominades - Pes Corporal': { name: 'Dominades - Pes Corporal', muscleGroup: 'Esquena', defaultSets: 3, defaultRepsMin: 6, defaultRepsMax: 12, hasBodyweight: true, hasWeight: false },
  'Press Military': { name: 'Press Military', muscleGroup: 'Esquitxos', defaultSets: 3, defaultRepsMin: 8, defaultRepsMax: 12, hasBodyweight: false, hasWeight: true },
  'Curl de Bíceps': { name: 'Curl de Bíceps', muscleGroup: 'Braços', defaultSets: 3, defaultRepsMin: 10, defaultRepsMax: 15, hasBodyweight: false, hasWeight: true },
  'Extensiones Tricep': { name: 'Extensiones Tricep', muscleGroup: 'Braços', defaultSets: 3, defaultRepsMin: 10, defaultRepsMax: 15, hasBodyweight: false, hasWeight: true },
  'French Press': { name: 'French Press', muscleGroup: 'Braços', defaultSets: 3, defaultRepsMin: 8, defaultRepsMax: 12, hasBodyweight: false, hasWeight: true },
  'Zancades': { name: 'Zancades', muscleGroup: 'Cames', defaultSets: 3, defaultRepsMin: 8, defaultRepsMax: 12, hasBodyweight: true, hasWeight: true },
  'Zancades - Pes Corporal': { name: 'Zancades - Pes Corporal', muscleGroup: 'Cames', defaultSets: 3, defaultRepsMin: 10, defaultRepsMax: 20, hasBodyweight: true, hasWeight: false },
} as const

export interface WorkoutLog {
  id: string
  user_id: string
  exercise: Exercise
  muscleGroup?: MuscleGroup
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
  muscleGroup: MuscleGroup
  sets_target: number
  reps_min: number
  reps_max: number
  order_index: number
  editable_sets?: boolean
}

export interface RoutineSet {
  id: string
  routine_exercise_id: string
  workout_log_id?: string | null
  set_number: number
  weight: number
  reps: number
  rir: number
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
