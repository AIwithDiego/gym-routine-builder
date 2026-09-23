-- Migration: Drop is_default
-- Retires routines.is_default. Weekly Plan (assigned_weekdays) is now the single
-- source of truth for "which routine on which day."
--
-- Ships in the same PR as migration_add_weekly_plan.sql but as a separate file
-- so the column add and the column drop can be applied / rolled back independently.

ALTER TABLE routines DROP COLUMN IF EXISTS is_default;

-- Rollback (manual):
--   ALTER TABLE routines ADD COLUMN is_default BOOLEAN DEFAULT FALSE;
