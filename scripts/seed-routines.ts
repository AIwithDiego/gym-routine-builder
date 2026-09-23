/**
 * Creates 6 routines tailored to Diego's goals:
 *   1. Golf Hips & Core: hip rotation/mobility for the golf swing
 *   2. Shoulders & Delts: grow the shoulders
 *   3. Back Builder: thicker, wider back
 *   4. Arms Day: biceps & triceps
 *   5. Glute Builder: grow the glutes
 *   6. Legs & Posterior Chain: quads + hamstrings support
 *
 * Run: npx tsx scripts/seed-routines.ts
 */

import { supabase, seedUserId } from "./admin-client";

const userId = seedUserId();

async function getMachine(name: string): Promise<string> {
  const { data, error } = await supabase
    .from("machines")
    .select("id")
    .eq("name", name)
    .single();
  if (error) throw new Error(`Machine "${name}" not found: ${error.message}`);
  return data.id;
}

interface RoutinePlan {
  name: string;
  notes: string;
  items: {
    machineName: string;
    sets: number;
    reps: number;
    rest_seconds: number;
    default_weight: number;
  }[];
}

async function main() {
  console.log("Fetching machine IDs...");

  const routines: RoutinePlan[] = [
    {
      name: "Golf Hips & Core",
      notes: "Hip rotation and mobility for the golf swing. Light weight, controlled tempo.",
      items: [
        { machineName: "Plate Loaded Hip Extension", sets: 3, reps: 12, rest_seconds: 60, default_weight: 20 },
        { machineName: "Squat Lunge Drive", sets: 3, reps: 10, rest_seconds: 60, default_weight: 20 },
        { machineName: "Reverse Hyper Extension & Back Extension", sets: 3, reps: 15, rest_seconds: 45, default_weight: 0 },
        { machineName: "Glutes and Hamstring Developer", sets: 3, reps: 12, rest_seconds: 60, default_weight: 0 },
        { machineName: "Rowing Machine", sets: 1, reps: 1, rest_seconds: 0, default_weight: 0 },
      ],
    },
    {
      name: "Shoulder Builder",
      notes: "Build bigger, rounder delts. All three heads.",
      items: [
        { machineName: "Shoulder Press Machine", sets: 4, reps: 10, rest_seconds: 90, default_weight: 25 },
        { machineName: "Lateral Raise Machine", sets: 4, reps: 12, rest_seconds: 45, default_weight: 15 },
        { machineName: "Shoulder Cable Press", sets: 3, reps: 12, rest_seconds: 60, default_weight: 15 },
        { machineName: "Cable Machine - Chest Fly", sets: 3, reps: 12, rest_seconds: 60, default_weight: 10 },
        { machineName: "Standing Press Machine", sets: 3, reps: 10, rest_seconds: 60, default_weight: 20 },
      ],
    },
    {
      name: "Back Builder",
      notes: "Rows for thickness, pulls for width. Grow that back.",
      items: [
        { machineName: "Plate Loaded T-Bar Row", sets: 4, reps: 10, rest_seconds: 90, default_weight: 30 },
        { machineName: "Plate Loaded Seated Row", sets: 4, reps: 10, rest_seconds: 90, default_weight: 45 },
        { machineName: "Back Press", sets: 3, reps: 12, rest_seconds: 60, default_weight: 30 },
        { machineName: "Ski Erg", sets: 1, reps: 1, rest_seconds: 0, default_weight: 0 },
      ],
    },
    {
      name: "Arms Day",
      notes: "Biceps and triceps. Chase the pump.",
      items: [
        { machineName: "Cable Machine - Bicep Curl", sets: 4, reps: 12, rest_seconds: 45, default_weight: 15 },
        { machineName: "Tricep Pushdown", sets: 4, reps: 12, rest_seconds: 45, default_weight: 20 },
        { machineName: "Smith Machine", sets: 3, reps: 10, rest_seconds: 60, default_weight: 20 },
        { machineName: "Chest Cable Press", sets: 3, reps: 12, rest_seconds: 60, default_weight: 15 },
      ],
    },
    {
      name: "Glute Builder",
      notes: "Posterior chain focus: glutes and hamstrings.",
      items: [
        { machineName: "Plate Loaded Hip Extension", sets: 4, reps: 10, rest_seconds: 90, default_weight: 25 },
        { machineName: "Glutes and Hamstring Developer", sets: 4, reps: 12, rest_seconds: 60, default_weight: 0 },
        { machineName: "Plate Loaded Pendulum Squat", sets: 3, reps: 10, rest_seconds: 90, default_weight: 40 },
        { machineName: "Plate Loaded Hack Squat", sets: 3, reps: 10, rest_seconds: 90, default_weight: 40 },
        { machineName: "Iso Lying Leg Curl", sets: 3, reps: 12, rest_seconds: 60, default_weight: 25 },
        { machineName: "Assisted Nordic Curl", sets: 3, reps: 8, rest_seconds: 60, default_weight: 0 },
      ],
    },
    {
      name: "Legs & Push",
      notes: "Quads, calves, and some chest pressing to round out the week.",
      items: [
        { machineName: "Plate Loaded Leg Press", sets: 4, reps: 10, rest_seconds: 120, default_weight: 100 },
        { machineName: "Plate Loaded Leg Extension", sets: 3, reps: 12, rest_seconds: 60, default_weight: 35 },
        { machineName: "Calf Raise", sets: 4, reps: 15, rest_seconds: 45, default_weight: 50 },
        { machineName: "Plate Loaded Incline Chest Press", sets: 3, reps: 10, rest_seconds: 90, default_weight: 40 },
        { machineName: "Decline Chest Press Machine", sets: 3, reps: 10, rest_seconds: 60, default_weight: 30 },
      ],
    },
  ];

  for (const routine of routines) {
    console.log(`Creating "${routine.name}"...`);

    const { data: routineDb, error: routineErr } = await supabase
      .from("routines")
      .insert({ user_id: userId, name: routine.name, notes: routine.notes })
      .select()
      .single();

    if (routineErr || !routineDb)
      throw new Error(`Failed to create routine "${routine.name}": ${routineErr?.message}`);

    const itemsToInsert = [];
    for (let i = 0; i < routine.items.length; i++) {
      const item = routine.items[i];
      const machineId = await getMachine(item.machineName);
      itemsToInsert.push({
        user_id: userId,
        routine_id: routineDb.id,
        machine_id: machineId,
        position: i,
        sets: item.sets,
        reps: item.reps,
        rest_seconds: item.rest_seconds,
        default_weight: item.default_weight || null,
      });
    }

    const { error: itemsErr } = await supabase
      .from("routine_items")
      .insert(itemsToInsert);

    if (itemsErr)
      throw new Error(`Failed to create items for "${routine.name}": ${itemsErr.message}`);
  }

  console.log("\n✓ Created 6 routines:");
  console.log("  1. Golf Hips & Core: hip mobility & rotation for your swing");
  console.log("  2. Shoulder Builder: all three delt heads");
  console.log("  3. Back Builder: rows for thickness");
  console.log("  4. Arms Day: biceps & triceps");
  console.log("  5. Glute Builder: glutes and hamstrings");
  console.log("  6. Legs & Push: quads, calves + chest pressing");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
