-- 05_backfill.sql: hand existing rows to the owner and make them a member
--
-- Run ONLY after:
--   * 01_lockdown.sql and 02_members.sql are applied (checked below), and
--   * the owner's auth user exists (Authentication > Users > Add user), and
--   * the auth build is live.
--
-- Why after the deploy: this file sets user_id NOT NULL. A build that still
-- uses the service-role key does not send user_id, so its inserts would fail
-- (loudly, with a 500) between this file and the deploy.
--
-- Replace <OWNER_EMAIL> below, then run the whole file. It aborts if the email
-- is not found (so it can never write NULLs) and it is safe to re-run.

begin;

do $$
declare
  owner_email constant text := '<OWNER_EMAIL>';
  owner_id uuid;
begin
  if to_regclass('gym.members') is null then
    raise exception '05_backfill.sql: gym.members is missing. Run 02_members.sql first.';
  end if;

  if (select count(*) from information_schema.columns
      where table_schema = 'gym' and column_name = 'user_id'
        and table_name in ('routines', 'routine_items',
                           'workout_sessions', 'workout_sets')) <> 4 then
    raise exception '05_backfill.sql: user_id columns missing. Run 01_lockdown.sql first.';
  end if;

  select id into owner_id from auth.users where email = owner_email;
  if owner_id is null then
    raise exception 'No auth user with email %. Replace <OWNER_EMAIL> and create the account first.', owner_email;
  end if;

  -- Membership: without this row the owner signs in and sees nothing.
  insert into gym.members (user_id) values (owner_id)
  on conflict (user_id) do nothing;

  update gym.routines         set user_id = owner_id where user_id is null;
  update gym.routine_items    set user_id = owner_id where user_id is null;
  update gym.workout_sessions set user_id = owner_id where user_id is null;
  update gym.workout_sets     set user_id = owner_id where user_id is null;
end
$$;

alter table gym.routines         alter column user_id set not null;
alter table gym.routine_items    alter column user_id set not null;
alter table gym.workout_sessions alter column user_id set not null;
alter table gym.workout_sets     alter column user_id set not null;

commit;

-- Sanity check: expect zero everywhere, and members >= 1.
select 'routines' as t, count(*) from gym.routines where user_id is null
union all select 'routine_items', count(*) from gym.routine_items where user_id is null
union all select 'workout_sessions', count(*) from gym.workout_sessions where user_id is null
union all select 'workout_sets', count(*) from gym.workout_sets where user_id is null
union all select 'members', count(*) from gym.members;
