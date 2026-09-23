"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  Copy,
  Trash2,
  Dumbbell,
  MoreVertical,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { StartWorkoutButton } from "@/components/routines/start-workout-button";
import { WeeklyPlanSheet } from "@/components/routines/weekly-plan-sheet";
import type { RoutineWithItems, Weekday } from "@/types";

const WEEKDAY_SHORT: Record<Weekday, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

const MONDAY_FIRST: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

async function fetchRoutine(id: string): Promise<RoutineWithItems> {
  const res = await fetch(`/api/routines/${id}`);
  if (!res.ok) throw new Error("Failed to fetch routine");
  return res.json();
}

async function fetchAllRoutines(): Promise<RoutineWithItems[]> {
  const res = await fetch("/api/routines");
  if (!res.ok) return [];
  return res.json();
}

async function deleteRoutine(id: string): Promise<void> {
  const res = await fetch(`/api/routines/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete routine");
}

async function duplicateRoutine(id: string): Promise<RoutineWithItems> {
  const res = await fetch(`/api/routines/${id}/duplicate`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to duplicate routine");
  return res.json();
}

function relativeDays(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const days = Math.floor((now - then) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "1 week ago";
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 60) return "1 month ago";
  return `${Math.floor(days / 30)} months ago`;
}

export default function RoutineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const routineId = params.id as string;
  const [isKebabOpen, setIsKebabOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPlanOpen, setIsPlanOpen] = useState(false);

  const { data: routine, isLoading } = useQuery({
    queryKey: ["routine", routineId],
    queryFn: () => fetchRoutine(routineId),
  });

  const { data: allRoutines = [] } = useQuery({
    queryKey: ["allRoutines"],
    queryFn: fetchAllRoutines,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteRoutine(routineId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routines"] });
      queryClient.invalidateQueries({ queryKey: ["allRoutines"] });
      router.push("/routines");
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: () => duplicateRoutine(routineId),
    onSuccess: (newRoutine) => {
      queryClient.invalidateQueries({ queryKey: ["routines"] });
      queryClient.invalidateQueries({ queryKey: ["allRoutines"] });
      router.push(`/build/${newRoutine.id}`);
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-12 bg-bg-card rounded-xl animate-pulse" />
        <div className="h-40 bg-bg-card rounded-2xl animate-pulse" />
        <div className="h-64 bg-bg-card rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!routine) {
    return (
      <div className="p-4 text-center py-12">
        <p className="text-text-secondary">Routine not found</p>
        <Link href="/routines" className="text-accent-green mt-2 inline-block">
          Go back to routines
        </Link>
      </div>
    );
  }

  const assignedLabel =
    routine.assigned_weekdays.length > 0
      ? MONDAY_FIRST.filter((d) => routine.assigned_weekdays.includes(d))
          .map((d) => WEEKDAY_SHORT[d])
          .join(" · ")
      : null;

  return (
    <div className="p-4 space-y-6">
      <header className="flex items-start gap-3 pt-2">
        <Link
          href="/routines"
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-bg-card transition-colors shrink-0"
          aria-label="Back to routines"
        >
          <ArrowLeft className="w-6 h-6 text-text-primary" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-text-primary">
            {routine.name}
          </h1>
          {routine.notes && (
            <p className="text-sm text-text-secondary mt-0.5">{routine.notes}</p>
          )}
          {assignedLabel && (
            <p className="text-xs text-accent-green mt-1.5 font-medium tracking-wide">
              Assigned: {assignedLabel}
            </p>
          )}
        </div>
        <button
          onClick={() => setIsKebabOpen(true)}
          aria-label="Routine options"
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-bg-card transition-colors shrink-0"
        >
          <MoreVertical className="w-5 h-5 text-text-secondary" />
        </button>
      </header>

      <div>
        <StartWorkoutButton routineId={routine.id} size="lg" className="w-full" />
      </div>

      <section>
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Machines ({routine.routine_items?.length || 0})
        </h2>

        {routine.routine_items && routine.routine_items.length > 0 ? (
          <div className="space-y-3">
            {routine.routine_items.map((item, index) => {
              const isCardio = item.machine.category === "cardio";
              const hasHistory = item.last_recorded_at !== null;
              return (
                <Card key={item.id}>
                  <CardContent className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-bg-input flex items-center justify-center text-text-secondary font-medium shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary">
                        {item.machine.name}
                      </p>
                      <p className="text-sm text-text-secondary">
                        {isCardio
                          ? "Cardio"
                          : `${item.sets} sets × ${item.reps} reps${item.default_weight ? ` @ ${item.default_weight} kg` : ""}`}
                      </p>
                      {hasHistory ? (
                        <p className="text-xs text-text-secondary/80 mt-1">
                          Last:{" "}
                          {isCardio
                            ? `${item.last_actual_reps ?? "-"} min`
                            : `${item.last_weight} kg${
                                item.last_actual_reps
                                  ? ` × ${item.last_actual_reps}`
                                  : ""
                              }`}{" "}
                          · {relativeDays(item.last_recorded_at!)}
                        </p>
                      ) : (
                        <p className="text-xs text-text-secondary/60 mt-1 italic">
                          No previous session
                        </p>
                      )}
                    </div>
                    {!isCardio && (
                      <div className="text-right shrink-0">
                        <p className="text-xs text-text-secondary">
                          {item.rest_seconds}s rest
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <Dumbbell className="w-8 h-8 text-text-secondary mx-auto mb-2" />
              <p className="text-text-secondary">No machines added yet</p>
              <Link
                href={`/build/${routine.id}`}
                className="text-accent-green text-sm mt-1 inline-block"
              >
                Add machines
              </Link>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Kebab menu */}
      <Modal
        isOpen={isKebabOpen}
        onClose={() => setIsKebabOpen(false)}
        title="Routine options"
      >
        <div className="space-y-1">
          <KebabRow
            icon={Calendar}
            label="Weekly plan"
            onClick={() => {
              setIsKebabOpen(false);
              setIsPlanOpen(true);
            }}
          />
          <Link
            href={`/build/${routine.id}`}
            onClick={() => setIsKebabOpen(false)}
            className="block"
          >
            <KebabRow icon={Edit} label="Edit routine" onClick={() => {}} />
          </Link>
          <KebabRow
            icon={Copy}
            label="Duplicate routine"
            onClick={() => {
              setIsKebabOpen(false);
              duplicateMutation.mutate();
            }}
          />
          <KebabRow
            icon={Trash2}
            label="Delete routine"
            destructive
            onClick={() => {
              setIsKebabOpen(false);
              setIsDeleteOpen(true);
            }}
          />
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete this routine?"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            This will remove the routine from your weekly plan. Past workouts
            stay in your history.
          </p>
          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              onClick={() => setIsDeleteOpen(false)}
            >
              Keep routine
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteMutation.mutate()}
              isLoading={deleteMutation.isPending}
            >
              Delete routine
            </Button>
          </div>
        </div>
      </Modal>

      {/* Weekly Plan sheet (reachable from kebab) */}
      <WeeklyPlanSheet
        isOpen={isPlanOpen}
        onClose={() => setIsPlanOpen(false)}
        routines={allRoutines}
      />
    </div>
  );
}

interface KebabRowProps {
  icon: typeof Edit;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}

function KebabRow({ icon: Icon, label, onClick, destructive }: KebabRowProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-bg-input transition-colors tap-highlight-none text-left"
    >
      <Icon
        className={`w-5 h-5 ${destructive ? "text-status-error" : "text-text-secondary"}`}
      />
      <span
        className={`text-base ${destructive ? "text-status-error" : "text-text-primary"}`}
      >
        {label}
      </span>
    </button>
  );
}
