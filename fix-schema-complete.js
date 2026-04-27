/**
 * Complete Schema Fix Script for SmartGym
 * 
 * This script verifies and fixes the database schema issues:
 * 1. Missing 'exercise' and 'one_rm' columns in workout_logs
 * 2. Missing 'routines', 'routine_exercises', 'routine_sets' tables
 * 3. Missing RLS policies and functions
 * 
 * Note: DDL operations require either:
 * - Supabase SQL Editor (manual)
 * - Service role key (via API)
 * - Supabase CLI
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'fs'

const supabaseUrl = 'https://ronzmensezcuszabqfbz.supabase.co'
const supabaseAnonKey = 'sb_publishable_PAj7ItJGXoWw1-uedmUYnQ_OrZfRuBz'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Read the deploy SQL
const deploySQL = readFileSync('deploy-schema.sql', 'utf-8')

async function verifyCurrentSchema() {
  console.log('=== Verifying Current Schema ===\n')
  
  const results = {
    workout_logs: { exists: false, columns: [], missingColumns: [] },
    routines: { exists: false },
    routine_exercises: { exists: false },
    routine_sets: { exists: false },
    get_weight_recommendation: { exists: false }
  }
  
  // Check workout_logs
  try {
    const { data, error } = await supabase
      .from('workout_logs')
      .select('*')
      .limit(1)
    
    if (error && error.message.includes('does not exist')) {
      results.workout_logs.exists = false
      console.log('❌ workout_logs: Table does not exist')
    } else if (error) {
      console.log('⚠️  workout_logs: Error checking -', error.message)
    } else {
      results.workout_logs.exists = true
      const columns = data && data.length > 0 ? Object.keys(data[0]) : []
      results.workout_logs.columns = columns
      
      const requiredColumns = ['exercise', 'one_rm', 'weight', 'reps', 'rir', 'user_id', 'created_at', 'id']
      results.workout_logs.missingColumns = requiredColumns.filter(c => !columns.includes(c))
      
      console.log(`✓ workout_logs: Table exists (${columns.length} columns)`)
      console.log(`  Columns: ${columns.join(', ')}`)
      
      if (results.workout_logs.missingColumns.length > 0) {
        console.log(`  ❌ Missing columns: ${results.workout_logs.missingColumns.join(', ')}`)
      } else {
        console.log(`  ✓ All required columns present`)
      }
    }
  } catch (err) {
    console.log('⚠️  workout_logs: Error -', err.message)
  }
  
  // Check routines table
  try {
    const { data, error } = await supabase
      .from('routines')
      .select('*')
      .limit(1)
    
    if (error && error.message.includes('Could not find the table')) {
      results.routines.exists = false
      console.log('❌ routines: Table does not exist')
    } else if (error) {
      console.log('⚠️  routines: Error checking -', error.message)
    } else {
      results.routines.exists = true
      console.log('✓ routines: Table exists')
    }
  } catch (err) {
    console.log('⚠️  routines: Error -', err.message)
  }
  
  // Check routine_exercises table
  try {
    const { data, error } = await supabase
      .from('routine_exercises')
      .select('*')
      .limit(1)
    
    if (error && error.message.includes('Could not find the table')) {
      results.routine_exercises.exists = false
      console.log('❌ routine_exercises: Table does not exist')
    } else {
      results.routine_exercises.exists = true
      console.log('✓ routine_exercises: Table exists')
    }
  } catch (err) {
    console.log('⚠️  routine_exercises: Error -', err.message)
  }
  
  // Check routine_sets table
  try {
    const { data, error } = await supabase
      .from('routine_sets')
      .select('*')
      .limit(1)
    
    if (error && error.message.includes('Could not find the table')) {
      results.routine_sets.exists = false
      console.log('❌ routine_sets: Table does not exist')
    } else {
      results.routine_sets.exists = true
      console.log('✓ routine_sets: Table exists')
    }
  } catch (err) {
    console.log('⚠️  routine_sets: Error -', err.message)
  }
  
  console.log('')
  return results
}

async function testFunctionality() {
  console.log('=== Testing Functionality ===\n')
  
  // Test 1: Insert into workout_logs
  console.log('Test 1: Insert into workout_logs...')
  try {
    const { data, error } = await supabase
      .from('workout_logs')
      .insert({
        exercise: 'Press Banca',
        weight: 80,
        reps: 5,
        rir: 2,
        one_rm: 88.5,
        user_id: '00000000-0000-0000-0000-000000000000'
      })
      .select()
      .maybeSingle()
    
    if (error) {
      if (error.message.includes('column') || error.message.includes('does not exist')) {
        console.log('❌ FAIL: ' + error.message)
        return false
      }
      console.log('⚠️  INSERT error (may be due to RLS):', error.message)
    } else {
      console.log('✓ PASS: Insert successful')
      if (data) {
        console.log(`  Data: ${JSON.stringify(data)}`)
      }
    }
  } catch (err) {
    console.log('❌ FAIL: ' + err.message)
    return false
  }
  
  // Test 2: Insert into routines
  console.log('\nTest 2: Insert into routines...')
  try {
    const { data: routineData, error: routineError } = await supabase
      .from('routines')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        name: 'Test Routine',
        description: 'Test'
      })
      .select()
      .maybeSingle()
    
    if (routineError && routineError.message.includes('Could not find the table')) {
      console.log('❌ FAIL: Table does not exist')
    } else if (routineError) {
      console.log('⚠️  Error (may be due to RLS):', routineError.message)
    } else {
      console.log('✓ PASS: Insert successful')
    }
  } catch (err) {
    console.log('⚠️  Error:', err.message)
  }
  
  console.log('')
  return true
}

function printFixInstructions() {
  console.log('=== HOW TO FIX ===\n')
  console.log('The following actions must be taken manually:')
  console.log('')
  console.log('STEP 1: Add missing columns to workout_logs')
  console.log('  Execute this SQL in Supabase SQL Editor:')
  console.log('  https://ronzmensezcuszabqfbz.supabase.co')
  console.log('')
  console.log('  SQL:')
  console.log('  ```')
  console.log('  ALTER TABLE public.workout_logs ADD COLUMN exercise TEXT;')
  console.log('  ALTER TABLE public.workout_logs ADD COLUMN one_rm NUMERIC;')
  console.log('  ```')
  console.log('')
  console.log('STEP 2: Create routines tables')
  console.log('  Execute the deploy-schema.sql file in Supabase SQL Editor')
  console.log('')
  console.log('STEP 3: Verify')
  console.log('  Run: node verify-fix.js')
  console.log('')
}

async function main() {
  console.log('SmartGym Schema Fix Tool')
  console.log('========================\n')
  
  const results = await verifyCurrentSchema()
  
  const hasIssues = 
    results.workout_logs.missingColumns.length > 0 ||
    !results.routines.exists ||
    !results.routine_exercises.exists ||
    !results.routine_sets.exists
  
  if (hasIssues) {
    printFixInstructions()
    
    console.log('\nDeploy SQL file available at: deploy-schema.sql')
    console.log(`File size: ${deploySQL.length} characters`)
    console.log(`Contains ${deploySQL.split(';').filter(s => s.trim().length > 0).length} SQL statements`)
    console.log('')
    console.log('To apply fixes:')
    console.log('  1. Open https://ronzmensezcuszabqfbz.supabase.co')
    console.log('  2. Go to SQL Editor → New query')
    console.log('  3. Copy and paste contents of deploy-schema.sql')
    console.log('  4. Click "Run" (Ctrl+Enter)')
    console.log('  5. Run: node verify-fix.js')
    console.log('')
  } else {
    console.log('✅ All tables and columns are properly configured!\n')
    await testFunctionality()
  }
  
  console.log('\n=== Summary ===')
  console.log(`workout_logs columns: ${results.workout_logs.columns.length || 0} found`)
  if (results.workout_logs.missingColumns.length > 0) {
    console.log(`  Missing: ${results.workout_logs.missingColumns.join(', ')}`)
  }
  console.log(`routines table: ${results.routines.exists ? '✓' : '❌'}`)
  console.log(`routine_exercises table: ${results.routine_exercises.exists ? '✓' : '❌'}`)
  console.log(`routine_sets table: ${results.routine_sets.exists ? '✓' : '❌'}`)
  console.log('')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})