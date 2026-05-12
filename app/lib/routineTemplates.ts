export type RoutineTemplateExercise = {
  exercise: string
  sets_target: number
  reps_min: number
  reps_max: number
}

export type RoutineTemplate = {
  id: string
  name: string
  description: string
  routines: { name: string; exercises: RoutineTemplateExercise[] }[]
}

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    id: 'ppl-push',
    name: 'Push (PPL)',
    description: 'Pit, espatlla i tríceps',
    routines: [
      {
        name: 'Push',
        exercises: [
          { exercise: 'Press Banca', sets_target: 4, reps_min: 6, reps_max: 10 },
          { exercise: 'Press Military', sets_target: 3, reps_min: 8, reps_max: 12 },
          { exercise: 'Extensiones Tricep', sets_target: 3, reps_min: 10, reps_max: 15 },
          { exercise: 'French Press', sets_target: 3, reps_min: 8, reps_max: 12 },
        ],
      },
    ],
  },
  {
    id: 'ppl-pull',
    name: 'Pull (PPL)',
    description: 'Esquena i bíceps',
    routines: [
      {
        name: 'Pull',
        exercises: [
          { exercise: 'Dominades', sets_target: 4, reps_min: 6, reps_max: 10 },
          { exercise: 'Lat Pulldown', sets_target: 3, reps_min: 8, reps_max: 12 },
          { exercise: 'Curl de Bíceps', sets_target: 3, reps_min: 10, reps_max: 12 },
        ],
      },
    ],
  },
  {
    id: 'ppl-legs',
    name: 'Legs (PPL)',
    description: 'Cames i gluts',
    routines: [
      {
        name: 'Legs',
        exercises: [
          { exercise: 'Sentadilles', sets_target: 4, reps_min: 6, reps_max: 10 },
          { exercise: 'Leg Press', sets_target: 3, reps_min: 8, reps_max: 12 },
          { exercise: 'Zancadas', sets_target: 3, reps_min: 10, reps_max: 12 },
        ],
      },
    ],
  },
  {
    id: 'ppl-full',
    name: 'Push / Pull / Legs (complet)',
    description: 'Crea les 3 rutines de cop',
    routines: [
      {
        name: 'Push',
        exercises: [
          { exercise: 'Press Banca', sets_target: 4, reps_min: 6, reps_max: 10 },
          { exercise: 'Press Military', sets_target: 3, reps_min: 8, reps_max: 12 },
          { exercise: 'Extensiones Tricep', sets_target: 3, reps_min: 10, reps_max: 15 },
          { exercise: 'French Press', sets_target: 3, reps_min: 8, reps_max: 12 },
        ],
      },
      {
        name: 'Pull',
        exercises: [
          { exercise: 'Dominades', sets_target: 4, reps_min: 6, reps_max: 10 },
          { exercise: 'Lat Pulldown', sets_target: 3, reps_min: 8, reps_max: 12 },
          { exercise: 'Curl de Bíceps', sets_target: 3, reps_min: 10, reps_max: 12 },
        ],
      },
      {
        name: 'Legs',
        exercises: [
          { exercise: 'Sentadilles', sets_target: 4, reps_min: 6, reps_max: 10 },
          { exercise: 'Leg Press', sets_target: 3, reps_min: 8, reps_max: 12 },
          { exercise: 'Zancadas', sets_target: 3, reps_min: 10, reps_max: 12 },
        ],
      },
    ],
  },
]
