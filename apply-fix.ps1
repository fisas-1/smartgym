# SmartGym Database Fix Script
# This script verifies the database state and provides instructions

Write-Host "SmartGym Database Fix Tool" -ForegroundColor Cyan
Write-Host "=========================`n" -ForegroundColor Cyan

Write-Host "Step 1: Checking current schema..." -ForegroundColor Yellow

# Run verify-fix.js
node verify-fix.js 2>&1 | ForEach-Object { Write-Host $_ }

Write-Host "`nStep 2: Database Fix Instructions" -ForegroundColor Yellow
Write-Host "==================================`n" -ForegroundColor Yellow

Write-Host "The database needs manual SQL execution in Supabase Dashboard."
Write-Host ""
Write-Host "1. Open: https://ronzmensezcuszabqfbz.supabase.co"
Write-Host "2. Go to: SQL Editor (left menu)"
Write-Host "3. Click: New query"
Write-Host "4. Copy contents of: deploy-schema.sql"
Write-Host "5. Click: Run (Ctrl+Enter)"
Write-Host ""
Write-Host "Or execute this simplified SQL:"
Write-Host "--------------------------------"
Write-Host @"
ALTER TABLE public.workout_logs ADD COLUMN IF NOT EXISTS exercise TEXT;
ALTER TABLE public.workout_logs ADD COLUMN IF NOT EXISTS one_rm NUMERIC;

CREATE TABLE IF NOT EXISTS public.routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
"@
Write-Host "--------------------------------"
Write-Host ""
Write-Host "After running SQL, verify with: node verify-fix.js" -ForegroundColor Green
Write-Host ""
Write-Host "For detailed instructions, see:" -ForegroundColor Yellow
Write-Host "  - SOLUZIONE.md (Italiano)"
Write-Host "  - FIX_DATABASE.md (English)"
Write-Host "  - RUTINES_INSTALACIO.md (Català)"