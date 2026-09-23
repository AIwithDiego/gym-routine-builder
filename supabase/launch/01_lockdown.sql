-- 01_lockdown.sql: Supabase Auth ownership + Row Level Security for `gym`
--
-- Launch order (see docs/launch-checklist.md):
--   01_lockdown.sql        <- this file. Run first, before any deploy of the auth build.
--   02_members.sql         membership gate. Run right after this file.
--   03_fk_set_null.sql     workout_sets FK fix. Any time after 01.
--   04_rpcs_at_deploy.sql  RPC rewrites. At deploy (safe either side of it).
--   05_backfill.sql        assigns existing rows + adds the owner as a member.
--                          After the auth build is live and the account exists.
--
-- Before this file the `gym` tables had RLS off with full anon grants. After it:
--   * every user-owned row carries user_id (defaults to auth.uid())
--   * RLS is on for all five tables, with one policy per operation
--   * anon has no access to the schema at all
--   * authenticated users can read the machines catalogue and read/write only
--     their own routines, items, sessions and sets (02_members.sql then limits
--     "authenticated" to approved members)
--
-- Safe against a build that still uses the service-role key (it bypasses RLS).
-- Idempotent and safe to re-run. A re-run keeps the *_members_only policies
-- that 02_members.sql adds, so it never silently removes the membership gate.
--
-- Until 05_backfill.sql runs, existing rows have user_id NULL and are
-- invisible to every signed-in user (the service role still sees them).

begin;

-- ---------------------------------------------------------------------------
-- 1. Ownership columns
-- ---------------------------------------------------------------------------
-- Nullable for now so existing rows survive; STEP 2 backfills and sets NOT NULL.
-- ON DELETE CASCADE: deleting an auth user deletes their gym data.

alter table gym.routines
  add column if not exists user_id uuid
  references auth.users(id) on delete cascade default auth.uid();

alter table gym.routine_items
  add column if not exists user_id uuid
  references auth.users(id) on delete cascade default auth.uid();

alter table gym.workout_sessions
  add column if not exists user_id uuid
  references auth.users(id) on delete cascade default auth.uid();

alter table gym.workout_sets
  add column if not exists user_id uuid
  references auth.users(id) on delete cascade default auth.uid();

-- ---------------------------------------------------------------------------
-- 2. Indexes (policy columns + every FK column)
-- ---------------------------------------------------------------------------

create index if not exists idx_routines_user_id          on gym.routines (user_id);
create index if not exists idx_routine_items_user_id     on gym.routine_items (user_id);
create index if not exists idx_workout_sessions_user_id  on gym.workout_sessions (user_id);
create index if not exists idx_workout_sets_user_id      on gym.workout_sets (user_id);

create index if not exists idx_routine_items_routine_id      on gym.routine_items (routine_id);
create index if not exists idx_routine_items_machine_id      on gym.routine_items (machine_id);
create index if not exists idx_workout_sessions_routine_id   on gym.workout_sessions (routine_id);
create index if not exists idx_workout_sets_session_id       on gym.workout_sets (session_id);
create index if not exists idx_workout_sets_routine_item_id  on gym.workout_sets (routine_item_id);

-- ---------------------------------------------------------------------------
-- 3. Enable RLS and clear any pre-existing policies
-- ---------------------------------------------------------------------------
-- Policies left over from the "RLS off" era would switch on the moment RLS is
-- enabled, so every existing policy on these tables is dropped first, except
-- the *_members_only gate from 02_members.sql (so a re-run of this file cannot
-- silently open the tables to every signed-in user).

do $$
declare
  pol record;
begin
  for pol in
    select policyname, tablename
    from pg_policies
    where schemaname = 'gym'
      and tablename in ('machines', 'routines', 'routine_items',
                        'workout_sessions', 'workout_sets')
      and policyname not like '%\_members\_only'
  loop
    execute format('drop policy %I on gym.%I', pol.policyname, pol.tablename);
  end loop;
end
$$;

alter table gym.machines          enable row level security;
alter table gym.routines          enable row level security;
alter table gym.routine_items     enable row level security;
alter table gym.workout_sessions  enable row level security;
alter table gym.workout_sets      enable row level security;

-- ---------------------------------------------------------------------------
-- 4. Policies
-- ---------------------------------------------------------------------------
-- (select auth.uid()) is wrapped so Postgres evaluates it once per statement,
-- not once per row.

