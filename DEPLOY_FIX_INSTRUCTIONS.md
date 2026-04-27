# 🔧 INSTRUCCIONS D'INSTAL·LACIÓ

## EL PROBLEMA

L'error `Could not find the 'exercise' column of 'workout_logs' in the schema cache` significa que la taula `workout_logs` no te les columnes necessàries.

## SOLUCIÓ PAS A PAS

### Pas 1: Executar l'SQL a Supabase

Has d'afegir manualment les columnes a la taula `workout_logs`:

1. **Obre Supabase Dashboard**: https://ronzmensezcuszabqfbz.supabase.co
2. **Menú esquerra** → `SQL Editor` (icona de base de dades)
3. Cliquea `New query`
4. Copia i enganxa aquest SQL:

```sql
-- AFEGIR COLUMNES FALTANTS A workout_logs
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workout_logs' 
      AND column_name = 'exercise'
      AND table_schema = 'public'
  ) THEN 
    ALTER TABLE public.workout_logs ADD COLUMN exercise TEXT;
  END IF;
END $$;

DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workout_logs' 
      AND column_name = 'one_rm'
      AND table_schema = 'public'
  ) THEN 
    ALTER TABLE public.workout_logs ADD COLUMN one_rm NUMERIC;
  END IF;
END $$;
```

5. Prem el botó verd **Run** (o Ctrl+Enter)
6. T'ha d'aparèixer: `Query executed successfully`

**OPCIONAL**: Executa també aquest SQL per totes les noves taules:

```sql
-- Pega el contingut de:
-- supabase/migrations/20250424_add_routines_schema.sql
```

### Pas 2: Verificar columnes

Executa aquesta query per confirmar que tot està bé:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'workout_logs' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
```

Hauries de veure:
- `exercise` (text)
- `weight` (numeric)
- `reps` (integer)
- `rir` (numeric)
- `one_rm` (numeric) ← **AQUESTA ÉS LA CLAU**
- `user_id` (uuid)
- `created_at` (timestamp)

### Pas 3: Reiniciar l'aplicació

Si estàs desenvolupant localment:
```bash
npm run dev
```

Si estàs a Vercel, el redeploy automàtic ja hauria de funcionar.

--- 

## ⚠️ Comprovar abans de fer res més

Abans d'afegir noves funcionalitats, assegura't que:

1. La query a `app/page.tsx` línia 113 funciona (inserció)
2. La query a `app/page.tsx` línia 33 funciona (select)
3. Els logs es guarden correctament

Si segueix donant error, és que les columnes NO s'han creat. Revisa l'SQL Editor que no hi hagi cap error.

--- 

## 🆘 Ajuda addicional

Si el problema persisteix:

1. Asegúrate d'estar connectat a la base de dades correcta (public schema)
2. Revisa que la taula es digui exactament `workout_logs` (no `workout_logs_old` ni similar)
3. No hi ha `;` faltant al SQL - a vegades falla per aquest detall

Si vols, et puc preparar un script JavaScript per comprovar que tot funciona correctament.
