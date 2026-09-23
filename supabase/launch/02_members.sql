-- 02_members.sql: members-only access to the `gym` schema
--
-- Run right after 01_lockdown.sql. Safe against a build that still uses the
-- service-role key (it bypasses RLS). Idempotent and safe to re-run.
--
-- Signing in is not enough to use the app: the account must also be listed in
-- gym.members. Only service_role / postgres can write that table, so access is
-- granted by an operator in the SQL editor, never by the app or the user.
--
--   insert into gym.members (user_id)
--   select id from auth.users where email = '<EMAIL>';
--
-- How the gate works: one RESTRICTIVE policy per table, `to authenticated`,
-- for all commands. Postgres ANDs every restrictive policy into every
-- permissive policy on the table, so each existing *_own policy (and the
-- machines select policy) becomes "owner AND member", and so will any
-- permissive policy added later. Non-members see zero rows and cannot write.

begin;

-- ---------------------------------------------------------------------------
-- 0. Guard: 01_lockdown.sql must already be applied
-- ---------------------------------------------------------------------------

do $$
declare
  missing text;
begin
  select string_agg(t, ', ') into missing
  from unnest(array['machines', 'routines', 'routine_items',
                    'workout_sessions', 'workout_sets']) as t
  where not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'gym' and c.relname = t and c.relkind = 'r'
      and c.relrowsecurity
  );
  if missing is not null then
    raise exception '02_members.sql: RLS is off on gym tables (%). Run 01_lockdown.sql first.', missing;
  end if;

  if (select count(*) from information_schema.columns
      where table_schema = 'gym' and column_name = 'user_id'
        and table_name in ('routines', 'routine_items',
                           'workout_sessions', 'workout_sets')) <> 4 then
    raise exception '02_members.sql: user_id columns missing. Run 01_lockdown.sql first.';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 1. Members table: operator-managed, invisible to app roles
-- ---------------------------------------------------------------------------

create table if not exists gym.members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- RLS on with no policies: anon and authenticated can neither read nor write
-- it, even if a grant is added by mistake later.
alter table gym.members enable row level security;

revoke all on gym.members from public, anon, authenticated;
grant all on gym.members to service_role;

-- ---------------------------------------------------------------------------
-- 2. gym.is_member(): does the caller have a members row?
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER so it can read gym.members, which the caller cannot.
-- search_path is pinned to '' and every name is schema-qualified, so a caller
-- cannot redirect the lookup. It only ever answers for auth.uid(), so it
-- reveals nothing about other users. STABLE + the (select ...) wrapper in the
-- policies means it runs once per statement, not once per row.

create or replace function gym.is_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from gym.members m
    where m.user_id = (select auth.uid())
  );
$$;

revoke all on function gym.is_member() from public, anon;
grant execute on function gym.is_member() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Restrictive gate on every gym table
-- ---------------------------------------------------------------------------

drop policy if exists "machines_members_only" on gym.machines;
create policy "machines_members_only"
  on gym.machines as restrictive for all to authenticated
  using ((select gym.is_member()))
  with check ((select gym.is_member()));

drop policy if exists "routines_members_only" on gym.routines;
create policy "routines_members_only"
  on gym.routines as restrictive for all to authenticated
  using ((select gym.is_member()))
  with check ((select gym.is_member()));

drop policy if exists "routine_items_members_only" on gym.routine_items;
create policy "routine_items_members_only"
  on gym.routine_items as restrictive for all to authenticated
  using ((select gym.is_member()))
  with check ((select gym.is_member()));

drop policy if exists "workout_sessions_members_only" on gym.workout_sessions;
create policy "workout_sessions_members_only"
  on gym.workout_sessions as restrictive for all to authenticated
  using ((select gym.is_member()))
  with check ((select gym.is_member()));

drop policy if exists "workout_sets_members_only" on gym.workout_sets;
create policy "workout_sets_members_only"
  on gym.workout_sets as restrictive for all to authenticated
  using ((select gym.is_member()))
  with check ((select gym.is_member()));

commit;

notify pgrst, 'reload schema';

-- Verify (expect one row per table, all five tables listed):
--   select tablename, policyname, permissive from pg_policies
--   where schemaname = 'gym' and policyname like '%\_members\_only';
--
-- Rollback (manual; re-opens gym to every signed-in user of the project):
--   drop policy "<table>_members_only" on gym.<table>;  -- for each table
--   drop function gym.is_member();
--   drop table gym.members;
