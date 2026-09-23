/**
 * Adds 4 new routines to broaden the menu beyond the original 6.
 * All routines start with assigned_weekdays = []; the owner assigns weekdays in the
 * Weekly Plan editor in the app.
 *
 * Uses ONLY machines that exist in the seeded FlyeFit roster (see supabase/schema.sql).
 *
 * Run: npx tsx scripts/seed-new-routines.ts
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
  const routines: RoutinePlan[] = [
    {
      name: "Chest Day",
      notes: "Heavy push focus. Upper, mid, lower chest in one session.",
      items: [
        { machineName: "Plate Loaded Incline Chest Press", sets: 4, reps: 8, rest_seconds: 90, default_weight: 40 },
        { machineName: "Decline Chest Press Machine", sets: 3, reps: 10, rest_seconds: 75, default_weight: 35 },
        { machineName: "Standing Chest Press", sets: 3, reps: 10, rest_seconds: 60, default_weight: 25 },
        { machineName: "Cable Machine - Chest Fly", sets: 3, reps: 12, rest_seconds: 60, default_weight: 15 },
        { machineName: "Tricep Pushdown", sets: 3, reps: 12, rest_seconds: 45, default_weight: 20 },
      ],
    },
    {
      name: "Pull Day",
      notes: "Back thickness + biceps. Row, pull, curl.",
      items: [
        { machineName: "Plate Loaded T-Bar Row", sets: 4, reps: 8, rest_seconds: 90, default_weight: 35 },
        { machineName: "Plate Loaded Seated Row", sets: 4, reps: 10, rest_seconds: 75, default_weight: 45 },
        { machineName: "Cable Machine - Bicep Curl", sets: 4, reps: 12, rest_seconds: 45, default_weight: 15 },
        { machineName: "Reverse Hyper Extension & Back Extension", sets: 3, reps: 12, rest_seconds: 60, default_weight: 0 },
      ],
    },
    {
      name: "Full Body Express",
      notes: "30-minute compound circuit. Use when time is tight.",
      items: [
        { machineName: "Plate Loaded Leg Press", sets: 3, reps: 10, rest_seconds: 60, default_weight: 80 },
        { machineName: "Plate Loaded Incline Chest Press", sets: 3, reps: 10, rest_seconds: 60, default_weight: 35 },
        { machineName: "Plate Loaded Seated Row", sets: 3, reps: 10, rest_seconds: 60, default_weight: 40 },
        { machineName: "Shoulder Press Machine", sets: 3, reps: 10, rest_seconds: 60, default_weight: 25 },
      ],
    },
    {
      name: "Conditioning",
      notes: "Cardio + core. Recovery-day option. Get the blood moving.",
      items: [
        { machineName: "Rowing Machine", sets: 1, reps: 1, rest_seconds: 0, default_weight: 0 },
        { machineName: "Ski Erg", sets: 1, reps: 1, rest_seconds: 0, default_weight: 0 },
        { machineName: "Reverse Hyper Extension & Back Extension", sets: 3, reps: 15, rest_seconds: 45, default_weight: 0 },
        { machineName: "Stationary Bike", sets: 1, reps: 1, rest_seconds: 0, default_weight: 0 },
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

  console.log("\n✓ Added 4 new routines: Chest Day, Pull Day, Full Body Express, Conditioning.");
  console.log("  Assign them to weekdays via the Weekly Plan editor in the app.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
