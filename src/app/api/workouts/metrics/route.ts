import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  try {
    // Fetch all completed sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from("workout_sessions")
      .select("id, routine_id, started_at, ended_at, status")
      .eq("status", "completed")
      .order("ended_at", { ascending: false });

    if (sessionsError) {
      console.error("Error fetching sessions:", sessionsError);
      return NextResponse.json(
        { error: "Failed to fetch sessions" },
        { status: 500 }
      );
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({
        total_workouts: 0,
        total_volume: 0,
        avg_duration_minutes: 0,
        total_duration_minutes: 0,
        workouts_this_week: 0,
        current_streak: 0,
        machine_progress: [],
      });
    }

    // Fetch all workout sets for completed sessions
    const sessionIds = sessions.map((s) => s.id);
    const { data: sets, error: setsError } = await supabase
      .from("workout_sets")
      .select("id, session_id, routine_item_id, weight")
      .in("session_id", sessionIds);

    if (setsError) {
      console.error("Error fetching sets:", setsError);
      return NextResponse.json(
        { error: "Failed to fetch sets" },
        { status: 500 }
      );
    }

    // Fetch routine items with machines
    const routineItemIds = [
      ...new Set((sets || []).map((s) => s.routine_item_id)),
    ];
    const { data: routineItems, error: itemsError } = await supabase
      .from("routine_items")
      .select("id, machine_id, machine:machines (id, name, brand, category)")
      .in("id", routineItemIds);

    if (itemsError) {
      console.error("Error fetching routine items:", itemsError);
      return NextResponse.json(
        { error: "Failed to fetch routine items" },
        { status: 500 }
      );
    }

    // Compute totals
    const totalWorkouts = sessions.length;
    const totalVolume =
      sets?.reduce((sum, set) => sum + (set.weight || 0), 0) || 0;

    const durations = sessions.map((s) => {
      const start = new Date(s.started_at).getTime();
      const end = s.ended_at
        ? new Date(s.ended_at).getTime()
        : new Date().getTime();
      return Math.round((end - start) / 60000);
    });
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const avgDuration = Math.round(totalDuration / totalWorkouts);

    // Workouts this week (Monday start)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - mondayOffset);
    monday.setHours(0, 0, 0, 0);
    const workoutsThisWeek = sessions.filter(
      (s) => s.ended_at && new Date(s.ended_at) >= monday
    ).length;

    // Current streak: consecutive days with workouts from today backward
    const workoutDates = new Set(
      sessions
        .filter((s) => s.ended_at)
        .map((s) => new Date(s.ended_at!).toISOString().split("T")[0])
    );
    let currentStreak = 0;
    const checkDate = new Date(now);
    checkDate.setHours(0, 0, 0, 0);
    // If no workout today, start checking from yesterday
    const todayStr = checkDate.toISOString().split("T")[0];
    if (!workoutDates.has(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    while (workoutDates.has(checkDate.toISOString().split("T")[0])) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Machine progress
    const itemMap = new Map(
      (routineItems || []).map((ri) => [ri.id, ri])
    );

    // Build per-machine set history: { machineId -> { sessionId -> sets[] } }
    const machineSessionSets = new Map<
      string,
      Map<string, { weight: number }[]>
    >();
    for (const set of sets || []) {
      const ri = itemMap.get(set.routine_item_id);
      if (!ri) continue;
      const machineId = ri.machine_id;
      if (!machineSessionSets.has(machineId)) {
        machineSessionSets.set(machineId, new Map());
      }
      const sessionMap = machineSessionSets.get(machineId)!;
      if (!sessionMap.has(set.session_id)) {
        sessionMap.set(set.session_id, []);
      }
      sessionMap.get(set.session_id)!.push({ weight: set.weight });
    }

    // Session order map for determining first/latest
    const sessionOrder = new Map(
      sessions.map((s, i) => [s.id, i])
    );

    const machineProgress = Array.from(machineSessionSets.entries()).map(
      ([machineId, sessionMap]) => {
        const ri = (routineItems || []).find((r) => r.machine_id === machineId);
        const machineData = ri?.machine;
        const machine = Array.isArray(machineData)
          ? (machineData[0] as { id: string; name: string; brand: string | null; category: string } | undefined)
          : (machineData as { id: string; name: string; brand: string | null; category: string } | undefined);

        // Sort session IDs by order (most recent first from query)
        const sortedSessionIds = Array.from(sessionMap.keys()).sort(
          (a, b) => (sessionOrder.get(a) ?? 0) - (sessionOrder.get(b) ?? 0)
        );

        const allWeights = Array.from(sessionMap.values())
          .flat()
          .map((s) => s.weight);
        const firstSessionSets = sessionMap.get(
          sortedSessionIds[sortedSessionIds.length - 1]
        )!;
        const latestSessionSets = sessionMap.get(sortedSessionIds[0])!;

        const firstWeight = Math.max(...firstSessionSets.map((s) => s.weight));
        const latestWeight = Math.max(
          ...latestSessionSets.map((s) => s.weight)
        );
        const maxWeight = Math.max(...allWeights);

        return {
          machine_id: machineId,
          machine_name: machine?.name || "Unknown",
          brand: machine?.brand || null,
          category: machine?.category || "upper",
          sessions_count: sortedSessionIds.length,
          first_weight: firstWeight,
          latest_weight: latestWeight,
          max_weight: maxWeight,
        };
      }
    );

    // Sort by sessions count descending
    machineProgress.sort((a, b) => b.sessions_count - a.sessions_count);

    return NextResponse.json({
      total_workouts: totalWorkouts,
      total_volume: totalVolume,
      avg_duration_minutes: avgDuration,
      total_duration_minutes: totalDuration,
      workouts_this_week: workoutsThisWeek,
      current_streak: currentStreak,
      machine_progress: machineProgress,
    });
  } catch (error) {
    console.error("Error in metrics API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
