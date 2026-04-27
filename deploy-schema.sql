-- ============================================================
-- SUPABASE SCHEMA DEPLOYMENT SCRIPT
-- ============================================================
-- This file contains all SQL needed to fix the schema errors:
-- 1. Missing 'exercise' and 'one_rm' columns in workout_logs
-- 2. Missing 'routines', 'routine_exercises', 'routine_sets' tables
--
-- IMPORTANT: Execute this in Supabase SQL Editor:
--   1. Go to https://ronzmensezcuszabqfbz.supabase.co
--   2. Click "SQL Editor" in left menu
--   3. Click "New query"
--   4. Copy everything below into the editor
--   5. Click "Run" (or Ctrl+Enter)
-- ============================================================

-- =========================================================================
-- PART 1: Fix workout_logs table - Add missing columns
-- =========================================================================

DO $$
BEGIN
  -- Add exercise column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_logs'
      AND column_name = 'exercise'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.workout_logs ADD COLUMN exercise TEXT;
    RAISE NOTICE '✓ Column "exercise" added to workout_logs';
  ELSE
    RAISE NOTICE '✓ Column "exercise" already exists in workout_logs';
  END IF;

  -- Add one_rm column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_logs'
      AND column_name = 'one_rm'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.workout_logs ADD COLUMN one_rm NUMERIC;
    RAISE NOTICE '✓ Column "one_rm" added to workout_logs';
  ELSE
    RAISE NOTICE '✓ Column "one_rm" already exists in workout_logs';
  END IF;
END $$;

-- =========================================================================
-- PART 2: Create routines tables
-- =========================================================================

-- Create routines table
CREATE TABLE IF NOT EXISTS public.routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_routines_user_id ON public.routines(user_id);

-- Create routine_exercises table
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

CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine_id ON public.routine_exercises(routine_id);

-- Create routine_sets table
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

CREATE INDEX IF NOT EXISTS idx_routine_sets_exercise_id ON public.routine_sets(routine_exercise_id);
CREATE INDEX IF NOT EXISTS idx_routine_sets_workout_log_id ON public.routine_sets(workout_log_id);

-- =========================================================================
-- PART 3: Enable Row Level Security (RLS)
-- =========================================================================

ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_sets ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- PART 4: Create RLS Policies for routines
-- =========================================================================

CREATE POLICY "Usuaris poden veure les seves rutines" ON public.routines
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuaris poden crear les seves rutines" ON public.routines
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuaris poden actualitzar les seves rutines" ON public.routines
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Usuaris poden eliminar les seves rutines" ON public.routines
  FOR DELETE USING (auth.uid() = user_id);

-- =========================================================================
-- PART 5: Create RLS Policies for routine_exercises
-- =========================================================================

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

-- =========================================================================
-- PART 6: Create RLS Policies for routine_sets
-- =========================================================================

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

-- =========================================================================
-- PART 5: Create weight recommendation function
-- =========================================================================

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
      WHEN ll.reps >= p_target_reps THEN ROUND((ll.weight + 2.5)::numeric, 1)
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

-- =========================================================================
-- PART 6: Create updated_at trigger function
-- =========================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_routines_updated_at
  BEFORE UPDATE ON public.routines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- VERIFICATION QUERIES
-- =========================================================================

-- Check workout_logs columns
SELECT 'workout_logs columns' as check_type, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'workout_logs' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check routines table exists
SELECT 'routines table' as check_type, EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_name = 'routines' AND table_schema = 'public'
) as exists;

-- Check routine_exercises table exists
SELECT 'routine_exercises table' as check_type, EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_name = 'routine_exercises' AND table_schema = 'public'
) as exists;

-- Check routine_sets table exists
SELECT 'routine_sets table' as check_type, EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_name = 'routine_sets' AND table_schema = 'public'
) as exists;

-- Check function exists
SELECT 'get_weight_recommendation function' as check_type, EXISTS (
  SELECT 1 FROM pg_proc WHERE proname = 'get_weight_recommendation'
) as exists;

SELECT '✅ Schema deployment complete!' as status;