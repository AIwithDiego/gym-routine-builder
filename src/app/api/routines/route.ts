import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  try {
    const { data, error } = await supabase
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
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching routines:", error);
      return NextResponse.json(
        { error: "Failed to fetch routines" },
        { status: 500 }
      );
    }

    // Sort routine_items by position
    const sortedData = data.map((routine) => ({
      ...routine,
      routine_items: routine.routine_items?.sort(
        (a: { position: number }, b: { position: number }) =>
          a.position - b.position
      ),
    }));

    return NextResponse.json(sortedData);
  } catch (error) {
    console.error("Error in routines API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  try {
    const body = await request.json();
    const { name, notes } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("routines")
      .insert({
        name: name.trim(),
        notes: notes?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating routine:", error);
      return NextResponse.json(
        { error: "Failed to create routine" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error in routines API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
