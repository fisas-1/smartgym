#!/usr/bin/env node
// Final verification script
const fs = require('fs');

console.log('\n=== SMARTGYM FIX - FINAL STATUS ===\n');

// Check files
console.log('📄 Files Status:');
const files = [
  'deploy-schema.sql',
  'fix-schema.sql', 
  'verify-fix.js',
  'check-schema.js',
  'SOLUZIONE.md',
  'FIX_DATABASE.md',
  'RUTINES_INSTALACIO.md',
  'FIX_SUMMARY.md',
  'README.md'
];

let filesOk = true;
files.forEach(f => {
  const exists = fs.existsSync(f);
  console.log(`  ${exists ? '✓' : '❌'} ${f}`);
  if (!exists) filesOk = false;
});

// Check SQL content
console.log('\n🔍 SQL Content Check:');
const sql = fs.readFileSync('deploy-schema.sql', 'utf8');
const checks = [
  ['exercise column', /exercise.*TEXT/i],
  ['one_rm column', /one_rm.*NUMERIC/i],
  ['routines table', /CREATE TABLE.*routines/i],
  ['routine_exercises table', /CREATE TABLE.*routine_exercises/i],
  ['routine_sets table', /CREATE TABLE.*routine_sets/i],
  ['RLS enabled', /ENABLE.*ROW.*LEVEL.*SECURITY/i],
  ['Policies (9 total)', /CREATE POLICY/g],
  ['get_weight_recommendation', /get_weight_recommendation/i],
  ['update_updated_at trigger', /update_updated_at_column/i]
];

let sqlOk = true;
checks.forEach(([name, pattern]) => {
  const count = (sql.match(pattern) || []).length;
  const ok = count > 0;
  const display = pattern.global ? `${count} found` : (ok ? '✓' : '❌');
  console.log(`  ${ok ? '✓' : '❌'} ${name}: ${display}`);
  if (!ok) sqlOk = false;
});

// Database status
console.log('\n🗄️  Database Status:');
console.log('  ⚠️  Exercise column: NOT YET ADDED (run SQL)');
console.log('  ⚠️  One_rm column: NOT YET ADDED (run SQL)');
console.log('  ⚠️  Routines tables: NOT YET CREATED (run SQL)');

// Summary
console.log('\n📊 Summary:');
console.log(`  Files ready: ${filesOk ? '✅' : '❌'}`);
console.log(`  SQL ready: ${sqlOk ? '✅' : '❌'}`);
console.log(`  Database deployed: ❌ (manual step needed)`);

console.log('\n🚀 Next Steps:');
console.log('  1. Open https://ronzmensezcuszabqfbz.supabase.co');
console.log('  2. Go to SQL Editor → New query');
console.log('  3. Run deploy-schema.sql');
console.log('  4. Run: node verify-fix.js');

console.log('\n📖 Documentation:');
console.log('  - SOLUZIONE.md - Guida passo-passo');
console.log('  - FIX_SUMMARY.md - Riassunto completo');
console.log('  - README.md - Setup iniziale');

console.log('');
process.exit(filesOk && sqlOk ? 0 : 1);
