// Tipus compartits per a l'aplicacio

export type MuscleGroup =
  | 'Pectoral'
  | 'Esquena'
  | 'Cames'
  | 'Esquitxos'
  | 'Braços'
  | 'Abdominals'
  | 'Gluts'
  | 'Full Body'

export type Exercise =
  // Pectoral
  | 'Press Banca'
  | 'Press Banca Inclinat'
  | 'Chest Fly'
  | 'Flexions'
  // Esquitxos
  | 'Press Military'
  | 'Arnold Press'
  | 'Elevació Lateral'
  | 'Elevació Frontal'
  | 'Face Pull'
  // Esquena
  | 'Lat Pulldown'
  | 'Dominades'
  | 'Rem'
  | 'Pes Mort'
  // Braços
  | 'Curl de Bíceps'
  | 'Extensió Tríceps'
  | 'Dips'
  // Cames
  | 'Sentadilles'
  | 'Leg Press'
  | 'Zancades'
  | 'Pes Mort Romanès'
  | 'Leg Curl'
  | 'Leg Extension'
  | 'Elevació de Turmell'
  // Gluts
  | 'Hip Thrust'
  | 'Abducció de Maluc'
  // Abdominals
  | 'Crunch'
  | 'Planxa'
  | 'Elevació de Cames'
  | string

export type WeightType = 'pes' | 'corporal'

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
  // Pectoral
  'Press Banca',
  'Press Banca Inclinat',
  'Chest Fly',
  'Flexions',
  // Esquitxos
  'Press Military',
  'Arnold Press',
  'Elevació Lateral',
  'Elevació Frontal',
  'Face Pull',
  // Esquena
  'Lat Pulldown',
  'Dominades',
  'Rem',
  'Pes Mort',
  // Braços
  'Curl de Bíceps',
  'Extensió Tríceps',
  'Dips',
  // Cames
  'Sentadilles',
  'Leg Press',
  'Zancades',
  'Pes Mort Romanès',
  'Leg Curl',
  'Leg Extension',
  'Elevació de Turmell',
  // Gluts
  'Hip Thrust',
  'Abducció de Maluc',
  // Abdominals
  'Crunch',
  'Planxa',
  'Elevació de Cames',
]

// Variants disponibles per exercici (ordre = prioritat de display)
export const EXERCISE_VARIANTS: Record<string, string[]> = {
  'Press Banca':          ['Barra', 'Mancuernes', 'Màquina', 'Politja'],
  'Press Banca Inclinat': ['Barra', 'Mancuernes', 'Màquina'],
  'Chest Fly':            ['Politja', 'Mancuernes', 'Màquina'],
  'Press Military':       ['Barra', 'Mancuernes', 'Màquina'],
  'Elevació Lateral':     ['Mancuernes', 'Politja', 'Màquina'],
  'Elevació Frontal':     ['Mancuernes', 'Politja', 'Barra'],
  'Rem':                  ['Barra', 'Mancuerna', 'Politja', 'Màquina'],
  'Curl de Bíceps':       ['Mancuernes', 'Barra', 'Martell', 'Politja'],
  'Extensió Tríceps':     ['Politja', 'Barra', 'Mancuerna', 'Corda'],
  'Sentadilles':          ['Barra', 'Goblet', 'Frontal'],
  'Zancades':             ['Mancuernes', 'Barra', 'Búlgara'],
  'Pes Mort Romanès':     ['Barra', 'Mancuernes'],
  'Leg Curl':             ['Assegut', 'Ajagut'],
  'Elevació de Turmell':  ['Dempeus', 'Assegut'],
  'Hip Thrust':           ['Barra', 'Màquina', 'Banda Elàstica'],
}

// Claus de traducció per als noms de variant
export const VARIANT_KEYS: Record<string, string> = {
  'Barra':          'variant.barra',
  'Mancuernes':     'variant.mancuernes',
  'Mancuerna':      'variant.mancuerna',
  'Màquina':        'variant.maquina',
  'Politja':        'variant.politja',
  'Martell':        'variant.martell',
  'Corda':          'variant.corda',
  'Goblet':         'variant.goblet',
  'Frontal':        'variant.frontal',
  'Búlgara':        'variant.bulgara',
  'Assegut':        'variant.assegut',
  'Ajagut':         'variant.ajagut',
  'Dempeus':        'variant.dempeus',
  'Banda Elàstica': 'variant.bandaElastica',
}

