import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  try {
    const { id: routineId } = await params;
    const body = await request.json();
    const { machine_id, sets, reps, rest_seconds, default_weight } = body;

    if (!machine_id) {
      return NextResponse.json(
        { error: "Machine ID is required" },
        { status: 400 }
      );
    }

    // Get the next position
    const { data: existingItems } = await supabase
      .from("routine_items")
      .select("position")
      .eq("routine_id", routineId)
      .order("position", { ascending: false })
      .limit(1);

    const nextPosition =
      existingItems && existingItems.length > 0
        ? existingItems[0].position + 1
        : 0;

    // Insert the new item
    const { data, error } = await supabase
      .from("routine_items")
      .insert({
        routine_id: routineId,
        machine_id,
        position: nextPosition,
        sets: sets || 3,
        reps: reps || 10,
        rest_seconds: rest_seconds || 60,
        default_weight: default_weight || null,
      })
      .select(
        `
        *,
        machine:machines (*)
      `
      )
      .single();

    if (error) {
      console.error("Error adding routine item:", error);
      return NextResponse.json(
        { error: "Failed to add routine item" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error in routine items API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
