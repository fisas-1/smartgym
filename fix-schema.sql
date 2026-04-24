-- Add missing columns to workout_logs table
-- Run these statements in Supabase SQL Editor (https://ronzmensezcuszabqfbz.supabase.co)

-- Add exercise column (TEXT)
ALTER TABLE public.workout_logs ADD COLUMN exercise TEXT;

-- Add one_rm column (NUMERIC for 1RM calculation)
ALTER TABLE public.workout_logs ADD COLUMN one_rm NUMERIC;

-- Optional: Add NOT NULL constraints if needed (only if column should be required)
-- ALTER TABLE public.workout_logs ALTER COLUMN exercise SET NOT NULL;
-- ALTER TABLE public.workout_logs ALTER COLUMN one_rm SET NOT NULL;

-- Optional: Add index on exercise for better query performance
-- CREATE INDEX idx_workout_logs_exercise ON public.workout_logs(exercise);

-- Optional: Add index on user_id for faster queries by user
-- CREATE INDEX idx_workout_logs_user_id ON public.workout_logs(user_id);

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'workout_logs' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
