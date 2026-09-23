import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";

// POST only. Starting a workout writes a row, so it must not be reachable by
// GET: SameSite=Lax cookies ride along on cross-site top-level GET navigations,
// which would let any link start a workout for a signed-in visitor.
export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  try {
    const body = await request.json();
    const { routineId } = body;

    if (!routineId) {
      return NextResponse.json(
        { error: "Routine ID is required" },
        { status: 400 }
      );
    }

    // Check if routine exists
    const { data: routine, error: routineError } = await supabase
      .from("routines")
      .select("id")
      .eq("id", routineId)
      .single();

    if (routineError || !routine) {
      return NextResponse.json(
        { error: "Routine not found" },
        { status: 404 }
      );
    }

    // Create a new workout session
    const { data: session, error: sessionError } = await supabase
      .from("workout_sessions")
      .insert({
        routine_id: routineId,
        status: "in_progress",
      })
      .select()
      .single();

    if (sessionError || !session) {
      console.error("Error creating workout session:", sessionError);
      return NextResponse.json(
        { error: "Failed to start workout" },
        { status: 500 }
      );
    }

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error("Error starting workout:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
