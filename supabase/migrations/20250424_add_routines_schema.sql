-- ============================================
-- SCHEMA DE RUTINES (Routines)
-- ============================================

-- ============================================
-- FIX: Afegir columnes faltants a workout_logs
-- ============================================
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workout_logs' 
      AND column_name = 'exercise'
      AND table_schema = 'public'
  ) THEN 
    ALTER TABLE public.workout_logs ADD COLUMN exercise TEXT;
  END IF;
END $$;

DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workout_logs' 
      AND column_name = 'one_rm'
      AND table_schema = 'public'
  ) THEN 
    ALTER TABLE public.workout_logs ADD COLUMN one_rm NUMERIC;
  END IF;
END $$;

-- ============================================
-- Rutines
-- ============================================

-- Taula de rutines
CREATE TABLE IF NOT EXISTS public.routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Taula d'exercicis de rutina
CREATE TABLE IF NOT EXISTS public.routine_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  exercise TEXT NOT NULL,
  sets_target INTEGER NOT NULL CHECK (sets_target > 0),
  reps_min INTEGER NOT NULL CHECK (reps_min > 0),
  reps_max INTEGER NOT NULL CHECK (reps_max >= reps_min),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Taula de series completades de rutina
CREATE TABLE IF NOT EXISTS public.routine_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_exercise_id UUID NOT NULL REFERENCES public.routine_exercises(id) ON DELETE CASCADE,
  workout_log_id UUID REFERENCES public.workout_logs(id) ON DELETE SET NULL,
  set_number INTEGER NOT NULL CHECK (set_number > 0),
  completed BOOLEAN DEFAULT false NOT NULL,
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índexs per a millor rendiment
CREATE INDEX IF NOT EXISTS idx_routines_user_id ON public.routines(user_id);
CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine_id ON public.routine_exercises(routine_id);
CREATE INDEX IF NOT EXISTS idx_routine_sets_exercise_id ON public.routine_sets(routine_exercise_id);
CREATE INDEX IF NOT EXISTS idx_routine_sets_workout_log_id ON public.routine_sets(workout_log_id);

-- Row Level Security (RLS)
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_sets ENABLE ROW LEVEL SECURITY;

-- Polítiques RLS per a routines
CREATE POLICY "Usuaris poden veure les seves rutines" ON public.routines
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuaris poden crear les seves rutines" ON public.routines
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuaris poden actualitzar les seves rutines" ON public.routines
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Usuaris poden eliminar les seves rutines" ON public.routines
  FOR DELETE USING (auth.uid() = user_id);

-- Polítiques RLS per a routine_exercises
CREATE POLICY "Usuaris poden veure exercicis de les seves rutines" ON public.routine_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.routines 
      WHERE routines.id = routine_exercises.routine_id 
        AND routines.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuaris poden crear exercicis a les seves rutines" ON public.routine_exercises
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.routines 
      WHERE routines.id = routine_exercises.routine_id 
        AND routines.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuaris poden actualitzar exercicis de les seves rutines" ON public.routine_exercises
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.routines 
      WHERE routines.id = routine_exercises.routine_id 
        AND routines.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuaris poden eliminar exercicis de les seves rutines" ON public.routine_exercises
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.routines 
      WHERE routines.id = routine_exercises.routine_id 
        AND routines.user_id = auth.uid()
    )
  );

-- Polítiques RLS per a routine_sets
CREATE POLICY "Usuaris poden veure series de les seves rutines" ON public.routine_sets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.routine_exercises re
      JOIN public.routines r ON re.routine_id = r.id
      WHERE re.id = routine_sets.routine_exercise_id 
        AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuaris poden crear series a les seves rutines" ON public.routine_sets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.routine_exercises re
      JOIN public.routines r ON re.routine_id = r.id
      WHERE re.id = routine_sets.routine_exercise_id 
        AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuaris poden actualitzar series de les seves rutines" ON public.routine_sets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.routine_exercises re
      JOIN public.routines r ON re.routine_id = r.id
      WHERE re.id = routine_sets.routine_exercise_id 
        AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuaris poden eliminar series de les seves rutines" ON public.routine_sets
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.routine_exercises re
      JOIN public.routines r ON re.routine_id = r.id
      WHERE re.id = routine_sets.routine_exercise_id 
        AND r.user_id = auth.uid()
    )
  );

-- ============================================
-- FUNCIONS AUXILIARS
-- ============================================

-- Funció per obtenir recomanció de pes basada en l'historial
CREATE OR REPLACE FUNCTION public.get_weight_recommendation(
  p_user_id UUID,
  p_exercise TEXT,
  p_target_reps INTEGER
)
RETURNS TABLE (
  recommended_weight NUMERIC,
  previous_weight NUMERIC,
  previous_reps INTEGER,
  previous_date TIMESTAMP WITH TIME ZONE,
  exercise TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH latest_log AS (
    SELECT 
      weight,
      reps,
      one_rm,
      created_at
    FROM public.workout_logs
    WHERE 
      user_id = p_user_id 
      AND exercise = p_exercise
      AND reps > 0
    ORDER BY created_at DESC
    LIMIT 1
  ),
  best_log AS (
    SELECT 
      MAX(one_rm) as best_one_rm
    FROM public.workout_logs
    WHERE 
      user_id = p_user_id 
      AND exercise = p_exercise
      AND one_rm IS NOT NULL
  )
  SELECT 
    CASE 
      WHEN ll.weight IS NULL THEN NULL
      -- Progression simple: incrementar 2.5kg si es van fer totes les reps de l'última sèrie
      WHEN ll.reps >= p_target_reps THEN ROUND((ll.weight + 2.5)::numeric, 1)
      -- Mantenir el mateix peso si es van fer menys reps del previst
      ELSE ROUND(ll.weight::numeric, 1)
    END as recommended_weight,
    ll.weight as previous_weight,
    ll.reps as previous_reps,
    ll.created_at as previous_date,
    p_exercise as exercise
  FROM latest_log ll
  LEFT JOIN best_log bl ON true;
END;
$$;

-- Funció per actualitzar elCamp updated_at de les routines
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per actualitzar updated_at
CREATE TRIGGER update_routines_updated_at
  BEFORE UPDATE ON public.routines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- DADES DE PROVA (opcional)
-- ============================================
/*
-- Afegir exercicis de prova a workout_logs per testejar recomanacions
INSERT INTO public.workout_logs (user_id, exercise, weight, reps, rir, one_rm, created_at)
VALUES 
  ('uuid-del-usuari', 'Press Banca', 80, 5, 2, 88.5, NOW() - INTERVAL '7 days'),
  ('uuid-del-usuari', 'Press Banca', 82.5, 5, 2, 90.9, NOW() - INTERVAL '3 days'),
  ('uuid-del-usuari', 'Sentadilles', 100, 5, 3, 109.4, NOW() - INTERVAL '5 days');
*/
