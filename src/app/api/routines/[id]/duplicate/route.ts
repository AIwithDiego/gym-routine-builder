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
    const { id } = await params;

    // Fetch the original routine with items
    const { data: original, error: fetchError } = await supabase
      .from("routines")
      .select(
        `
        *,
        routine_items (*)
      `
      )
      .eq("id", id)
      .single();

    if (fetchError || !original) {
      return NextResponse.json(
        { error: "Routine not found" },
        { status: 404 }
      );
    }

    // Create the duplicate routine
    const { data: newRoutine, error: createError } = await supabase
      .from("routines")
      .insert({
        name: `${original.name} (Copy)`,
        notes: original.notes,
      })
      .select()
      .single();

    if (createError || !newRoutine) {
      console.error("Error creating duplicate routine:", createError);
      return NextResponse.json(
        { error: "Failed to duplicate routine" },
        { status: 500 }
      );
    }

    // Duplicate the routine items if any exist
    if (original.routine_items && original.routine_items.length > 0) {
      const newItems = original.routine_items.map(
        (item: {
          machine_id: string;
          position: number;
          sets: number;
          reps: number;
          rest_seconds: number;
          default_weight: number | null;
        }) => ({
          routine_id: newRoutine.id,
          machine_id: item.machine_id,
          position: item.position,
          sets: item.sets,
          reps: item.reps,
          rest_seconds: item.rest_seconds,
          default_weight: item.default_weight,
        })
      );

      const { error: itemsError } = await supabase
        .from("routine_items")
        .insert(newItems);

      if (itemsError) {
        console.error("Error duplicating routine items:", itemsError);
        // Clean up the created routine
        await supabase.from("routines").delete().eq("id", newRoutine.id);
        return NextResponse.json(
          { error: "Failed to duplicate routine items" },
          { status: 500 }
        );
      }
    }

    // Fetch the complete new routine with items
    const { data: completeRoutine } = await supabase
      .from("routines")
      .select(
        `
        *,
        routine_items (
          *,
          machine:machines (*)
        )
      `
      )
      .eq("id", newRoutine.id)
      .single();

    return NextResponse.json(completeRoutine, { status: 201 });
  } catch (error) {
    console.error("Error in duplicate API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
