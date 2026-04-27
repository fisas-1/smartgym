# Soluzione Completa - Fix Database SmartGym

## ⚠️ IMPORTANTE

Questo problema **deve essere risolto manualmente** eseguendo SQL nel database Supabase perché:
- I comandi DDL (ALTER TABLE, CREATE TABLE) richiedono permessi amministratore
- L'API pubblica di Supabase non permette DDL per sicurezza
- Devi usare il Supabase Dashboard o la CLI

---

## 🚀 PASSI PER LA SOLUZIONE

### Passo 1: Apri Supabase Dashboard
Vai su: https://ronzmensezcuszabqfbz.supabase.co

### Passo 2: Apri SQL Editor
Clicca su **SQL Editor** nel menu sinistro (icona database 🗄️)

### Passo 3: Crea Nuova Query
Clicca il pulsante **New query**

### Passo 4: Esegui il Fix Completo

**Opzione A: Esegui tutto in una volta (RACCOMANDATO)**

Copia il contenuto completo del file `deploy-schema.sql` e incollalo nell'editor, poi clicca **Run** (Ctrl+Enter).

Oppure copia questo:

```sql
-- Fix 1: Aggiungi colonne a workout_logs
ALTER TABLE public.workout_logs ADD COLUMN IF NOT EXISTS exercise TEXT;
ALTER TABLE public.workout_logs ADD COLUMN IF NOT EXISTS one_rm NUMERIC;

-- Fix 2: Crea tabella routines
CREATE TABLE IF NOT EXISTS public.routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Fix 3: Crea tabella routine_exercises
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

-- Fix 4: Crea tabella routine_sets
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

-- Indici
CREATE INDEX IF NOT EXISTS idx_routines_user_id ON public.routines(user_id);
CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine_id ON public.routine_exercises(routine_id);
CREATE INDEX IF NOT EXISTS idx_routine_sets_exercise_id ON public.routine_sets(routine_exercise_id);
CREATE INDEX IF NOT EXISTS idx_routine_sets_workout_log_id ON public.routine_sets(workout_log_id);

-- RLS
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_sets ENABLE ROW LEVEL SECURITY;

-- Policies routines
CREATE POLICY "Usuaris poden veure les seves rutines" ON public.routines
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuaris poden crear les seves rutines" ON public.routines
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuaris poden actualitzar les seves rutines" ON public.routines
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuaris poden eliminar les seves rutines" ON public.routines
  FOR DELETE USING (auth.uid() = user_id);

-- Policies routine_exercises
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

-- Policies routine_sets
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

-- Funzione raccomandazione peso
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
    SELECT weight, reps, one_rm, created_at
    FROM public.workout_logs
    WHERE user_id = p_user_id AND exercise = p_exercise AND reps > 0
    ORDER BY created_at DESC LIMIT 1
  ), best_log AS (
    SELECT MAX(one_rm) as best_one_rm
    FROM public.workout_logs
    WHERE user_id = p_user_id AND exercise = p_exercise AND one_rm IS NOT NULL
  )
  SELECT
    CASE
      WHEN ll.weight IS NULL THEN NULL
      WHEN ll.reps >= p_target_reps THEN ROUND((ll.weight + 2.5)::numeric, 1)
      ELSE ROUND(ll.weight::numeric, 1)
    END,
    ll.weight, ll.reps, ll.created_at, p_exercise
  FROM latest_log ll LEFT JOIN best_log bl ON true;
END;
$$;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_routines_updated_at
  BEFORE UPDATE ON public.routines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

**Opzione B: Usa il file deploy-schema.sql**

Invece di copiare e incollare, puoi aprire il file `deploy-schema.sql` nel tuo editor di testo, copiare tutto e incollare in Supabase.

### Passo 5: Clicca "Run"

Clicca il pulsante verde **Run** (o premi Ctrl+Enter).

Dovresti vedere messaggi come:
```
Query executed successfully
```

### Passo 6: Verifica

Torna al terminale e esegui:
```bash
cd C:\Users\User\smartgym
node verify-fix.js
```

Dovresti vedere:
```
✓ workout_logs table exists
✓ Insert successful
✓ routines table exists
...ecc.
```

---

## 🎉 Fatto!

Ora l'applicazione dovrebbe funzionare correttamente:
- ✅ Puoi salvare allenamenti (serie, peso, reps, RIR)
- ✅ Puoi creare nuove routine
- ✅ Puoi aggiungere esercizi alle routine
- ✅ Puoi completare le serie
- ✅ La funzione di raccomandazione peso funziona

---

## 📚 Documentazione Aggiuntiva

Vedi anche:
- `FIX_DATABASE.md` - Documentazione dettagliata in inglese
- `RUTINES_INSTALACIO.md` - Istruzioni in catalano
- `DEPLOY_FIX_INSTRUCTIONS.md` - Istruzioni di deploy

---

## 🆘 Problemi?

Se dopo aver eseguito l'SQL c'è ancora un errore:

1. **Ricarica la pagina**: Ctrl+F5 (forza refresh)
2. **Riavvia il server**: `npm run dev`
3. **Controlla la console**: F12 → Console
4. **Riesegui la query**: A volte serve eseguirla 2 volte

---

## 🔍 Perché è successo?

Il database iniziale aveva la tabella `workout_logs` ma **senza** le colonne `exercise` e `one_rm`. Le nuove funzionalità (routine) richiedevano anche tabelle aggiuntive (`routines`, `routine_exercises`, `routine_sets`). Queste sono state create nel codice ma non nel database effettivo.

L'SQL in `supabase/migrations/` esiste ma **non è stato eseguito** sul database. Questa è la procedura normale: scrivi l'SQL, poi lo esegui manualmente o tramite CI/CD.

---

*Ultimo aggiornamento: 2026-04-27*