-- machines: reference catalogue. Read-only for signed-in users.
-- No insert/update/delete policies: the app never writes it; seed via SQL.
create policy "machines_select_authenticated"
  on gym.machines for select to authenticated
  using (true);

-- routines: owner only.
create policy "routines_select_own"
  on gym.routines for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "routines_insert_own"
  on gym.routines for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "routines_update_own"
  on gym.routines for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "routines_delete_own"
  on gym.routines for delete to authenticated
  using ((select auth.uid()) = user_id);

-- routine_items: owner only, and the parent routine must also be the owner's
-- (stops attaching items to someone else's routine by guessing its id).
create policy "routine_items_select_own"
  on gym.routine_items for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "routine_items_insert_own"
  on gym.routine_items for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from gym.routines r
      where r.id = routine_id and r.user_id = (select auth.uid())
    )
  );

create policy "routine_items_update_own"
  on gym.routine_items for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from gym.routines r
      where r.id = routine_id and r.user_id = (select auth.uid())
    )
  );

create policy "routine_items_delete_own"
  on gym.routine_items for delete to authenticated
  using ((select auth.uid()) = user_id);

-- workout_sessions: owner only; routine_id (nullable, SET NULL on routine
-- delete) must point at one of the owner's routines when present.
create policy "workout_sessions_select_own"
  on gym.workout_sessions for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "workout_sessions_insert_own"
  on gym.workout_sessions for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      routine_id is null
      or exists (
        select 1 from gym.routines r
        where r.id = routine_id and r.user_id = (select auth.uid())
      )
    )
  );

create policy "workout_sessions_update_own"
  on gym.workout_sessions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      routine_id is null
      or exists (
        select 1 from gym.routines r
        where r.id = routine_id and r.user_id = (select auth.uid())
      )
    )
  );

create policy "workout_sessions_delete_own"
  on gym.workout_sessions for delete to authenticated
  using ((select auth.uid()) = user_id);

-- workout_sets: owner only; the session and (when set) the routine item must
-- both be the owner's.
create policy "workout_sets_select_own"
  on gym.workout_sets for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "workout_sets_insert_own"
  on gym.workout_sets for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from gym.workout_sessions s
      where s.id = session_id and s.user_id = (select auth.uid())
    )
    and (
      routine_item_id is null
      or exists (
        select 1 from gym.routine_items ri
        where ri.id = routine_item_id and ri.user_id = (select auth.uid())
      )
    )
  );

create policy "workout_sets_update_own"
  on gym.workout_sets for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from gym.workout_sessions s
      where s.id = session_id and s.user_id = (select auth.uid())
    )
    and (
      routine_item_id is null
      or exists (
        select 1 from gym.routine_items ri
        where ri.id = routine_item_id and ri.user_id = (select auth.uid())
      )
    )
  );

create policy "workout_sets_delete_own"
  on gym.workout_sets for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- 6. Grants: anon out, authenticated scoped, service_role untouched
-- ---------------------------------------------------------------------------

revoke all on all tables    in schema gym from anon;
revoke all on all functions in schema gym from anon, public;
revoke all on schema gym from anon, public;

grant usage on schema gym to authenticated;

revoke all on all tables in schema gym from authenticated;
grant select on gym.machines to authenticated;
grant select, insert, update, delete on
  gym.routines, gym.routine_items, gym.workout_sessions, gym.workout_sets
  to authenticated;

grant execute on function gym.routines_set_weekdays(uuid, smallint[]) to authenticated;
grant execute on function gym.routine_last_sets(uuid) to authenticated;

-- service_role (local seed scripts) keeps full access; granted explicitly so
-- the PUBLIC revokes above cannot take anything away from it.
grant usage on schema gym to service_role;
grant all on all tables    in schema gym to service_role;
grant all on all functions in schema gym to service_role;

-- Future objects created in gym by postgres do not get anon grants by default.
alter default privileges in schema gym revoke all on tables    from anon;
alter default privileges in schema gym revoke all on functions from anon, public;

commit;

notify pgrst, 'reload schema';

-- Rollback (manual, restores the pre-auth posture; do not run in production):
--   drop policy ... (all *_own and machines_select_authenticated policies);
--   alter table gym.<each table> disable row level security;
--   alter table gym.<each table> drop column user_id;
--   grant usage on schema gym to anon; grant all on all tables in schema gym to anon;