export const EXERCISE_INFO: Record<string, ExerciseInfo> = {
  // Pectoral
  'Press Banca':          { name: 'Press Banca',          muscleGroup: 'Pectoral',   defaultSets: 4, defaultRepsMin: 6,  defaultRepsMax: 10, hasBodyweight: false, hasWeight: true },
  'Press Banca Inclinat': { name: 'Press Banca Inclinat', muscleGroup: 'Pectoral',   defaultSets: 3, defaultRepsMin: 8,  defaultRepsMax: 12, hasBodyweight: false, hasWeight: true },
  'Chest Fly':            { name: 'Chest Fly',            muscleGroup: 'Pectoral',   defaultSets: 3, defaultRepsMin: 12, defaultRepsMax: 15, hasBodyweight: false, hasWeight: true },
  'Flexions':             { name: 'Flexions',             muscleGroup: 'Pectoral',   defaultSets: 3, defaultRepsMin: 8,  defaultRepsMax: 15, hasBodyweight: true,  hasWeight: false },
  // Esquitxos
  'Press Military':       { name: 'Press Military',       muscleGroup: 'Esquitxos',  defaultSets: 3, defaultRepsMin: 8,  defaultRepsMax: 12, hasBodyweight: false, hasWeight: true },
  'Arnold Press':         { name: 'Arnold Press',         muscleGroup: 'Esquitxos',  defaultSets: 3, defaultRepsMin: 10, defaultRepsMax: 12, hasBodyweight: false, hasWeight: true },
  'Elevació Lateral':     { name: 'Elevació Lateral',     muscleGroup: 'Esquitxos',  defaultSets: 3, defaultRepsMin: 12, defaultRepsMax: 15, hasBodyweight: false, hasWeight: true },
  'Elevació Frontal':     { name: 'Elevació Frontal',     muscleGroup: 'Esquitxos',  defaultSets: 3, defaultRepsMin: 12, defaultRepsMax: 15, hasBodyweight: false, hasWeight: true },
  'Face Pull':            { name: 'Face Pull',            muscleGroup: 'Esquitxos',  defaultSets: 3, defaultRepsMin: 15, defaultRepsMax: 20, hasBodyweight: false, hasWeight: true },
  // Esquena
  'Lat Pulldown':         { name: 'Lat Pulldown',         muscleGroup: 'Esquena',    defaultSets: 3, defaultRepsMin: 8,  defaultRepsMax: 12, hasBodyweight: false, hasWeight: true },
  'Dominades':            { name: 'Dominades',            muscleGroup: 'Esquena',    defaultSets: 4, defaultRepsMin: 5,  defaultRepsMax: 8,  hasBodyweight: true,  hasWeight: true },
  'Rem':                  { name: 'Rem',                  muscleGroup: 'Esquena',    defaultSets: 3, defaultRepsMin: 8,  defaultRepsMax: 12, hasBodyweight: false, hasWeight: true },
  'Pes Mort':             { name: 'Pes Mort',             muscleGroup: 'Esquena',    defaultSets: 4, defaultRepsMin: 4,  defaultRepsMax: 6,  hasBodyweight: false, hasWeight: true },
  // Braços
  'Curl de Bíceps':       { name: 'Curl de Bíceps',       muscleGroup: 'Braços',     defaultSets: 3, defaultRepsMin: 10, defaultRepsMax: 15, hasBodyweight: false, hasWeight: true },
  'Extensió Tríceps':     { name: 'Extensió Tríceps',     muscleGroup: 'Braços',     defaultSets: 3, defaultRepsMin: 10, defaultRepsMax: 15, hasBodyweight: false, hasWeight: true },
  'Dips':                 { name: 'Dips',                 muscleGroup: 'Braços',     defaultSets: 3, defaultRepsMin: 8,  defaultRepsMax: 12, hasBodyweight: true,  hasWeight: true },
  // Cames
  'Sentadilles':          { name: 'Sentadilles',          muscleGroup: 'Cames',      defaultSets: 4, defaultRepsMin: 6,  defaultRepsMax: 10, hasBodyweight: true,  hasWeight: true },
  'Leg Press':            { name: 'Leg Press',            muscleGroup: 'Cames',      defaultSets: 3, defaultRepsMin: 10, defaultRepsMax: 12, hasBodyweight: false, hasWeight: true },
  'Zancades':             { name: 'Zancades',             muscleGroup: 'Cames',      defaultSets: 3, defaultRepsMin: 8,  defaultRepsMax: 12, hasBodyweight: true,  hasWeight: true },
  'Pes Mort Romanès':     { name: 'Pes Mort Romanès',     muscleGroup: 'Cames',      defaultSets: 3, defaultRepsMin: 8,  defaultRepsMax: 10, hasBodyweight: false, hasWeight: true },
  'Leg Curl':             { name: 'Leg Curl',             muscleGroup: 'Cames',      defaultSets: 3, defaultRepsMin: 10, defaultRepsMax: 15, hasBodyweight: false, hasWeight: true },
  'Leg Extension':        { name: 'Leg Extension',        muscleGroup: 'Cames',      defaultSets: 3, defaultRepsMin: 12, defaultRepsMax: 15, hasBodyweight: false, hasWeight: true },
  'Elevació de Turmell':  { name: 'Elevació de Turmell',  muscleGroup: 'Cames',      defaultSets: 4, defaultRepsMin: 15, defaultRepsMax: 20, hasBodyweight: true,  hasWeight: true },
  // Gluts
  'Hip Thrust':           { name: 'Hip Thrust',           muscleGroup: 'Gluts',      defaultSets: 3, defaultRepsMin: 10, defaultRepsMax: 15, hasBodyweight: false, hasWeight: true },
  'Abducció de Maluc':    { name: 'Abducció de Maluc',    muscleGroup: 'Gluts',      defaultSets: 3, defaultRepsMin: 15, defaultRepsMax: 20, hasBodyweight: false, hasWeight: true },
  // Abdominals
  'Crunch':               { name: 'Crunch',               muscleGroup: 'Abdominals', defaultSets: 3, defaultRepsMin: 15, defaultRepsMax: 20, hasBodyweight: true,  hasWeight: false },
  'Planxa':               { name: 'Planxa',               muscleGroup: 'Abdominals', defaultSets: 3, defaultRepsMin: 20, defaultRepsMax: 60, hasBodyweight: true,  hasWeight: false },
  'Elevació de Cames':    { name: 'Elevació de Cames',    muscleGroup: 'Abdominals', defaultSets: 3, defaultRepsMin: 12, defaultRepsMax: 15, hasBodyweight: true,  hasWeight: false },
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
  weightType?: WeightType
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
  exercise: string
  name?: string
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
  weightType?: WeightType
  notes?: string | null
  completed_at?: string | null
  created_at: string
}

