-- 04_rpcs_at_deploy.sql: rewrite the two RPCs to run as the caller
--
-- Run at deploy of the auth build. Requires 01_lockdown.sql (user_id columns).
-- Idempotent and safe to re-run.
--
-- Order does not matter relative to the deploy itself:
--   * the new build works with the old function bodies (they are SECURITY
--     INVOKER already, so RLS scopes them to the caller), and
--   * a build that still uses the service-role key keeps working with the new
--     bodies, because the owner filter only applies when there is a signed-in
--     caller (auth.uid() is null for the service role, which bypasses RLS
--     anyway). anon cannot execute either function, and for an authenticated
--     caller RLS plus the members gate still decide which rows exist.

begin;

-- Guard: 01_lockdown.sql must be applied (plpgsql only resolves column names
-- at call time, so without this the functions would install and then fail).
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'gym' and table_name = 'routines' and column_name = 'user_id'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'gym' and table_name = 'workout_sets' and column_name = 'user_id'
  ) then
    raise exception '04_rpcs_at_deploy.sql: user_id columns missing. Run 01_lockdown.sql first.';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 5. RPCs: run as the caller, pinned search_path, explicit owner filter
-- ---------------------------------------------------------------------------
-- SECURITY INVOKER (the default, stated explicitly) means RLS applies inside
-- the function body. The extra user_id filters are belt and braces for signed-
-- in callers; they are skipped when auth.uid() is null (service role only, see
-- the header), so running this file before the deploy cannot silently turn the
-- old build's weekday assignment into a no-op.

create or replace function gym.routines_set_weekdays(
  p_routine_id uuid,
  p_days smallint[]
) returns gym.routines
language plpgsql
security invoker
set search_path = ''
as $$
declare
  updated_routine gym.routines;
begin
  -- Strip the requested days from the caller's OTHER routines.
  update gym.routines
    set assigned_weekdays = array(
      select unnest(assigned_weekdays)
      except
      select unnest(p_days)
    )
    where id <> p_routine_id
      and (user_id = (select auth.uid()) or (select auth.uid()) is null)
      and assigned_weekdays && p_days;

  -- Assign the days to this routine.
  update gym.routines
    set assigned_weekdays = p_days
    where id = p_routine_id
      and (user_id = (select auth.uid()) or (select auth.uid()) is null)
    returning * into updated_routine;

  return updated_routine;
end;
$$;

create or replace function gym.routine_last_sets(p_routine_id uuid)
returns table (
  routine_item_id uuid,
  weight numeric,
  actual_reps integer,
  completed_at timestamptz
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  return query
  select distinct on (ws.routine_item_id)
    ws.routine_item_id,
    ws.weight,
    ws.actual_reps,
    ws.completed_at
  from gym.workout_sets ws
  join gym.workout_sessions s on s.id = ws.session_id
  join gym.routine_items ri on ri.id = ws.routine_item_id
  where s.status = 'completed'
    and ri.routine_id = p_routine_id
    and (ws.user_id = (select auth.uid()) or (select auth.uid()) is null)
  order by ws.routine_item_id, ws.completed_at desc;
end;
$$;

-- The updated_at trigger function, if it was migrated into gym: pin its
-- search_path too (it only touches NEW, so no qualification needed).
do $$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'gym' and p.proname = 'update_updated_at_column'
  ) then
    execute 'alter function gym.update_updated_at_column() set search_path = ''''';
  end if;
end
$$;

-- Re-assert execute grants (create or replace keeps them; this is for a
-- database where the functions did not exist before).
revoke all on function gym.routines_set_weekdays(uuid, smallint[]) from public, anon;
revoke all on function gym.routine_last_sets(uuid) from public, anon;
grant execute on function gym.routines_set_weekdays(uuid, smallint[]) to authenticated, service_role;
grant execute on function gym.routine_last_sets(uuid) to authenticated, service_role;

commit;

notify pgrst, 'reload schema';
