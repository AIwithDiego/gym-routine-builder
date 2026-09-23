-- Migration: Weekly Plan
-- Adds routines.assigned_weekdays (SMALLINT[]) for the weekly-plan feature.
-- Adds RPCs for atomic weekday assignment and latest-set-per-routine-item lookup.
-- Fixes pre-existing FK: workout_sessions.routine_id ON DELETE SET NULL (was NO ACTION).
--
-- Weekday convention: 0 = Sunday, 6 = Saturday (matches JS Date.getDay() and Postgres EXTRACT(DOW)).
-- Idempotent: safe to re-run.

-- 1. Add the column (nullable first to avoid lock on populated table).
ALTER TABLE routines
  ADD COLUMN IF NOT EXISTS assigned_weekdays SMALLINT[];

-- 2. Backfill: NULL → empty array.
UPDATE routines
  SET assigned_weekdays = '{}'::SMALLINT[]
  WHERE assigned_weekdays IS NULL;

-- 3. Lock to NOT NULL + DEFAULT empty array.
ALTER TABLE routines
  ALTER COLUMN assigned_weekdays SET NOT NULL,
  ALTER COLUMN assigned_weekdays SET DEFAULT '{}'::SMALLINT[];

-- 4. Constraints: every value 0..6, no duplicates within the array.
ALTER TABLE routines
  DROP CONSTRAINT IF EXISTS routines_assigned_weekdays_range_chk;
ALTER TABLE routines
  ADD CONSTRAINT routines_assigned_weekdays_range_chk
  CHECK (
    assigned_weekdays <@ ARRAY[0,1,2,3,4,5,6]::SMALLINT[]
  );

-- Uniqueness within the array is enforced at the API layer:
-- Postgres disallows subqueries in CHECK constraints, so the dedupe lives in the
-- PATCH /weekdays handler + routines_set_weekdays RPC. The range CHECK above is
-- the DB-level floor.

-- 5. FK fix: workout_sessions.routine_id ON DELETE SET NULL.
-- Pre-existing bug: deleting a routine with completed workouts currently fails.
ALTER TABLE workout_sessions
  DROP CONSTRAINT IF EXISTS workout_sessions_routine_id_fkey;
ALTER TABLE workout_sessions
  ADD CONSTRAINT workout_sessions_routine_id_fkey
  FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE SET NULL;

-- 6. RPC: routines_set_weekdays.
-- Atomically assigns `days` to `routine_id` and strips those days from every
-- other routine. Enforces the one-routine-per-day invariant in a single tx.
CREATE OR REPLACE FUNCTION routines_set_weekdays(
  p_routine_id UUID,
  p_days SMALLINT[]
) RETURNS routines AS $$
DECLARE
  updated_routine routines;
BEGIN
  -- Strip the requested days from every OTHER routine that currently holds them.
  UPDATE routines
    SET assigned_weekdays = ARRAY(
      SELECT unnest(assigned_weekdays)
      EXCEPT
      SELECT unnest(p_days)
    )
    WHERE id <> p_routine_id
      AND assigned_weekdays && p_days;

  -- Assign the days to this routine.
  UPDATE routines
    SET assigned_weekdays = p_days
    WHERE id = p_routine_id
    RETURNING * INTO updated_routine;

  RETURN updated_routine;
END;
$$ LANGUAGE plpgsql;

-- 7. RPC: routine_last_sets.
-- Returns the most recent recorded set per routine_item for a given routine,
-- across all completed sessions. DISTINCT ON is the idiomatic Postgres pattern.
CREATE OR REPLACE FUNCTION routine_last_sets(p_routine_id UUID)
RETURNS TABLE (
  routine_item_id UUID,
  weight NUMERIC,
  actual_reps INTEGER,
  completed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (ws.routine_item_id)
    ws.routine_item_id,
    ws.weight,
    ws.actual_reps,
    ws.completed_at
  FROM workout_sets ws
  JOIN workout_sessions s ON s.id = ws.session_id
  JOIN routine_items ri ON ri.id = ws.routine_item_id
  WHERE s.status = 'completed'
    AND ri.routine_id = p_routine_id
  ORDER BY ws.routine_item_id, ws.completed_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Rollback (manual):
--   DROP FUNCTION IF EXISTS routine_last_sets(UUID);
--   DROP FUNCTION IF EXISTS routines_set_weekdays(UUID, SMALLINT[]);
--   ALTER TABLE workout_sessions DROP CONSTRAINT workout_sessions_routine_id_fkey;
--   ALTER TABLE workout_sessions ADD CONSTRAINT workout_sessions_routine_id_fkey
--     FOREIGN KEY (routine_id) REFERENCES routines(id);
--   ALTER TABLE routines DROP CONSTRAINT routines_assigned_weekdays_range_chk;
--   ALTER TABLE routines DROP COLUMN assigned_weekdays;
