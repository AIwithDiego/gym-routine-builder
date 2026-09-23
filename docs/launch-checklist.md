# Database setup and launch checklist

How the `gym` schema is created, and the order used to move an existing, pre-auth database to the locked-down model without a window where data is exposed.

## Database files

Everything lives in its own `gym` schema.

- New project: run `supabase/schema.sql`, then follow "Run locally" in the README.
- Existing database from before auth: run the files in `supabase/launch/` in order, as described in the launch checklist below.

| File | What it does | When |
|---|---|---|
| `01_lockdown.sql` | `user_id` ownership, RLS and per-owner policies, anon removed from the schema | First, before any deploy of the auth build |
| `02_members.sql` | `gym.members`, `gym.is_member()`, restrictive members-only policy on every table | Right after 01 |
| `03_fk_set_null.sql` | `workout_sets.routine_item_id` becomes `ON DELETE SET NULL`, so deleting a routine keeps its logged sets | Any time after 01 |
| `04_rpcs_at_deploy.sql` | The two RPCs rewritten as `SECURITY INVOKER` with `search_path = ''` | At deploy (harmless on either side of it) |
| `05_backfill.sql` | Gives existing rows to the owner, adds the owner to `gym.members`, sets `user_id NOT NULL` | After the auth build is live and the owner account exists |

Every file is idempotent. Each one checks that the files it depends on have run and stops with an error that names the missing step, so running them out of order fails loudly instead of half-applying. Re-running `01_lockdown.sql` keeps the members-only policies.

## Launch checklist

Deploy order is enforced: `npm run build` runs `scripts/check-db-lockdown.mjs` first, and on Vercel (production and previews) the build fails unless, as the anon role, reading `gym` is denied and `gym.is_member()` exists. The probe uses only the public key, reads no rows and changes nothing. Locally it is skipped; `CHECK_DB_LOCKDOWN=1 npm run build` runs it.

1. **Lock down the database.** In the SQL editor, run `supabase/launch/01_lockdown.sql`. Check that anon is out (expect `401`):

   ```bash
   curl -s -o /dev/null -w '%{http_code}\n' \
     "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/machines?select=id&limit=0" \
     -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Accept-Profile: gym"
   ```

2. **Turn on the members gate.** Run `02_members.sql`. Check: `select tablename, permissive from pg_policies where schemaname = 'gym' and policyname like '%members_only';` returns the five tables, all `RESTRICTIVE`.
3. **Fix the history foreign key.** Run `03_fk_set_null.sql`.
4. **Create the owner account** under Authentication > Users > Add user (email and password).
5. **Set the host env** for Production and Preview: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Do not push or merge the auth build before steps 1 and 2; the build guard will refuse it anyway.
6. **Deploy.** Run `04_rpcs_at_deploy.sql`, then merge and let the host build. The build log should show `[db-lockdown] OK`.
7. **Backfill.** Once the new build is live, put the owner's email in `05_backfill.sql` and run it. The final query should show `0` for every table and `1` or more members.
8. **Verify.**
   - Signed out: `curl -s -o /dev/null -w '%{http_code}' https://<app>/api/routines` returns `401`; `/` redirects to `/login`.
   - Signed in as the owner: routines, history and the machine list load.
   - A signed-in account that is not in `gym.members` sees no data and cannot create any.
   - No table in `gym` has RLS off (expect no rows): `select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where nspname = 'gym' and relkind = 'r' and not relrowsecurity;`
   - `curl -sI https://<app>/login` shows the CSP, HSTS and other headers.
9. **Retire the old server secrets.** Delete `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` from the host env in every environment, then rotate the service-role (secret) key in Supabase, because the previous build loaded it at runtime.

Adding another person later: create their account, then `insert into gym.members (user_id) select id from auth.users where email = '<EMAIL>';`. Removing access: delete that row.

