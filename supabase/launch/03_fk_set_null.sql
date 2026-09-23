-- 03_fk_set_null.sql: workout_sets.routine_item_id ON DELETE SET NULL
--
-- Bug: the foreign key had no ON DELETE action, so deleting a routine that
-- has logged sets failed (the routine's items cascade-delete, and the sets
-- still pointed at them). With SET NULL the history survives: the sets and
-- their session stay, they just lose the link to the deleted routine item.
--
-- Independent of every other launch file and of the deploy; safe to run any
-- time and safe to re-run. It drops EVERY foreign key from
-- workout_sets.routine_item_id to routine_items, whatever its name, so a
-- differently named legacy constraint cannot keep blocking deletes.

begin;

do $$
declare
  con record;
begin
  for con in
    select c.conname
    from pg_constraint c
    join pg_attribute a
      on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.contype = 'f'
      and c.conrelid = 'gym.workout_sets'::regclass
      and c.confrelid = 'gym.routine_items'::regclass
      and a.attname = 'routine_item_id'
  loop
    execute format('alter table gym.workout_sets drop constraint %I', con.conname);
  end loop;
end
$$;

alter table gym.workout_sets
  add constraint workout_sets_routine_item_id_fkey
  foreign key (routine_item_id) references gym.routine_items(id)
  on delete set null;

commit;

-- Verify (expect exactly one row, confdeltype = 'n' for SET NULL):
--   select conname, confdeltype from pg_constraint
--   where conrelid = 'gym.workout_sets'::regclass
--     and confrelid = 'gym.routine_items'::regclass;
