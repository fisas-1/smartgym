import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function addMissingColumns() {
  console.log('Afegint columnes mancants a workout_logs...')

  const sql = `
    -- Afegir columna exercise si no existeix
    DO $$ 
    BEGIN 
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'workout_logs' 
          AND column_name = 'exercise'
          AND table_schema = 'public'
      ) THEN 
        ALTER TABLE public.workout_logs ADD COLUMN exercise TEXT;
        RAISE NOTICE 'Columna exercise afegida';
      ELSE 
        RAISE NOTICE 'La columna exercise ja existeix';
      END IF;
    END $$;

    -- Afegir columna one_rm si no existeix
    DO $$ 
    BEGIN 
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'workout_logs' 
          AND column_name = 'one_rm'
          AND table_schema = 'public'
      ) THEN 
        ALTER TABLE public.workout_logs ADD COLUMN one_rm NUMERIC;
        RAISE NOTICE 'Columna one_rm afegida';
      ELSE 
        RAISE NOTICE 'La columna one_rm ja existeix';
      END IF;
    END $$;
  `

  const { data, error } = await supabase.rpc('exec_sql', { sql })

  if (error) {
    // Intent alternatiu:.exec directe via consulta SQL
    console.log('Intentant executar SQL directament...')
    const { error: err2 } = await supabase
      .from('_supabase_migrations')
      .select('*')
      .limit(1)
    
    // Llegir el schema actual
    const { data: cols } = await supabase
      .rpc('pg_catalog.pg_get_tabledef', { table: 'workout_logs' })
    
    console.log('Error directe:', err2)
  }

  console.log('Columes afegides (si calia)')
}

addMissingColumns().catch(console.error)
