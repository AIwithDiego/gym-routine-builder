/**
 * Seed script: creates 2 routines and 12 completed workout sessions
 * over the past 3 weeks with progressive overload for a 70kg / 175cm male.
 *
 * Run: npx tsx scripts/seed-workouts.ts
 */

import { supabase, seedUserId } from "./admin-client";

const userId = seedUserId();

// ── helpers ─────────────────────────────────────────────────────────
function daysAgo(n: number, durationMin: number = 45) {
  const start = new Date();
  start.setDate(start.getDate() - n);
  start.setHours(8, 0, 0, 0);
  const end = new Date(start.getTime() + durationMin * 60_000);
  return { started_at: start.toISOString(), ended_at: end.toISOString() };
}

async function getMachineByName(name: string) {
  const { data, error } = await supabase
    .from("machines")
    .select("id")
    .eq("name", name)
    .single();
  if (error) throw new Error(`Machine "${name}" not found: ${error.message}`);
  return data.id as string;
}

// ── main ────────────────────────────────────────────────────────────
async function main() {
  console.log("Fetching machine IDs...");

  // Machines for upper body routine
  const chestPress = await getMachineByName("Plate Loaded Incline Chest Press");
  const seatedRow = await getMachineByName("Plate Loaded Seated Row");
  const shoulderPress = await getMachineByName("Shoulder Press Machine");
  const lateralRaise = await getMachineByName("Lateral Raise Machine");
  const tricepPushdown = await getMachineByName("Tricep Pushdown");
  const bicepCurl = await getMachineByName("Cable Machine - Bicep Curl");

  // Machines for lower body routine
  const legPress = await getMachineByName("Plate Loaded Leg Press");
  const hackSquat = await getMachineByName("Plate Loaded Hack Squat");
  const legExtension = await getMachineByName("Plate Loaded Leg Extension");
  const legCurl = await getMachineByName("Iso Lying Leg Curl");
  const calfRaise = await getMachineByName("Calf Raise");
  const backExtension = await getMachineByName(
    "Reverse Hyper Extension & Back Extension"
  );

  // ── Create routines ───────────────────────────────────────────────
  console.log("Creating routines...");

  const { data: upperRoutine } = await supabase
    .from("routines")
    .insert({ user_id: userId, name: "Upper Body", notes: "Push/pull focus" })
    .select()
    .single();

  const { data: lowerRoutine } = await supabase
    .from("routines")
    .insert({ user_id: userId, name: "Lower Body", notes: "Quad & hamstring focus" })
    .select()
    .single();

  if (!upperRoutine || !lowerRoutine) throw new Error("Failed to create routines");

  // ── Create routine items ──────────────────────────────────────────
  console.log("Creating routine items...");

  const upperItems = [
    { machine_id: chestPress, sets: 3, reps: 10, rest_seconds: 90, default_weight: 40, position: 0 },
    { machine_id: seatedRow, sets: 3, reps: 10, rest_seconds: 90, default_weight: 45, position: 1 },
    { machine_id: shoulderPress, sets: 3, reps: 10, rest_seconds: 60, default_weight: 25, position: 2 },
    { machine_id: lateralRaise, sets: 3, reps: 12, rest_seconds: 45, default_weight: 15, position: 3 },
    { machine_id: tricepPushdown, sets: 3, reps: 12, rest_seconds: 45, default_weight: 20, position: 4 },
    { machine_id: bicepCurl, sets: 3, reps: 12, rest_seconds: 45, default_weight: 15, position: 5 },
  ];

  const lowerItems = [
    { machine_id: legPress, sets: 4, reps: 10, rest_seconds: 120, default_weight: 100, position: 0 },
    { machine_id: hackSquat, sets: 3, reps: 10, rest_seconds: 90, default_weight: 60, position: 1 },
    { machine_id: legExtension, sets: 3, reps: 12, rest_seconds: 60, default_weight: 35, position: 2 },
    { machine_id: legCurl, sets: 3, reps: 12, rest_seconds: 60, default_weight: 30, position: 3 },
    { machine_id: calfRaise, sets: 3, reps: 15, rest_seconds: 45, default_weight: 50, position: 4 },
    { machine_id: backExtension, sets: 3, reps: 12, rest_seconds: 60, default_weight: 0, position: 5 },
  ];

  const { data: upperItemsDb } = await supabase
    .from("routine_items")
    .insert(upperItems.map((i) => ({ ...i, user_id: userId, routine_id: upperRoutine.id })))
    .select();

  const { data: lowerItemsDb } = await supabase
    .from("routine_items")
    .insert(lowerItems.map((i) => ({ ...i, user_id: userId, routine_id: lowerRoutine.id })))
    .select();

  if (!upperItemsDb || !lowerItemsDb)
    throw new Error("Failed to create routine items");

  // ── Create workout sessions ───────────────────────────────────────
  // Schedule: Upper/Lower alternating, ~4x/week over 3 weeks
  // Shows progressive overload + a current 5-day streak
  console.log("Creating workout sessions...");

  interface SessionPlan {
    routineId: string;
    items: typeof upperItemsDb;
    weights: number[][]; // per-item weights for each set
    day: number; // days ago
    duration: number; // minutes
  }

  // Weight progressions (per item, per set)
  // Upper body progression over 6 sessions
  const upperWeightProgression = [
    // Session 1 (21 days ago)
    [[40, 40, 37.5], [45, 45, 42.5], [25, 25, 22.5], [15, 15, 12.5], [20, 20, 17.5], [15, 15, 12.5]],
    // Session 2 (17 days ago)
    [[40, 42.5, 40], [45, 47.5, 45], [25, 27.5, 25], [15, 15, 15], [20, 22.5, 20], [15, 17.5, 15]],
    // Session 3 (14 days ago)
    [[42.5, 42.5, 40], [47.5, 47.5, 45], [27.5, 27.5, 25], [17.5, 15, 15], [22.5, 22.5, 20], [17.5, 17.5, 15]],
    // Session 4 (10 days ago)
    [[42.5, 45, 42.5], [47.5, 50, 47.5], [27.5, 30, 27.5], [17.5, 17.5, 15], [22.5, 25, 22.5], [17.5, 17.5, 17.5]],
    // Session 5 (5 days ago)
    [[45, 45, 42.5], [50, 50, 47.5], [30, 30, 27.5], [17.5, 17.5, 17.5], [25, 25, 22.5], [17.5, 20, 17.5]],
    // Session 6 (2 days ago)
    [[45, 47.5, 45], [50, 52.5, 50], [30, 32.5, 30], [20, 17.5, 17.5], [25, 25, 25], [20, 20, 17.5]],
  ];

  // Lower body progression over 6 sessions
  const lowerWeightProgression = [
    // Session 1 (19 days ago)
    [[100, 100, 100, 95], [60, 60, 55], [35, 35, 32.5], [30, 30, 27.5], [50, 50, 45], [0, 0, 0]],
    // Session 2 (16 days ago)
    [[100, 105, 105, 100], [60, 65, 60], [35, 37.5, 35], [30, 32.5, 30], [50, 55, 50], [0, 0, 0]],
    // Session 3 (12 days ago)
    [[105, 105, 110, 105], [65, 65, 60], [37.5, 37.5, 35], [32.5, 32.5, 30], [55, 55, 50], [0, 0, 0]],
    // Session 4 (8 days ago)
    [[110, 110, 110, 105], [65, 70, 65], [37.5, 40, 37.5], [32.5, 35, 32.5], [55, 60, 55], [0, 0, 0]],
    // Session 5 (4 days ago)
    [[110, 115, 110, 110], [70, 70, 65], [40, 40, 37.5], [35, 35, 32.5], [60, 60, 55], [0, 0, 0]],
    // Session 6 (1 day ago)
    [[115, 115, 115, 110], [70, 72.5, 70], [40, 42.5, 40], [35, 37.5, 35], [60, 65, 60], [0, 0, 0]],
  ];

  // Days ago for each session (gives a 5-day streak ending today-1)
  const upperDays = [21, 17, 14, 10, 5, 2];
  const lowerDays = [19, 16, 12, 8, 4, 1];
  const upperDurations = [42, 40, 44, 38, 41, 43];
  const lowerDurations = [48, 50, 46, 52, 47, 49];

  const sessionPlans: SessionPlan[] = [];

  for (let i = 0; i < 6; i++) {
    sessionPlans.push({
      routineId: upperRoutine.id,
      items: upperItemsDb,
      weights: upperWeightProgression[i],
      day: upperDays[i],
      duration: upperDurations[i],
    });
    sessionPlans.push({
      routineId: lowerRoutine.id,
      items: lowerItemsDb,
      weights: lowerWeightProgression[i],
      day: lowerDays[i],
      duration: lowerDurations[i],
    });
  }

  for (const plan of sessionPlans) {
    const times = daysAgo(plan.day, plan.duration);

    const { data: session, error: sessionError } = await supabase
      .from("workout_sessions")
      .insert({
        user_id: userId,
        routine_id: plan.routineId,
        started_at: times.started_at,
        ended_at: times.ended_at,
        status: "completed",
      })
      .select()
      .single();

    if (sessionError || !session)
      throw new Error(`Failed to create session: ${sessionError?.message}`);

    // Create sets for each routine item
    const setsToInsert: {
      user_id: string;
      session_id: string;
      routine_item_id: string;
      set_number: number;
      target_reps: number;
      actual_reps: number;
      weight: number;
      completed_at: string;
    }[] = [];

    for (let itemIdx = 0; itemIdx < plan.items.length; itemIdx++) {
      const item = plan.items[itemIdx];
      const weights = plan.weights[itemIdx];

      for (let setNum = 0; setNum < weights.length; setNum++) {
        // Slight variation in actual reps (sometimes 1 less on heavy sets)
        const targetReps = item.reps;
        const actualReps =
          weights[setNum] > (item.default_weight || 0) * 1.1
            ? Math.max(targetReps - 1, targetReps - 2)
            : targetReps;

        const completedAt = new Date(
          new Date(times.started_at).getTime() +
            (itemIdx * 6 + setNum * 2 + 1) * 60_000
        ).toISOString();

        setsToInsert.push({
          user_id: userId,
          session_id: session.id,
          routine_item_id: item.id,
          set_number: setNum + 1,
          target_reps: targetReps,
          actual_reps: actualReps,
          weight: weights[setNum],
          completed_at: completedAt,
        });
      }
    }

    const { error: setsError } = await supabase
      .from("workout_sets")
      .insert(setsToInsert);

    if (setsError)
      throw new Error(`Failed to create sets: ${setsError.message}`);
  }

  console.log("✓ Seeded 12 workout sessions (6 upper, 6 lower) over 3 weeks");
  console.log("  - Progressive overload on all machines");
  console.log("  - 5-day streak (days 5, 4, 2, 1 ago)");
  console.log("  - ~4 workouts/week pattern");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
