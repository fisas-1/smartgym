-- ============================================
-- FIX: Afegir routine_id i RLS policies a workout_logs
-- ============================================

-- 1. Afegir columna routine_id a workout_logs si no existeix
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workout_logs' 
      AND column_name = 'routine_id'
      AND table_schema = 'public'
  ) THEN 
    ALTER TABLE public.workout_logs ADD COLUMN routine_id UUID REFERENCES public.routines(id) ON DELETE SET NULL;
    RAISE NOTICE 'Columna routine_id afegida a workout_logs';
  ELSE 
    RAISE NOTICE 'La columna routine_id ja existeix a workout_logs';
  END IF;
END $$;

-- 2. Activar Row Level Security a workout_logs si no està activada
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'workout_logs'
      AND n.nspname = 'public'
      AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS activat per a workout_logs';
  ELSE 
    RAISE NOTICE 'RLS ja està activat per a workout_logs';
  END IF;
END $$;

-- 3. Eliminar policies existents de workout_logs (per si n'hi ha de sessions anteriors)
DO $$ 
BEGIN
  -- Eliminar policies si existeixen
  DROP POLICY IF EXISTS "Usuaris poden veure els seus workout_logs" ON public.workout_logs;
  DROP POLICY IF EXISTS "Usuaris poden crear workout_logs" ON public.workout_logs;
  DROP POLICY IF EXISTS "Usuaris poden actualitzar els seus workout_logs" ON public.workout_logs;
  DROP POLICY IF EXISTS "Usuaris poden eliminar els seus workout_logs" ON public.workout_logs;
  RAISE NOTICE 'Policies antigues de workout_logs eliminades (si existien)';
END $$;

-- 4. Crear noves policies RLS per a workout_logs

-- SELECT: els usuaris poden veure només els seus propis registres
CREATE POLICY "Usuaris poden veure els seus workout_logs" ON public.workout_logs
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT: els usuaris poden crear registres només amb el seu propi user_id
CREATE POLICY "Usuaris poden crear workout_logs" ON public.workout_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: els usuaris poden actualitzar només els seus propis registres
CREATE POLICY "Usuaris poden actualitzar els seus workout_logs" ON public.workout_logs
  FOR UPDATE USING (auth.uid() = user_id);

-- DELETE: els usuaris poden eliminar només els seus propis registres
CREATE POLICY "Usuaris poden eliminar els seus workout_logs" ON public.workout_logs
  FOR DELETE USING (auth.uid() = user_id);

-- 5. Crear índex per a la columna routine_id
CREATE INDEX IF NOT EXISTS idx_workout_logs_routine_id ON public.workout_logs(routine_id);