import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { routine_item_id, set_number, target_reps, actual_reps, weight } =
      body;

    if (!routine_item_id || !set_number || (weight === undefined || weight === null)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if session exists and is in progress
    const { data: session } = await supabase
      .from("workout_sessions")
      .select("status")
      .eq("id", sessionId)
      .single();

    if (!session || session.status !== "in_progress") {
      return NextResponse.json(
        { error: "Workout session not found or not in progress" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("workout_sets")
      .insert({
        session_id: sessionId,
        routine_item_id,
        set_number,
        target_reps: target_reps || 10,
        actual_reps: actual_reps || null,
        weight,
      })
      .select()
      .single();

    if (error) {
      console.error("Error recording workout set:", error);
      return NextResponse.json(
        { error: "Failed to record workout set" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error in workout set API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
