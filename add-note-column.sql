-- Add optional notes column to workout_logs
-- Run this in Supabase SQL Editor (one-off)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_logs'
      AND column_name = 'note'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.workout_logs ADD COLUMN note TEXT;
    RAISE NOTICE '✓ Column "note" added to workout_logs';
  ELSE
    RAISE NOTICE '✓ Column "note" already exists';
  END IF;
END $$;
