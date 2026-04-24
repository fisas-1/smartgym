import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ronzmensezcuszabqfbz.supabase.co'
const supabaseAnonKey = 'sb_publishable_PAj7ItJGXoWw1-uedmUYnQ_OrZfRuBz'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test user ID (replace with actual user ID from your auth)
const TEST_USER_ID = '00000000-0000-0000-0000-000000000000' // Placeholder

async function testInsert() {
  console.log('Testing insertion into workout_logs...\n')

  const testData = {
    exercise: 'Press Banca',
    weight: 80,
    reps: 5,
    rir: 2,
    one_rm: 95.5,
    user_id: TEST_USER_ID,
    created_at: new Date().toISOString()
  }

  console.log('Attempting insert with data:', testData)

  const { data, error } = await supabase
    .from('workout_logs')
    .insert(testData)
    .select()
    .maybeSingle()

  if (error) {
    console.error('\n❌ INSERT FAILED:', error.message)
    console.error('Error details:', error)
  } else {
    console.log('\n✓ INSERT SUCCESSFUL!')
    console.log('Inserted record:', data)
  }
}

async function testSelect() {
  console.log('\nTesting select query...')
  const { data, error } = await supabase
    .from('workout_logs')
    .select('*')
    .limit(5)

  if (error) {
    console.error('Select error:', error.message)
  } else {
    console.log(`Found ${data?.length || 0} records`)
    if (data && data.length > 0) {
      console.log('Sample record:', data[0])
    }
  }
}

async function verifySchema() {
  console.log('Verifying current schema...\n')
  
  // Try to query a row to see all columns
  const { data, error } = await supabase
    .from('workout_logs')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Error:', error.message)
    return
  }

  if (data && data.length > 0) {
    console.log('Table columns:', Object.keys(data[0]))
    console.log('\nSample data:', data[0])
  } else {
    console.log('Table is empty (no rows)')
  }
}

// Run verification
verifySchema().then(() => {
  console.log('\n-------------------\n')
  return testInsert()
}).then(() => {
  console.log('\n-------------------\n')
  return testSelect()
}).catch(err => {
  console.error('Unexpected error:', err)
})
