import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const { sets, reps, rest_seconds, default_weight } = body;

    const { data, error } = await supabase
      .from("routine_items")
      .update({
        sets: sets || 3,
        reps: reps || 10,
        rest_seconds: rest_seconds || 60,
        default_weight: default_weight || null,
      })
      .eq("id", id)
      .select(
        `
        *,
        machine:machines (*)
      `
      )
      .single();

    if (error) {
      console.error("Error updating routine item:", error);
      return NextResponse.json(
        { error: "Failed to update routine item" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in routine items API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  try {
    const { id } = await params;

    const { error } = await supabase
      .from("routine_items")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting routine item:", error);
      return NextResponse.json(
        { error: "Failed to delete routine item" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in routine items API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
