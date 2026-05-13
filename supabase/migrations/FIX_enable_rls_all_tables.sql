-- ============================================================
-- FIX: Activar RLS a totes les taules públiques
-- Executar al SQL Editor de Supabase si apareix l'alerta
-- "rls_disabled_in_public" de Supabase Security Advisor
-- ============================================================

DO $$
BEGIN

  -- 1. workout_logs
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workout_logs' AND table_schema = 'public') THEN
    ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Usuaris poden veure els seus workout_logs" ON public.workout_logs;
    DROP POLICY IF EXISTS "Usuaris poden crear workout_logs" ON public.workout_logs;
    DROP POLICY IF EXISTS "Usuaris poden actualitzar els seus workout_logs" ON public.workout_logs;
    DROP POLICY IF EXISTS "Usuaris poden eliminar els seus workout_logs" ON public.workout_logs;

    CREATE POLICY "Usuaris poden veure els seus workout_logs" ON public.workout_logs
      FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Usuaris poden crear workout_logs" ON public.workout_logs
      FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Usuaris poden actualitzar els seus workout_logs" ON public.workout_logs
      FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "Usuaris poden eliminar els seus workout_logs" ON public.workout_logs
      FOR DELETE USING (auth.uid() = user_id);

    RAISE NOTICE 'RLS activat per a workout_logs';
  END IF;

  -- 2. routines
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'routines' AND table_schema = 'public') THEN
    ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS activat per a routines';
  END IF;

  -- 3. routine_exercises
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'routine_exercises' AND table_schema = 'public') THEN
    ALTER TABLE public.routine_exercises ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS activat per a routine_exercises';
  END IF;

  -- 4. routine_sets
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'routine_sets' AND table_schema = 'public') THEN
    ALTER TABLE public.routine_sets ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS activat per a routine_sets';
  END IF;

  -- 5. saved_exercises (opcional, pot no existir)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'saved_exercises' AND table_schema = 'public') THEN
    ALTER TABLE public.saved_exercises ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS activat per a saved_exercises';
  END IF;

END $$;

-- Verificació final: totes les taules públiques i si tenen RLS activat
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
