-- Gym Routine Builder: full schema for a fresh setup.
--
-- Everything lives in the `gym` schema (the app's Supabase clients use
-- db: { schema: 'gym' }). After running this, add `gym` to the exposed
-- schemas in Supabase: Project Settings > API > Exposed schemas.
--
-- Security model:
--   * Supabase Auth (email + password). Every user-owned row has user_id,
--     defaulting to auth.uid().
--   * RLS on every table, one policy per operation, `to authenticated`.
--   * Members only: a restrictive policy on every table requires a row in
--     gym.members for the caller. Only service_role / postgres can add one.
--   * machines is a read-only catalogue.
--   * anon has no access to the schema.
--
-- After running this, add yourself as a member (SQL editor):
--   insert into gym.members (user_id)
--   select id from auth.users where email = '<EMAIL>';
--
-- Existing databases: apply supabase/launch/01..05 in order instead.

create schema if not exists gym;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- machines: reference catalogue (seeded below with FlyeFit machines)
create table gym.machines (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  category text check (category in ('upper', 'lower', 'core', 'cardio')),
  brand text,
  description text,
  video_url text
);

-- routines
-- assigned_weekdays: 0 = Sunday, 6 = Saturday (matches JS Date.getDay()).
-- Uniqueness within the array is enforced at the API layer (Postgres disallows
-- subqueries in CHECK constraints).
create table gym.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  name text not null,
  notes text,
  assigned_weekdays smallint[] not null default '{}'::smallint[]
    check (assigned_weekdays <@ array[0,1,2,3,4,5,6]::smallint[]),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- routine_items (machines in a routine)
create table gym.routine_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  routine_id uuid references gym.routines(id) on delete cascade,
  machine_id uuid references gym.machines(id),
  position integer not null,
  sets integer default 3,
  reps integer default 10,
  rest_seconds integer default 60,
  default_weight numeric
);

-- workout_sessions
-- routine_id ON DELETE SET NULL: history persists when the routine is deleted.
create table gym.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  routine_id uuid references gym.routines(id) on delete set null,
  started_at timestamptz default now(),
  ended_at timestamptz,
  status text default 'in_progress'
    check (status in ('in_progress', 'completed', 'abandoned'))
);

-- workout_sets (actual recorded weights)
create table gym.workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  session_id uuid references gym.workout_sessions(id) on delete cascade,
  -- SET NULL: deleting a routine keeps its logged sets as history.
  routine_item_id uuid references gym.routine_items(id) on delete set null,
  set_number integer not null,
  target_reps integer not null,
  actual_reps integer,
  weight numeric not null,
  completed_at timestamptz default now()
);

-- members: accounts allowed to use the app. Operator-managed: RLS on with no
-- policies, and no grants to anon/authenticated, so only service_role and
-- postgres can read or write it.
create table gym.members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes (policy columns + every FK column)
-- ---------------------------------------------------------------------------

create index idx_routines_user_id          on gym.routines (user_id);
create index idx_routine_items_user_id     on gym.routine_items (user_id);
create index idx_workout_sessions_user_id  on gym.workout_sessions (user_id);
create index idx_workout_sets_user_id      on gym.workout_sets (user_id);

