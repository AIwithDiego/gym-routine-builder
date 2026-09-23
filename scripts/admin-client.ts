/**
 * Service-role Supabase client for LOCAL maintenance scripts only.
 *
 * - Never import this from src/. The app has no service-role access; every
 *   request runs as the signed-in user under RLS.
 * - The service-role key bypasses RLS, so rows written here must set user_id
 *   explicitly (auth.uid() is null for the service role). Scripts read the
 *   owner from SEED_USER_ID in .env.local.
 *
 * Env (.env.local): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SEED_USER_ID
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv(): Record<string, string> {
  const envPath = resolve(import.meta.dirname || __dirname, "..", ".env.local");
  const env: Record<string, string> = {};
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^([^#=]+)=(.+)$/);
    if (match) env[match[1].trim()] = match[2].trim();
  }
  return env;
}

const env = loadEnv();

function required(name: string): string {
  const value = env[name] ?? process.env[name];
  if (!value) throw new Error(`Missing ${name} in .env.local`);
  return value;
}

export const supabase = createClient(
  required("SUPABASE_URL"),
  required("SUPABASE_SERVICE_ROLE_KEY"),
  {
    db: { schema: "gym" },
    auth: { autoRefreshToken: false, persistSession: false },
  }
);

/** The auth.users id that seeded rows belong to. */
export function seedUserId(): string {
  return required("SEED_USER_ID");
}
