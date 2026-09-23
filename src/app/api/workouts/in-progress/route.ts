import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";

// Sessions still marked in_progress this long after start are treated as
// orphaned (tab closed, app crashed, gym session interrupted) and auto-
// abandoned. 12h covers a realistic morning + afternoon split day; anything
// longer is a stale session, not a real workout.
const STALE_SESSION_HOURS = 12;

// POST, not GET: the handler writes (it abandons stale sessions before
// reading), and state-changing requests must not ride on cross-site GET
// navigations, which carry SameSite=Lax cookies.
export async function POST() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  try {
    const cutoff = new Date(
      Date.now() - STALE_SESSION_HOURS * 60 * 60 * 1000
    ).toISOString();

    // Reap stale sessions first so they stop surfacing.
    const { error: reapError } = await supabase
      .from("workout_sessions")
      .update({ status: "abandoned", ended_at: new Date().toISOString() })
      .eq("status", "in_progress")
      .lt("started_at", cutoff);

    if (reapError) {
      console.error("Error reaping stale sessions:", reapError);
      // Don't fail the request; surface what's fresh even if reap failed.
    }

    const { data, error } = await supabase
      .from("workout_sessions")
      .select(
        `
        *,
        routine:routines (*),
        workout_sets (*)
      `
      )
      .eq("status", "in_progress")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching in-progress workout:", error);
      return NextResponse.json(
        { error: "Failed to fetch in-progress workout" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in in-progress workout API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
