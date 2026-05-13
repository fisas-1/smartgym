-- Afegir columna variant a routine_exercises
-- NULL = qualsevol variant acceptada (comportament per defecte)
-- TEXT = variant específica requerida

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'routine_exercises'
      AND column_name = 'variant'
  ) THEN
    ALTER TABLE public.routine_exercises
      ADD COLUMN variant TEXT DEFAULT NULL;
  END IF;
END $$;
