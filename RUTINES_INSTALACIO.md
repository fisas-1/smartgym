# Instruccions d'Instal·lació - Sistema de Rutines

## 1. ARREGLAR COLUMNES DE workout_logs

El problema original era que la taula `workout_logs` no tenia les columnes `exercise` i `one_rm`.

**Acció required**: Executeu aquest SQL a Supabase:

```sql
-- Afegeix les columnes mancants
ALTER TABLE public.workout_logs 
  ADD COLUMN IF NOT EXISTS exercise TEXT,
  ADD COLUMN IF NOT EXISTS one_rm NUMERIC;
```

**Com executar**:
1. Anar a: https://ronzmensezcuszabqfbz.supabase.co
2. Menú lateral → "SQL Editor"
3. Cliqueu "New query"
4. Enganxeu el codi anterior
5. Cliqueu "Run" (o Ctrl+Enter)

---

## 2. CREAR NOVES TAULES DE RUTINES

**Acció required**: Executeu el següent SQL a Supabase SQL Editor:

```sql
-- ============================================
-- SCHEMA DE RUTINES (Routines)
-- ============================================

-- Taula de rutines
CREATE TABLE IF NOT EXISTS public.routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Taula d'exercicis de rutina
CREATE TABLE IF NOT EXISTS public.routine_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  exercise TEXT NOT NULL,
  sets_target INTEGER NOT NULL CHECK (sets_target > 0),
  reps_min INTEGER NOT NULL CHECK (reps_min > 0),
  reps_max INTEGER NOT NULL CHECK (reps_max >= reps_min),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Taula de series completades de rutina
CREATE TABLE IF NOT EXISTS public.routine_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_exercise_id UUID NOT NULL REFERENCES public.routine_exercises(id) ON DELETE CASCADE,
  workout_log_id UUID REFERENCES public.workout_logs(id) ON DELETE SET NULL,
  set_number INTEGER NOT NULL CHECK (set_number > 0),
  completed BOOLEAN DEFAULT false NOT NULL,
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índexs per a millor rendiment
CREATE INDEX IF NOT EXISTS idx_routines_user_id ON public.routines(user_id);
CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine_id ON public.routine_exercises(routine_id);
CREATE INDEX IF NOT EXISTS idx_routine_sets_exercise_id ON public.routine_sets(routine_exercise_id);
CREATE INDEX IF NOT EXISTS idx_routine_sets_workout_log_id ON public.routine_sets(workout_log_id);

-- Row Level Security (RLS)
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_sets ENABLE ROW LEVEL SECURITY;

-- Polítiques RLS per a routines
CREATE POLICY "Usuaris poden veure les seves rutines" ON public.routines
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuaris poden crear les seves rutines" ON public.routines
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuaris poden actualitzar les seves rutines" ON public.routines
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Usuaris poden eliminar les seves rutines" ON public.routines
  FOR DELETE USING (auth.uid() = user_id);

-- Polítiques RLS per a routine_exercises
CREATE POLICY "Usuaris poden veure exercicis de les seves rutines" ON public.routine_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.routines 
      WHERE routines.id = routine_exercises.routine_id 
        AND routines.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuaris poden crear exercicis a les seves rutines" ON public.routine_exercises
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.routines 
      WHERE routines.id = routine_exercises.routine_id 
        AND routines.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuaris poden actualitzar exercicis de les seves rutines" ON public.routine_exercises
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.routines 
      WHERE routines.id = routine_exercises.routine_id 
        AND routines.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuaris poden eliminar exercicis de les seves rutines" ON public.routine_exercises
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.routines 
      WHERE routines.id = routine_exercises.routine_id 
        AND routines.user_id = auth.uid()
    )
  );

-- Polítiques RLS per a routine_sets
CREATE POLICY "Usuaris poden veure series de les seves rutines" ON public.routine_sets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.routine_exercises re
      JOIN public.routines r ON re.routine_id = r.id
      WHERE re.id = routine_sets.routine_exercise_id 
        AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuaris poden crear series a les seves rutines" ON public.routine_sets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.routine_exercises re
      JOIN public.routines r ON re.routine_id = r.id
      WHERE re.id = routine_sets.routine_exercise_id 
        AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuaris poden actualitzar series de les seves rutines" ON public.routine_sets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.routine_exercises re
      JOIN public.routines r ON re.routine_id = r.id
      WHERE re.id = routine_sets.routine_exercise_id 
        AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuaris poden eliminar series de les seves rutines" ON public.routine_sets
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.routine_exercises re
      JOIN public.routines r ON re.routine_id = r.id
      WHERE re.id = routine_sets.routine_exercise_id 
        AND r.user_id = auth.uid()
    )
  );

-- ============================================
-- FUNCIÓ DE RECOMANACIÓ DE PES
-- ============================================

CREATE OR REPLACE FUNCTION public.get_weight_recommendation(
  p_user_id UUID,
  p_exercise TEXT,
  p_target_reps INTEGER
)
RETURNS TABLE (
  recommended_weight NUMERIC,
  previous_weight NUMERIC,
  previous_reps INTEGER,
  previous_date TIMESTAMP WITH TIME ZONE,
  exercise TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH latest_log AS (
    SELECT 
      weight,
      reps,
      one_rm,
      created_at
    FROM public.workout_logs
    WHERE 
      user_id = p_user_id 
      AND exercise = p_exercise
      AND reps > 0
    ORDER BY created_at DESC
    LIMIT 1
  )
  SELECT 
    CASE 
      WHEN ll.weight IS NULL THEN NULL
      WHEN ll.reps >= p_target_reps THEN ROUND((ll.weight + 2.5)::numeric, 1)
      ELSE ROUND(ll.weight::numeric, 1)
    END as recommended_weight,
    ll.weight as previous_weight,
    ll.reps as previous_reps,
    ll.created_at as previous_date,
    p_exercise as exercise
  FROM latest_log ll;
END;
$$;

-- Trigger per actualitzar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_routines_updated_at
  BEFORE UPDATE ON public.routines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

---

## 3. REINICIAR L'APLICACIÓ

Després d'executar l'SQL:

```bash
# Si tens npm
npm run dev

# Si tens pnpm
pnpm dev

# Si tens yarn
yarn dev
```

---

## 4. VERIFICACIÓ

1. Inicia sessió a l'aplicació
2. Ves a la pàgina "Rutines" (/rutines)
3. Crea una nova rutina
4. Afeg exercicis i configura sèries/reps
5. Selecciona exercici → Veuràs el botó "💡 Recomanar Pes" (si tens historial)
6. Marca les series amb els checkboxes
7. Quan totes les series estiguin completades, apareixerà "Exercici Completat"
8. Prem "Reset per a nova sessió" per començar de zero el dia següent

---

## 5. NOTES IMPORTANTS

- **RLS**: Les polítiques de seguretat restringeixen l'accés a les dades pròpies
- **Dades de prova**: Si vols probar sense dades, pots afegir registres a `workout_logs` primer
- **Compatibilitat**: El sistema de recommendació funciona si ja has entrenat l'exercici anteriorment
- **Reset**: No esborra els logs existents, només les marques de completat de la rutina actual

---

## 6. TROBAR PROBLEMES?

Si reposes un error, consulta la consola del navegador (F12) i el servidor Next.js.

Errors comuns:
- `column "exercise" does not exist` → Columnes no van executar-se (pas 1)
- `function get_weight_recommendation does not exist` → Funció no creada (pas 2)
- `permission denied` → Polítiques RLS mal configurades

---

**Seu**: La implementació completa ja està a `/app/rutines/page.tsx`
