"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Check } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RoutineWithItems, Weekday } from "@/types";

interface WeeklyPlanSheetProps {
  isOpen: boolean;
  onClose: () => void;
  routines: RoutineWithItems[];
}

const WEEKDAY_LABELS: Record<Weekday, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

// Monday-first display order (en-IE convention).
const WEEKDAY_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

async function setRoutineWeekdays(
  routineId: string,
  days: Weekday[]
): Promise<RoutineWithItems> {
  const res = await fetch(`/api/routines/${routineId}/weekdays`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assigned_weekdays: days }),
  });
  if (!res.ok) throw new Error("Failed to update weekdays");
  return res.json();
}

export function WeeklyPlanSheet({
  isOpen,
  onClose,
  routines,
}: WeeklyPlanSheetProps) {
  const todayWeekday = new Date().getDay() as Weekday;
  const [pickerDay, setPickerDay] = useState<Weekday | null>(null);
  const [pendingSwitch, setPendingSwitch] = useState<{
    day: Weekday;
    fromRoutine: RoutineWithItems;
    toRoutineId: string | null; // null = Rest day
  } | null>(null);

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      routineId,
      days,
    }: {
      routineId: string;
      days: Weekday[];
    }) => setRoutineWeekdays(routineId, days),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allRoutines"] });
      queryClient.invalidateQueries({ queryKey: ["routines"] });
    },
  });

  // Map weekday → routine currently owning it.
  const routineByDay = new Map<Weekday, RoutineWithItems>();
  for (const r of routines) {
    for (const d of r.assigned_weekdays) {
      routineByDay.set(d, r);
    }
  }

  const handlePick = (day: Weekday, toRoutineId: string | null) => {
    const currentOwner = routineByDay.get(day);

    // Picking Rest day for a currently-resting day = no-op.
    if (toRoutineId === null && !currentOwner) {
      setPickerDay(null);
      return;
    }

    // Picking the routine already on this day = no-op.
    if (toRoutineId && currentOwner?.id === toRoutineId) {
      setPickerDay(null);
      return;
    }

    // Day-conflict guard: if another routine owns this day, confirm switch first.
    if (currentOwner && toRoutineId && currentOwner.id !== toRoutineId) {
      setPendingSwitch({ day, fromRoutine: currentOwner, toRoutineId });
      setPickerDay(null);
      return;
    }

    applyPick(day, toRoutineId);
  };

  const applyPick = (day: Weekday, toRoutineId: string | null) => {
    if (toRoutineId === null) {
      // Rest day: strip this day from whoever owns it.
      const owner = routineByDay.get(day);
      if (owner) {
        const newDays = owner.assigned_weekdays.filter(
          (d) => d !== day
        ) as Weekday[];
        mutation.mutate({ routineId: owner.id, days: newDays });
      }
    } else {
      // Assign this day to the chosen routine. The RPC strips it from any other
      // routine that holds it, so we just pass the target routine's current days
      // plus this new one.
      const target = routines.find((r) => r.id === toRoutineId);
      if (!target) return;
      const newDays = Array.from(
        new Set<Weekday>([...target.assigned_weekdays, day])
      ).sort((a, b) => a - b);
      mutation.mutate({ routineId: toRoutineId, days: newDays });
    }
    setPickerDay(null);
  };

  const confirmSwitch = () => {
    if (!pendingSwitch) return;
    applyPick(pendingSwitch.day, pendingSwitch.toRoutineId);
    setPendingSwitch(null);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Weekly Plan">
        <div className="space-y-1">
          {WEEKDAY_ORDER.map((day) => {
            const routine = routineByDay.get(day);
            const isToday = day === todayWeekday;
            return (
              <button
                key={day}
                onClick={() => setPickerDay(day)}
                className={cn(
                  "w-full flex items-center gap-3 py-4 px-3 rounded-xl",
                  "hover:bg-bg-input transition-colors tap-highlight-none",
                  "text-left relative"
                )}
              >
                {isToday && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-accent-green"
                  />
                )}
                <div className="flex-1 min-w-0 pl-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text-primary">
                      {WEEKDAY_LABELS[day]}
                    </span>
                    {isToday && (
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-accent-green">
                        Today
                      </span>
                    )}
                  </div>
                  <p
                    className={cn(
                      "text-sm mt-0.5",
                      routine ? "text-text-primary" : "text-text-secondary"
                    )}
                  >
                    {routine ? routine.name : "Rest day"}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-text-secondary shrink-0" />
              </button>
            );
          })}
        </div>
        <p className="text-xs text-text-secondary text-center mt-6 italic">
          Train 4–5 days a week. The plan adjusts.
        </p>
      </Modal>

      {/* Routine picker (nested) */}
      <Modal
        isOpen={pickerDay !== null}
        onClose={() => setPickerDay(null)}
        title={pickerDay !== null ? WEEKDAY_LABELS[pickerDay] : ""}
      >
        {pickerDay !== null && (
          <div className="space-y-1">
            <PickerRow
              label="Rest day"
              isSelected={!routineByDay.get(pickerDay)}
              onClick={() => handlePick(pickerDay, null)}
              variant="rest"
            />
            <div className="h-px bg-border-default my-2" />
            {routines.map((r) => (
              <PickerRow
                key={r.id}
                label={r.name}
                isSelected={routineByDay.get(pickerDay)?.id === r.id}
                onClick={() => handlePick(pickerDay, r.id)}
              />
            ))}
          </div>
        )}
      </Modal>

      {/* Day-conflict confirmation */}
      <Modal
        isOpen={pendingSwitch !== null}
        onClose={() => setPendingSwitch(null)}
        title={
          pendingSwitch
            ? `${WEEKDAY_LABELS[pendingSwitch.day]} is currently ${pendingSwitch.fromRoutine.name}`
            : ""
        }
      >
        {pendingSwitch && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Switching means {pendingSwitch.fromRoutine.name} won&apos;t be on{" "}
              {WEEKDAY_LABELS[pendingSwitch.day]} anymore.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={() => setPendingSwitch(null)}
              >
                Cancel
              </Button>
              <Button onClick={confirmSwitch} isLoading={mutation.isPending}>
                Switch
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

interface PickerRowProps {
  label: string;
  isSelected: boolean;
  onClick: () => void;
  variant?: "default" | "rest";
}

function PickerRow({
  label,
  isSelected,
  onClick,
  variant = "default",
}: PickerRowProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between py-3 px-3 rounded-xl",
        "hover:bg-bg-input transition-colors tap-highlight-none text-left"
      )}
    >
      <span
        className={cn(
          "text-base",
          variant === "rest"
            ? "text-text-secondary"
            : "text-text-primary"
        )}
      >
        {label}
      </span>
      {isSelected && <Check className="w-4 h-4 text-accent-green" />}
    </button>
  );
}
