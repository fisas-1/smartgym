import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ronzmensezcuszabqfbz.supabase.co'
const supabaseAnonKey = 'sb_publishable_PAj7ItJGXoWw1-uedmUYnQ_OrZfRuBz'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkColumnsIndividually() {
  console.log('Checking workout_logs columns individually...\n')

  const testColumns = [
    'exercise', 
    'weight', 
    'reps', 
    'rir', 
    'one_rm', 
    'user_id', 
    'created_at',
    'id'
  ]

  const results = []

  for (const col of testColumns) {
    try {
      const { data, error } = await supabase
        .from('workout_logs')
        .select(col)
        .limit(1)
      
      if (error) {
        // Check if error is about missing column
        const isMissingColumn = error.message.toLowerCase().includes('column') || 
                               error.message.toLowerCase().includes('does not exist')
        results.push({
          column: col,
          exists: false,
          error: error.message
        })
        console.log(`Column '${col}': ✗ MISSING - ${error.message.substring(0, 80)}`)
      } else {
        results.push({
          column: col,
          exists: true,
          sample: data
        })
        console.log(`Column '${col}': ✓ EXISTS`)
      }
    } catch (err) {
      console.log(`Column '${col}': ERROR - ${err.message}`)
    }
  }

  console.log('\n--- Summary ---')
  const existing = results.filter(r => r.exists).map(r => r.column)
  const missing = results.filter(r => !r.exists).map(r => r.column)
  
  console.log('Existing columns:', existing)
  console.log('Missing columns:', missing)

  if (missing.length > 0) {
    console.log('\n--- SQL to add missing columns ---')
    const columnDefs = {
      'exercise': 'TEXT',
      'weight': 'NUMERIC',
      'reps': 'INTEGER',
      'rir': 'NUMERIC',
      'one_rm': 'NUMERIC',
      'user_id': 'UUID',
      'created_at': 'TIMESTAMP DEFAULT now()'
    }
    
    missing.forEach(col => {
      const type = columnDefs[col] || 'TEXT'
      console.log(`ALTER TABLE public.workout_logs ADD COLUMN ${col} ${type};`)
    })
  }
}

checkColumnsIndividually()
