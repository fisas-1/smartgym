-- ============================================
-- AFEGIR COLUMNES FALTANTS A workout_logs
-- ============================================
-- Aquest script afegeix les columnes necessàries per al error:
-- "Could not find the 'exercise' column of 'workout_logs' in the schema cache"
-- ============================================

-- Afegeix la columna 'exercise' si no existeix
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workout_logs' 
      AND column_name = 'exercise'
      AND table_schema = 'public'
  ) THEN 
    ALTER TABLE public.workout_logs ADD COLUMN exercise TEXT;
    RAISE NOTICE 'Columna exercise afegida a workout_logs';
  END IF;
END $$;

-- Afegeix la columna 'one_rm' si no existeix
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workout_logs' 
      AND column_name = 'one_rm'
      AND table_schema = 'public'
  ) THEN 
    ALTER TABLE public.workout_logs ADD COLUMN one_rm NUMERIC;
    RAISE NOTICE 'Columna one_rm afegida a workout_logs';
  END IF;
END $$;

-- Verificació
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'workout_logs' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
