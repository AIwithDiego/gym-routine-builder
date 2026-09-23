import { createBrowserClient } from "@supabase/ssr";
import { DB_SCHEMA, getSupabaseEnv } from "./env";

// Browser client: anon key + the user's session cookie. Used for sign-in only;
// data access goes through the API routes.
export function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient(url, anonKey, { db: { schema: DB_SCHEMA } });
}
