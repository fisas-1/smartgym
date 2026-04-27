/**
 * Script automatitzat per aplicar canvis de schema a Supabase
 * Utilitza l'API de PostgREST i funcions de PostgreSQL
 * 
 * NOTA: Aquest script requereix una clau de servei (service_role) per executar DDL
 * Si no tens clau de servei, has d'executar deploy-schema.sql manualment
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabaseUrl = 'https://ronzmensezcuszabqfbz.supabase.co'
// ⚠️ NECESSITES LA CLAU DE SERVEI (service_role) PER EXECUTAR DDL
// Accedeix a: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
// Copia la clau de "service_role" de la secció "Legacy API keys"
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || ''

const supabase = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

if (!supabase) {
  console.log('⚠️  No s\'ha trobat la clau de servei (SUPABASE_SERVICE_KEY)')
  console.log('\nPer executar aquest script:')
  console.log('1. Obté la teva clau de servei de Supabase')
  console.log('2. Exporta-la: export SUPABASE_SERVICE_KEY="la_teva_clau"')
  console.log('3. Executa: node apply-sql-automated.js')
  console.log('\nAlternativa: Executa deploy-schema.sql manualment a:')
  console.log('  https://ronzmensezcuszabqfbz.supabase.co/sql')
  process.exit(1)
}

async function executeSQL(sql) {
  try {
    // Intenta executar SQL via postgrest (no soporta DDL directament)
    console.log('⚠️  L\'API pública no permet DDL. Provant alternatives...')
    return { error: { message: 'DDL not supported via public API' } }
  } catch (err) {
    return { error: err }
  }
}

async function applyMigrations() {
  console.log('=== APLICANT MIGRACIONS DE BASE DE DADES ===\n')
  
  const migrations = [
    {
      name: 'Afegir columna exercise a workout_logs',
      sql: `ALTER TABLE public.workout_logs ADD COLUMN IF NOT EXISTS exercise TEXT;`
    },
    {
      name: 'Afegir columna one_rm a workout_logs',
      sql: `ALTER TABLE public.workout_logs ADD COLUMN IF NOT EXISTS one_rm NUMERIC;`
    }
  ]
  
  console.log('Intentant executar', migrations.length, 'migracions...\n')
  
  for (const migration of migrations) {
    console.log(`→ ${migration.name}`)
    console.log(`  SQL: ${migration.sql}`)
    
    try {
      // Comprova si la columna ja existeix
      const { data, error } = await supabase
        .from('workout_logs')
        .select('exercise')
        .limit(1)
      
      if (error && error.message.includes('column')) {
        console.log('  ❌ Columna no existeix, cal executar SQL manual')
      } else {
        console.log('  ✓ Columna ja existeix o accessible')
      }
    } catch (err) {
      console.log('  ⚠️  Error:', err.message)
    }
    
    console.log('')
  }
  
  console.log('\n=== CREACIÓ DE TAULES NO ÉS POSSIBLE VIA API PÚBLICA ===')
  console.log('Les següents taules cal crear-les manualment:\n')
  
  const tables = [
    'routines',
    'routine_exercises', 
    'routine_sets'
  ]
  
  tables.forEach(table => {
    console.log(`❌ ${table} - NO ÉS POSSIBLE CREAR-LA VIA API PÚBLICA`)
  })
  
  console.log('\n' + '='.repeat(60))
  console.log('SOLUCIÓ: EXECUTA MANUALMENT')
  console.log('='.repeat(60))
  console.log('\n1. Obre: https://ronzmensezcuszabqfbz.supabase.co')
  console.log('2. Ves a: SQL Editor → New query')
  console.log('3. Copia i enganxa el contingut de: deploy-schema.sql')
  console.log('4. Clica "Run" (Ctrl+Enter)')
  console.log('\nAixò crearà totes les taules i columnes necessàries.')
  console.log('\nDesprés d\'executar, verifica amb:')
  console.log('  node verify-fix.js')
}

// Executa les migracions
applyMigrations().catch(err => {
  console.error('Error fatal:', err)
  process.exit(1)
})