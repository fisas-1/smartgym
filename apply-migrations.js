import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ronzmensezcuszabqfbz.supabase.co'
const supabaseAnonKey = 'sb_publishable_PAj7ItJGXoWw1-uedmUYnQ_OrZfRuBz'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Migration SQL statements
const MIGRATIONS = [
  // Add exercise column to workout_logs
  `ALTER TABLE public.workout_logs ADD COLUMN IF NOT EXISTS exercise TEXT`,
  
  // Add one_rm column to workout_logs
  `ALTER TABLE public.workout_logs ADD COLUMN IF NOT EXISTS one_rm NUMERIC`,
]

const ROUTINES_MIGRATIONS = [
  // Create routines table
  `CREATE TABLE IF NOT EXISTS public.routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
  )`,
  
  // Create routine_exercises table
  `CREATE TABLE IF NOT EXISTS public.routine_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
    exercise TEXT NOT NULL,
    sets_target INTEGER NOT NULL CHECK (sets_target > 0),
    reps_min INTEGER NOT NULL CHECK (reps_min > 0),
    reps_max INTEGER NOT NULL CHECK (reps_max >= reps_min),
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
  )`,
  
  // Create routine_sets table
  `CREATE TABLE IF NOT EXISTS public.routine_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_exercise_id UUID NOT NULL REFERENCES public.routine_exercises(id) ON DELETE CASCADE,
    workout_log_id UUID REFERENCES public.workout_logs(id) ON DELETE SET NULL,
    set_number INTEGER NOT NULL CHECK (set_number > 0),
    completed BOOLEAN DEFAULT false NOT NULL,
    notes TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
  )`,
]

async function runMigrations() {
  console.log('=== Running Migrations ===\n')
  
  console.log('Step 1: Adding columns to workout_logs table...')
  for (const sql of MIGRATIONS) {
    try {
      console.log(`  Executing: ${sql.substring(0, 80)}...`)
      // Note: Supabase client JS doesn't support direct DDL execution
      // This needs to be run in Supabase SQL Editor or via service role key
      console.log('  ⚠️  Cannot execute DDL via anon key. Use supabase-js with service role or SQL Editor')
    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`)
    }
  }
  
  console.log('\nStep 2: Creating routines tables...')
  for (const sql of ROUTINES_MIGRATIONS) {
    try {
      console.log(`  Executing: ${sql.substring(0, 80)}...`)
      console.log('  ⚠️  Cannot execute DDL via anon key. Use supabase-js with service role or SQL Editor')
    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`)
    }
  }
  
  console.log('\n=== Verification ===\n')
  
  // Verify schema by querying
  const { data: logsData, error: logsError } = await supabase
    .from('workout_logs')
    .select('*')
    .limit(1)
  
  if (logsError) {
    console.log('⚠️  workout_logs table check:', logsError.message)
  } else if (logsData && logsData.length > 0) {
    console.log('✓ workout_logs table exists')
    console.log('  Columns:', Object.keys(logsData[0]))
  } else {
    console.log('✓ workout_logs table exists (empty)')
  }
  
  const { data: routinesData, error: routinesError } = await supabase
    .from('routines')
    .select('*')
    .limit(1)
  
  if (routinesError) {
    console.log('⚠️  routines table check:', routinesError.message)
  } else {
    console.log('✓ routines table exists')
  }
  
  console.log('\n=== IMPORTANT NEXT STEPS ===\n')
  console.log('The migrations could not be executed via JavaScript client (anon key).')
  console.log('Please execute the SQL in Supabase Dashboard:')
  console.log('')
  console.log('1. Go to: https://ronzmensezcuszabqfbz.supabase.co')
  console.log('2. Click "SQL Editor" in the left menu')
  console.log('3. Click "New query"')
  console.log('4. Copy and paste the SQL from fix-schema.sql')
  console.log('5. Click "Run" (or Ctrl+Enter)')
  console.log('\nThen run: node verify-fix.js')
}

runMigrations().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})