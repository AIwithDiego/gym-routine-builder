import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { DB_SCHEMA, getSupabaseEnv } from "./env";

// Server client for route handlers and server components. It uses the anon
// key plus the caller's session cookie, so every query runs as that user and
// Postgres RLS decides what they can see. There is no service-role client in
// the app.
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
    db: { schema: DB_SCHEMA },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a server component, where cookies are read-only.
          // The proxy refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}

export type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

type AuthResult =
  | { ok: true; supabase: ServerSupabaseClient; userId: string }
  | { ok: false; response: NextResponse };

// Route handler guard: resolves the signed-in user or returns a 401 response.
// getClaims() verifies the JWT signature, so a forged cookie is rejected here
// as well as by RLS in the database.
export async function requireUser(): Promise<AuthResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || !userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true, supabase, userId };
}
