import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  try {
    const { sessionId } = await params;

    const { data, error } = await supabase
      .from("workout_sessions")
      .select(
        `
        *,
        routine:routines (
          *,
          routine_items (
            *,
            machine:machines (*)
          )
        ),
        workout_sets (*)
      `
      )
      .eq("id", sessionId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Workout session not found" },
          { status: 404 }
        );
      }
      console.error("Error fetching workout session:", error);
      return NextResponse.json(
        { error: "Failed to fetch workout session" },
        { status: 500 }
      );
    }

    // Sort routine_items by position
    if (data.routine?.routine_items) {
      data.routine.routine_items.sort(
        (a: { position: number }, b: { position: number }) =>
          a.position - b.position
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in workout session API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