export interface SavedExercise {
  id: string
  user_id: string
  exercise: string
  created_at: string
}

export const EXERCISE_KEYS: Record<string, string> = {
  // Pectoral
  'Press Banca':          'exercise.pressBanca',
  'Press Banca Inclinat': 'exercise.pressBancaInclinat',
  'Chest Fly':            'exercise.chestFly',
  'Flexions':             'exercise.flexions',
  // Esquitxos
  'Press Military':       'exercise.pressMilitary',
  'Arnold Press':         'exercise.arnoldPress',
  'Elevació Lateral':     'exercise.elevacioLateral',
  'Elevació Frontal':     'exercise.elevacioFrontal',
  'Face Pull':            'exercise.facePull',
  // Esquena
  'Lat Pulldown':         'exercise.latPulldown',
  'Dominades':            'exercise.dominades',
  'Rem':                  'exercise.rem',
  'Pes Mort':             'exercise.pesMort',
  // Braços
  'Curl de Bíceps':       'exercise.curlBiceps',
  'Extensió Tríceps':     'exercise.extensioTriceps',
  'Dips':                 'exercise.dips',
  // Cames
  'Sentadilles':          'exercise.sentadilles',
  'Leg Press':            'exercise.legPress',
  'Zancades':             'exercise.zancades',
  'Pes Mort Romanès':     'exercise.pesMortRomanes',
  'Leg Curl':             'exercise.legCurl',
  'Leg Extension':        'exercise.legExtension',
  'Elevació de Turmell':  'exercise.elevacioTurmell',
  // Gluts
  'Hip Thrust':           'exercise.hipThrust',
  'Abducció de Maluc':    'exercise.abduccioMaluc',
  // Abdominals
  'Crunch':               'exercise.crunch',
  'Planxa':               'exercise.planxa',
  'Elevació de Cames':    'exercise.elevacioCames',
  // Llegat (exercicis antics al DB)
  'Curl Martell':               'exercise.curlMartell',
  'Curl Barra':                 'exercise.curlBarra',
  'Extensiones Tricep':         'exercise.extensionesTricep',
  'French Press':               'exercise.frenchPress',
  'Extensió Tríceps Politja':   'exercise.extensioTricepsPolitja',
  'Rem amb Barra':              'exercise.remAmbBarra',
  'Rem amb Mancuerna':          'exercise.remAmbMancuerna',
  'Rem en Politja':             'exercise.remEnPolitja',
  'Sentadilla Búlgara':         'exercise.sentadillaBulgara',
}

// Funcions auxiliars
export function calculate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0
  return Math.round(weight / (1.0278 - 0.0278 * reps) * 10) / 10
}