create index idx_routine_items_routine_id      on gym.routine_items (routine_id);
create index idx_routine_items_position        on gym.routine_items (routine_id, position);
create index idx_routine_items_machine_id      on gym.routine_items (machine_id);
create index idx_workout_sessions_routine_id   on gym.workout_sessions (routine_id);
create index idx_workout_sets_session_id       on gym.workout_sets (session_id);
create index idx_workout_sets_routine_item_id  on gym.workout_sets (routine_item_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function gym.update_updated_at_column()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_routines_updated_at
  before update on gym.routines
  for each row
  execute function gym.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Membership check
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER so it can read gym.members, which callers cannot. Pinned
-- search_path and qualified names; only ever answers for auth.uid().

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

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- (select auth.uid()) is wrapped so Postgres evaluates it once per statement.

alter table gym.members           enable row level security;
alter table gym.machines          enable row level security;
alter table gym.routines          enable row level security;
alter table gym.routine_items     enable row level security;
alter table gym.workout_sessions  enable row level security;
alter table gym.workout_sets      enable row level security;

-- Members gate: one RESTRICTIVE policy per table. Postgres ANDs it into every
-- permissive policy below, so every rule reads "... and the caller is a
-- member". Non-members see zero rows and cannot write.
create policy "machines_members_only"
  on gym.machines as restrictive for all to authenticated
  using ((select gym.is_member())) with check ((select gym.is_member()));

create policy "routines_members_only"
  on gym.routines as restrictive for all to authenticated
  using ((select gym.is_member())) with check ((select gym.is_member()));

create policy "routine_items_members_only"
  on gym.routine_items as restrictive for all to authenticated
  using ((select gym.is_member())) with check ((select gym.is_member()));

create policy "workout_sessions_members_only"
  on gym.workout_sessions as restrictive for all to authenticated
  using ((select gym.is_member())) with check ((select gym.is_member()));

create policy "workout_sets_members_only"
  on gym.workout_sets as restrictive for all to authenticated
  using ((select gym.is_member())) with check ((select gym.is_member()));

-- gym.members: no policies at all (operator-managed, see above).

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
-- RPCs (SECURITY INVOKER: RLS applies inside)
-- ---------------------------------------------------------------------------

-- routines_set_weekdays: assigns the given weekdays to one routine and strips
-- them from the caller's other routines in one transaction (one routine per day).
-- routine_last_sets: most recent recorded set per routine item across completed
-- sessions; powers "last used weight" on the Preview screen.
-- The user_id filters are belt and braces on top of RLS for signed-in callers;
-- they are skipped only when auth.uid() is null (the service role, which
-- bypasses RLS anyway; anon cannot execute these functions).

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

-- ---------------------------------------------------------------------------
-- Grants: anon out, authenticated scoped
-- ---------------------------------------------------------------------------

revoke all on all tables    in schema gym from anon;
revoke all on all functions in schema gym from anon, public;
revoke all on schema gym from anon, public;

grant usage on schema gym to authenticated, service_role;

grant select on gym.machines to authenticated;
grant select, insert, update, delete on
  gym.routines, gym.routine_items, gym.workout_sessions, gym.workout_sets
  to authenticated;

grant execute on function gym.routines_set_weekdays(uuid, smallint[]) to authenticated;
grant execute on function gym.routine_last_sets(uuid) to authenticated;
grant execute on function gym.is_member() to authenticated;

-- gym.members: nothing for anon/authenticated (the table-level grants above
-- never name it; this makes the intent explicit).
revoke all on gym.members from public, anon, authenticated;

grant all on all tables    in schema gym to service_role;
grant all on all functions in schema gym to service_role;

alter default privileges in schema gym revoke all on tables    from anon;
alter default privileges in schema gym revoke all on functions from anon, public;

-- ---------------------------------------------------------------------------
-- Seed: machines catalogue (FlyeFit gym)
-- ---------------------------------------------------------------------------

insert into gym.machines (name, category, brand, description, video_url) values
  ('Treadmill', 'cardio', 'Life Fitness', 'Motorized belt for walking, jogging, and running with adjustable speed and incline.', 'https://www.youtube.com/watch?v=8iPEnn-ltC8'),
  ('Stairmaster', 'cardio', 'Shua', 'Revolving staircase simulator that builds lower-body endurance and cardiovascular fitness.', 'https://www.youtube.com/watch?v=VCIe9LOh5eY'),
  ('Glutes and Hamstring Developer', 'lower', 'Exigo', 'Targets the glutes and hamstrings through a hip extension movement on a padded bench.', 'https://www.youtube.com/watch?v=B2uoBJJETkI'),
  ('Smith Machine', 'upper', 'Exigo', 'Guided barbell on fixed vertical rails for pressing, squatting, and rowing movements.', 'https://www.youtube.com/watch?v=KSalJ1bOufU'),
  ('Ski Erg', 'cardio', 'Concept 2', 'Simulates Nordic skiing with a pull-down motion for full-body cardiovascular training.', 'https://www.youtube.com/watch?v=NU_BQajMDHg'),
  ('Rowing Machine', 'cardio', 'Concept 2', 'Full-body cardiovascular exercise using a sliding seat and handle for a rowing stroke.', 'https://www.youtube.com/watch?v=EgYJmnQa6vg'),
  ('Stationary Bike', 'cardio', 'Concept 2', 'Fixed cycling station for low-impact cardiovascular conditioning and leg endurance.', 'https://www.youtube.com/watch?v=9OcjMagV99g'),
  ('Plate Loaded Hip Extension', 'lower', 'Strength Max', 'Isolates the glutes and hamstrings by driving the hips backward against plate-loaded resistance.', 'https://www.youtube.com/watch?v=AnCkO0j6fgw'),
  ('Plate Loaded Seated Row', 'upper', 'Panatta', 'Plate-loaded machine targeting the mid-back and lats with a seated horizontal pull.', 'https://www.youtube.com/watch?v=GZbfZ033f74'),
  ('Plate Loaded Incline Chest Press', 'upper', 'Panatta', 'Targets the upper chest and front deltoids with an incline pressing motion using plates.', 'https://www.youtube.com/watch?v=SrqOu55lrYU'),
  ('Shoulder Press Machine', 'upper', 'Hammer Strength', 'Targets the deltoids and triceps with an overhead pressing motion on a lever system.', 'https://www.youtube.com/watch?v=HzIIIpMhGBk'),
  ('Decline Chest Press Machine', 'upper', 'Hammer Strength', 'Emphasises the lower chest and triceps with a downward-angled pressing path.', 'https://www.youtube.com/watch?v=xK9zpReAaFc'),
  ('Lateral Raise Machine', 'upper', 'Hammer Strength', 'Isolates the medial deltoids by raising the arms out to the sides against resistance.', 'https://www.youtube.com/watch?v=6BmU5FPyYFE'),
  ('Calf Raise', 'lower', 'Hammer Strength', 'Isolates the calf muscles through a standing or seated heel-raise against loaded resistance.', 'https://www.youtube.com/watch?v=RBiMOqGnMSc'),
  ('Squat Lunge Drive', 'lower', 'Hammer Strength', 'Plate-loaded machine that trains squat and lunge patterns with a guided foot platform.', 'https://www.youtube.com/watch?v=G_5sCHODAJg'),
  ('Reverse Hyper Extension & Back Extension', 'core', 'Hammer Strength', 'Strengthens the posterior chain (lower back, glutes and hamstrings) via hip extension.', 'https://www.youtube.com/watch?v=ZeRsNzFcQLQ'),
  ('Plate Loaded Leg Extension', 'lower', 'Hammer Strength', 'Isolates the quadriceps by extending the knees against plate-loaded resistance.', 'https://www.youtube.com/watch?v=ljO4jkwv8wQ'),
  ('Iso Lying Leg Curl', 'lower', 'Hammer Strength', 'Isolates each hamstring independently in a lying position with a curling motion.', 'https://www.youtube.com/watch?v=1FNGMoMuGOA'),
  ('Assisted Nordic Curl', 'lower', 'Hammer Strength', 'Band- or lever-assisted Nordic curl targeting the hamstrings eccentrically.', 'https://www.youtube.com/watch?v=Wnx13YAGKWA'),
  ('Tricep Pushdown', 'upper', 'Gymleco', 'Cable-based exercise isolating the triceps through an elbow extension pushdown.', 'https://www.youtube.com/watch?v=2-LAMcpzODU'),
  ('Plate Loaded T-Bar Row', 'upper', 'Gymleco', 'Targets the mid-back and lats by rowing a pivoting barbell loaded with plates.', 'https://www.youtube.com/watch?v=j3Igk5nyZE4'),
  ('Standing Chest Press', 'upper', 'Gymleco', 'Plate-loaded press performed from a standing position to engage the chest and core.', 'https://www.youtube.com/watch?v=8urE8Z4FV18'),
  ('Plate Loaded Horizontal Leg Press', 'lower', 'Gymleco', 'Targets the quads, glutes, and hamstrings by pressing a sled horizontally with plates.', 'https://www.youtube.com/watch?v=IZxyjW7MPJQ'),
  ('Plate Loaded Pendulum Squat', 'lower', 'Gymleco', 'Guided squat machine with a pendulum arm that emphasises the quads and glutes.', 'https://www.youtube.com/watch?v=g6EUlCDpRrc'),
  ('Plate Loaded Hack Squat', 'lower', 'Gymleco', 'Angled sled machine targeting the quads with a deep squatting motion using plates.', 'https://www.youtube.com/watch?v=0tn5K9NlCGc'),
  ('Plate Loaded Leg Press', 'lower', 'Gymleco', 'Seated press targeting the quads, glutes, and hamstrings by pushing a plate-loaded sled.', 'https://www.youtube.com/watch?v=IZxyjW7MPJQ'),
  ('Cable Machine - Bicep Curl', 'upper', 'Gymleco', 'Cable-based exercise isolating the biceps through a curling motion with constant tension.', 'https://www.youtube.com/watch?v=NFzTWp2qpiE'),
  ('Cable Machine - Chest Fly', 'upper', 'Gymleco', 'Cable-based fly movement targeting the chest through a wide arcing motion.', 'https://www.youtube.com/watch?v=Iwe6AmxVf7o');
