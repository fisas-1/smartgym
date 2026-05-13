export type RoutineTemplateExercise = {
  exercise: string
  sets_target: number
  reps_min: number
  reps_max: number
}

export type RoutineTemplate = {
  id: string
  nameKey: string
  descKey: string
  routines: { name: string; exercises: RoutineTemplateExercise[] }[]
}

const PUSH_EXERCISES: RoutineTemplateExercise[] = [
  { exercise: 'Press Banca',          sets_target: 4, reps_min: 6,  reps_max: 10 },
  { exercise: 'Press Banca Inclinat', sets_target: 3, reps_min: 8,  reps_max: 12 },
  { exercise: 'Press Military',       sets_target: 3, reps_min: 8,  reps_max: 12 },
  { exercise: 'Chest Fly',            sets_target: 3, reps_min: 12, reps_max: 15 },
  { exercise: 'Elevació Lateral',     sets_target: 3, reps_min: 12, reps_max: 15 },
  { exercise: 'Extensió Tríceps',     sets_target: 3, reps_min: 12, reps_max: 15 },
]

const PULL_EXERCISES: RoutineTemplateExercise[] = [
  { exercise: 'Dominades',      sets_target: 4, reps_min: 5,  reps_max: 8  },
  { exercise: 'Rem',            sets_target: 3, reps_min: 6,  reps_max: 10 },
  { exercise: 'Lat Pulldown',   sets_target: 3, reps_min: 8,  reps_max: 12 },
  { exercise: 'Face Pull',      sets_target: 3, reps_min: 15, reps_max: 20 },
  { exercise: 'Curl de Bíceps', sets_target: 3, reps_min: 10, reps_max: 15 },
  { exercise: 'Elevació Frontal', sets_target: 3, reps_min: 12, reps_max: 15 },
]

const LEGS_EXERCISES: RoutineTemplateExercise[] = [
  { exercise: 'Sentadilles',       sets_target: 4, reps_min: 6,  reps_max: 10 },
  { exercise: 'Pes Mort Romanès',  sets_target: 3, reps_min: 8,  reps_max: 10 },
  { exercise: 'Hip Thrust',        sets_target: 3, reps_min: 10, reps_max: 15 },
  { exercise: 'Leg Press',         sets_target: 3, reps_min: 10, reps_max: 12 },
  { exercise: 'Leg Curl',          sets_target: 3, reps_min: 10, reps_max: 15 },
  { exercise: 'Leg Extension',     sets_target: 3, reps_min: 12, reps_max: 15 },
  { exercise: 'Elevació de Turmell', sets_target: 4, reps_min: 15, reps_max: 20 },
]

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    id: 'ppl-push',
    nameKey: 'templates.push.name',
    descKey: 'templates.push.desc',
    routines: [{ name: 'Push', exercises: PUSH_EXERCISES }],
  },
  {
    id: 'ppl-pull',
    nameKey: 'templates.pull.name',
    descKey: 'templates.pull.desc',
    routines: [{ name: 'Pull', exercises: PULL_EXERCISES }],
  },
  {
    id: 'ppl-legs',
    nameKey: 'templates.legs.name',
    descKey: 'templates.legs.desc',
    routines: [{ name: 'Legs', exercises: LEGS_EXERCISES }],
  },
  {
    id: 'ppl-full',
    nameKey: 'templates.ppl.name',
    descKey: 'templates.ppl.desc',
    routines: [
      { name: 'Push', exercises: PUSH_EXERCISES },
      { name: 'Pull', exercises: PULL_EXERCISES },
      { name: 'Legs', exercises: LEGS_EXERCISES },
    ],
  },
]
