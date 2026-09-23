import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";

function isWeekday(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 6
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const raw = body?.assigned_weekdays;

    if (!Array.isArray(raw) || !raw.every(isWeekday)) {
      return NextResponse.json(
        { error: "assigned_weekdays must be an array of integers 0-6" },
        { status: 400 }
      );
    }

    const days = [...new Set(raw)].sort((a, b) => a - b);

    const { data, error } = await supabase.rpc("routines_set_weekdays", {
      p_routine_id: id,
      p_days: days,
    });

    if (error) {
      console.error("Error setting weekdays:", error);
      return NextResponse.json(
        { error: "Failed to update weekdays" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in weekdays API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
