import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  try {
    const { data: sessions, error } = await supabase
      .from("workout_sessions")
      .select(
        `
        *,
        routine:routines (*),
        workout_sets (*)
      `
      )
      .eq("status", "completed")
      .order("ended_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error fetching workout history:", error);
      return NextResponse.json(
        { error: "Failed to fetch workout history" },
        { status: 500 }
      );
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch routine items with machines for each session
    const routineIds = [...new Set(sessions.map((s) => s.routine_id))];
    const { data: routineItems, error: itemsError } = await supabase
      .from("routine_items")
      .select(
        `
        *,
        machine:machines (*)
      `
      )
      .in("routine_id", routineIds)
      .order("position");

    if (itemsError) {
      console.error("Error fetching routine items:", itemsError);
      return NextResponse.json(
        { error: "Failed to fetch routine items" },
        { status: 500 }
      );
    }

    // Build the response with calculated fields
    const result = sessions.map((session) => {
      const sessionItems = routineItems?.filter(
        (item) => item.routine_id === session.routine_id
      ) || [];

      const totalWeight = session.workout_sets?.reduce(
        (sum: number, set: { weight: number }) => sum + set.weight,
        0
      ) || 0;

      const startedAt = new Date(session.started_at);
      const endedAt = session.ended_at ? new Date(session.ended_at) : new Date();
      const durationMinutes = Math.round(
        (endedAt.getTime() - startedAt.getTime()) / 60000
      );

      return {
        ...session,
        routine_items: sessionItems,
        duration_minutes: durationMinutes,
        total_weight: totalWeight,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in workout history API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
