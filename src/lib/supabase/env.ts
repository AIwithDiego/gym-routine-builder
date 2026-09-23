// Public Supabase config. Both values are safe to ship to the browser:
// the anon/publishable key only grants what RLS allows for the signed-in user.
export function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }
  return { url, anonKey };
}

// The app's tables live in their own `gym` schema.
export const DB_SCHEMA = "gym";
