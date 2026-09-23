import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  try {
    const { data, error } = await supabase
      .from("workout_sessions")
      .select(
        `
        *,
        routine:routines (*)
      `
      )
      .eq("status", "completed")
      .order("ended_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No completed workouts found
        return NextResponse.json(null);
      }
      console.error("Error fetching latest workout:", error);
      return NextResponse.json(
        { error: "Failed to fetch latest workout" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in latest workout API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
