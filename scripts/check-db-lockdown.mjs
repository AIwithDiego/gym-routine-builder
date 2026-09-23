#!/usr/bin/env node
// Build-time guard for the deploy order (runs as `prebuild`).
//
// This build ships the Supabase URL and publishable key to the browser (the
// sign-in form needs them). That is only safe once the database is locked
// down, so on Vercel the build refuses to continue unless, as the anon role:
//
//   1. reading gym.machines is denied            (01_lockdown.sql applied)
//   2. gym.is_member() exists but is not callable (02_members.sql applied)
//
// Both probes send only the public key, read no rows and change nothing.
//
// Runs when VERCEL=1 (every Vercel build, previews included) or
// CHECK_DB_LOCKDOWN=1 (to try it locally). Local builds skip it.
// Emergency override: SKIP_DB_LOCKDOWN_CHECK=1 (logged loudly; don't).

const SCHEMA = "gym";
const TIMEOUT_MS = 10_000;

const shouldRun =
  process.env.VERCEL === "1" || process.env.CHECK_DB_LOCKDOWN === "1";

if (process.env.SKIP_DB_LOCKDOWN_CHECK === "1") {
  console.warn(
    "[db-lockdown] SKIPPED via SKIP_DB_LOCKDOWN_CHECK=1. The database was NOT verified."
  );
  process.exit(0);
}

if (!shouldRun) {
  console.log("[db-lockdown] local build: skipped (runs on Vercel or with CHECK_DB_LOCKDOWN=1)");
  process.exit(0);
}

function fail(message) {
  console.error(`\n[db-lockdown] BUILD BLOCKED: ${message}\n`);
  console.error("See docs/launch-checklist.md for the order: SQL first, then deploy.\n");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  fail("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set for this environment.");
}

const base = url.replace(/\/+$/, "");
const headers = { apikey: key, Accept: "application/json" };
// Legacy JWT anon keys also go in Authorization; new publishable keys must not.
if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;

async function probe(path, init) {
  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      headers: { ...headers, ...init.headers },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = await res.text();
    let code = null;
    try {
      code = JSON.parse(body)?.code ?? null;
    } catch {
      // non-JSON body
    }
    return { status: res.status, code };
  } catch (error) {
    fail(`could not reach Supabase at ${base} (${error.message}).`);
  }
}

const isDenied = (r) => r.status === 401 || r.status === 403;

// 1. anon must not be able to read the schema. limit=0 so no rows come back
//    even if it is still open.
const table = await probe("/rest/v1/machines?select=id&limit=0", {
  method: "GET",
  headers: { "Accept-Profile": SCHEMA },
});
if (table.status === 200) {
  fail(`anon can read ${SCHEMA}.machines. Run supabase/launch/01_lockdown.sql before deploying.`);
}
if (table.code === "PGRST106" || table.status === 406) {
  fail(`the "${SCHEMA}" schema is not exposed (Project Settings > API > Exposed schemas).`);
}
if (!isDenied(table)) {
  fail(`unexpected response probing ${SCHEMA}.machines as anon: HTTP ${table.status} ${table.code ?? ""}`.trim());
}

// 2. The membership gate must exist. PostgREST answers 404 (PGRST202) for a
//    function it does not know and 401/403 for one anon may not execute.
const gate = await probe("/rest/v1/rpc/is_member", {
  method: "POST",
  headers: { "Content-Profile": SCHEMA, "Content-Type": "application/json" },
  body: "{}",
});
if (gate.status === 404 || gate.code === "PGRST202") {
  fail(`${SCHEMA}.is_member() not found. Run supabase/launch/02_members.sql before deploying.`);
}
if (gate.status === 200) {
  fail(`anon can execute ${SCHEMA}.is_member(). Re-run supabase/launch/02_members.sql.`);
}
if (!isDenied(gate)) {
  fail(`unexpected response probing ${SCHEMA}.is_member() as anon: HTTP ${gate.status} ${gate.code ?? ""}`.trim());
}

console.log(
  `[db-lockdown] OK: anon denied on ${SCHEMA} (HTTP ${table.status}), membership gate present (HTTP ${gate.status}).`
);
