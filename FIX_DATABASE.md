# 🔧 FIX PER ERRORE DATABASE - SmartGym

## Problema

Due errori principali quando si usa l'applicazione:

### Errore 1: Salvataggio allenamento
```
Error al guardar: Could not find the 'exercise' column of 'workout_logs' in the schema cache
```

**Causa**: La tabella `workout_logs` non ha le colonne `exercise` e `one_rm`.

### Errore 2: Creazione routine
```
Error al crear rutina: Could not find the table 'public.routines' in the schema cache
```

**Causa**: Le tabelle `routines`, `routine_exercises` e `routine_sets` non esistono.

---

## Soluzione

### 🚀 Metodo Rapido - Esegui SQL in Supabase

1. Apri il **Supabase Dashboard**: https://ronzmensezcuszabqfbz.supabase.co
2. Clicca **SQL Editor** nel menu a sinistra (icona database 🗄️)
3. Clicca **New query**
4. Copia tutto il contenuto del file `deploy-schema.sql` (o l'SQL qui sotto)
5. Clicca **Run** (o premi Ctrl+Enter)
6. Attendi il completamento

---

## 📋 SQL da Eseguire

### Passo 1: Aggiungere colonne mancanti a workout_logs

```sql
-- Aggiunge colonna 'exercise' se non esiste
ALTER TABLE public.workout_logs 
  ADD COLUMN IF NOT EXISTS exercise TEXT;

-- Aggiunge colonna 'one_rm' se non esiste
ALTER TABLE public.workout_logs 
  ADD COLUMN IF NOT EXISTS one_rm NUMERIC;
```

### Passo 2: Creare tabelle per le routine (completo in deploy-schema.sql)

Il file `deploy-schema.sql` contiene tutto il necessario:
- Tabelle: `routines`, `routine_exercises`, `routine_sets`
- Indici per performance
- Row Level Security (RLS)
- Policies di accesso
- Funzione `get_weight_recommendation()`
- Trigger `update_updated_at_column()`

Esegui l'intero file `deploy-schema.sql` in Supabase SQL Editor.

---

## ✅ Verifica

Dopo aver eseguito l'SQL, verifica che tutto funzioni:

```bash
cd C:\Users\User\smartgym
node verify-fix.js
```

Output atteso:
```
✓ workout_logs: Colonne presenti (exercise, one_rm, ...)
✓ routines: Tabella creata
✓ routine_exercises: Tabella creata
✓ routine_sets: Tabella creata
```

---

## 📄 Struttura Database (Dopo il Fix)

### Tabella: `workout_logs`
| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| id | UUID | ID record |
| user_id | UUID | Utente (FK: auth.users) |
| exercise | TEXT | Nome esercizio |
| weight | NUMERIC | Peso sollevato |
| reps | INTEGER | Ripetizioni |
| rir | NUMERIC | Ripetizioni in riserva |
| one_rm | NUMERIC | 1RM calcolato |
| created_at | TIMESTAMP | Data creazione |

### Tabella: `routines`
| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| id | UUID | ID routine |
| user_id | UUID | Proprietario |
| name | TEXT | Nome routine |
| description | TEXT | Descrizione |
| created_at | TIMESTAMP | Data creazione |
| updated_at | TIMESTAMP | Ultima modifica |

### Tabella: `routine_exercises`
| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| id | UUID | ID record |
| routine_id | UUID | Routine padre |
| exercise | TEXT | Nome esercizio |
| sets_target | INTEGER | Serie previste |
| reps_min | INTEGER | Ripetizioni minime |
| reps_max | INTEGER | Ripetizioni massime |
| order_index | INTEGER | Ordine |
| created_at | TIMESTAMP | Data creazione |

### Tabella: `routine_sets`
| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| id | UUID | ID record |
| routine_exercise_id | UUID | Esercizio |
| workout_log_id | UUID | Log allenamento (FK) |
| set_number | INTEGER | Numero serie |
| completed | BOOLEAN | Completata? |
| notes | TEXT | Note |
| completed_at | TIMESTAMP | Data completamento |
| created_at | TIMESTAMP | Data creazione |

---

## 🔐 Sicurezza (RLS)

Tutte le tabelle hanno Row Level Security abilitata. Ogni utente può:
- **Vedere** solo i propri dati
- **Creare** solo dati propri
- **Modificare** solo dati propri
- **Eliminare** solo dati propri

---

## 📄 File del Progetto

- `deploy-schema.sql` - SQL completo da eseguire
- `fix-schema.sql` - SQL semplificato
- `verify-fix.js` - Script di verifica
- `check-schema.js` - Controllo colonne
- `FIX_DATABASE.md` - Questo file

---

## 🆘 Risoluzione Problemi

### Errore: "Permission denied"
**Soluzione**: Assicurati di essere loggato come owner del database in Supabase

### Errore: "Column already exists"
**Soluzione**: È normale, significa che la colonna esiste già. L'SQL usa `IF NOT EXISTS`

### Errore: "Table already exists"
**Soluzione**: Normale, le tabelle sono già state create. L'SQL usa `IF NOT EXISTS`

### Dopo il fix l'app continua a dare errore
**Soluzione**: 
1. Ricarica la pagina (Ctrl+F5)
2. Riavvia il dev server: `npm run dev`
3. Verifica la console del browser (F12) per errori

---

## 📝 Note per gli Sviluppatori

### Perché non posso fixare via codice?
I comandi DDL (ALTER TABLE, CREATE TABLE) richiedono permessi di amministratore che non sono disponibili tramite le API pubbliche di Supabase. Devono essere eseguiti tramite:
- Supabase SQL Editor (dashboard)
- Supabase CLI
- Connessione diretta al DB (psql)

### Architettura Supabase
- **PostgREST**: Genera API REST automaticamente dalle tabelle
- **Row Level Security**: Controlla l'accesso ai dati
- **Auth**: Gestisce autenticazione utenti
- **SQL Editor**: Interfaccia per eseguire query DDL/DML

---

## 🎯 Checklist Finale

- [ ] Eseguito SQL per `workout_logs` (colonne exercise, one_rm)
- [ ] Eseguito SQL per `routines` (tabella completa)
- [ ] Eseguito SQL per `routine_exercises` (tabella completa)
- [ ] Eseguito SQL per `routine_sets` (tabella completa)
- [ ] Verificato con `node verify-fix.js`
- [ ] Testato salvataggio allenamento
- [ ] Testato creazione routine
- [ ] Tutto funziona! ✅

---

*Ultimo aggiornamento: 2026-04-27*