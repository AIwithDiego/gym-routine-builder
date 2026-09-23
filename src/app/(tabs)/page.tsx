"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Play, Settings, ChevronDown, ChevronUp, Dumbbell } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { WorkoutHistoryCard } from "@/components/workout/workout-history-card";
import { WorkoutHistoryModal } from "@/components/workout/workout-history-modal";
import { WeeklyPlanSheet } from "@/components/routines/weekly-plan-sheet";
import { cn } from "@/lib/utils";
import type {
  RoutineWithItems,
  WorkoutSessionWithDetails,
  Weekday,
  WorkoutSet,
} from "@/types";

const WEEKDAY_LONG: Record<Weekday, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

interface InProgressSession {
  id: string;
  routine_id: string | null;
  started_at: string;
  ended_at: string | null;
  status: string;
  routine: { id: string; name: string } | null;
  workout_sets: WorkoutSet[];
}

async function fetchAllRoutines(): Promise<RoutineWithItems[]> {
  const res = await fetch("/api/routines");
  if (!res.ok) return [];
  return res.json();
}

async function fetchWorkoutHistory(): Promise<WorkoutSessionWithDetails[]> {
  const res = await fetch("/api/workouts/history");
  if (!res.ok) return [];
  return res.json();
}

async function fetchInProgress(): Promise<InProgressSession | null> {
  // POST because the endpoint also abandons stale sessions (it writes).
  const res = await fetch("/api/workouts/in-progress", { method: "POST" });
  if (!res.ok) return null;
  return res.json();
}

function estimateDurationMin(routine: RoutineWithItems): number | null {
  const items = routine.routine_items ?? [];
  if (items.length === 0) return null;
  const totalSec = items.reduce((sum, it) => {
    if (it.machine.category === "cardio") return sum + 20 * 60;
    return sum + it.sets * (it.rest_seconds + 60);
  }, 0);
  if (totalSec <= 0) return null;
  const min = Math.round(totalSec / 60 / 5) * 5;
  return Math.max(10, min);
}

function elapsedLabel(startedAt: string): string {
  const min = Math.max(
    0,
    Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000)
  );
  if (min < 90) return `${min} min`;
  const hours = Math.floor(min / 60);
  const remainder = min % 60;
  return remainder === 0 ? `${hours} hr` : `${hours} hr ${remainder} min`;
}

export default function TodayPage() {
  const router = useRouter();
  const [selectedWorkout, setSelectedWorkout] =
    useState<WorkoutSessionWithDetails | null>(null);
  const [showOverride, setShowOverride] = useState(false);
  const [isPlanOpen, setIsPlanOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const todayWeekday = useMemo(
    () => new Date().getDay() as Weekday,
    []
  );
  const today = useMemo(() => new Date(), []);
  const dateLabel = today.toLocaleDateString("en-IE", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const { data: routines = [], isLoading: loadingRoutines } = useQuery({
    queryKey: ["allRoutines"],
    queryFn: fetchAllRoutines,
  });

  const { data: workoutHistory = [], isLoading: loadingHistory } = useQuery({
    queryKey: ["workoutHistory"],
    queryFn: fetchWorkoutHistory,
  });

  const { data: inProgress } = useQuery({
    queryKey: ["inProgressSession"],
    queryFn: fetchInProgress,
    refetchOnWindowFocus: true,
  });

  const isLoading = loadingRoutines || loadingHistory;

  const todaysRoutine = useMemo(
    () => routines.find((r) => r.assigned_weekdays.includes(todayWeekday)) ?? null,
    [routines, todayWeekday]
  );

  const hasAnyPlan = routines.some((r) => r.assigned_weekdays.length > 0);
  const hasRoutines = routines.length > 0;

  // Variant resolution: Resume > Planned > Rest > ColdStart.
  type Variant = "resume" | "planned" | "rest" | "cold-start";
  const variant: Variant = inProgress
    ? "resume"
    : todaysRoutine
      ? "planned"
      : hasAnyPlan || hasRoutines
        ? "rest"
        : "cold-start";

  return (
    <div className="p-4 space-y-6">
      <header className="flex items-start justify-between pt-2">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Today</h1>
          <time
            dateTime={today.toISOString().slice(0, 10)}
            className="text-text-secondary text-sm"
          >
            {dateLabel}
          </time>
        </div>
        <div className="flex items-center gap-1">
          {variant !== "cold-start" && (
            <button
              onClick={() => setIsPlanOpen(true)}
              aria-label="Edit weekly plan"
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-bg-card transition-colors"
            >
              <Settings className="w-5 h-5 text-text-secondary" />
            </button>
          )}
          <SignOutButton />
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-48 bg-bg-card rounded-2xl animate-pulse" />
          <div className="h-24 bg-bg-card rounded-2xl animate-pulse" />
        </div>
      ) : (
        <>
          {variant === "resume" && inProgress && (
            <ResumeHero
              session={inProgress}
              todaysRoutineName={todaysRoutine?.name ?? null}
              onResume={() => router.push(`/workout/${inProgress.id}`)}
            />
          )}

          {variant === "planned" && todaysRoutine && (
            <PlannedHero
              routine={todaysRoutine}
              weekday={todayWeekday}
              onExpand={() => setShowOverride((s) => !s)}
              isExpanded={showOverride}
              otherRoutines={routines.filter((r) => r.id !== todaysRoutine.id)}
            />
          )}

          {variant === "rest" && (
            <RestHero
              weekday={todayWeekday}
              onTrainAnyway={() => setIsPickerOpen(true)}
            />
          )}

          {variant === "cold-start" && (
            <ColdStartHero
              hasRoutines={hasRoutines}
              onSetUp={() => setIsPlanOpen(true)}
              onPickToday={() => setIsPickerOpen(true)}
            />
          )}

          {workoutHistory.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-text-primary mb-3">
                Recent Workouts
              </h2>
              <div className="space-y-3">
                {workoutHistory.map((workout) => (
                  <WorkoutHistoryCard
                    key={workout.id}
                    workout={workout}
                    onClick={() => setSelectedWorkout(workout)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <WorkoutHistoryModal
        workout={selectedWorkout}
        isOpen={!!selectedWorkout}
        onClose={() => setSelectedWorkout(null)}
      />

      <WeeklyPlanSheet
        isOpen={isPlanOpen}
        onClose={() => setIsPlanOpen(false)}
        routines={routines}
      />

      <Modal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        title="Pick a routine"
      >
        {routines.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-6">
            You don&apos;t have any routines yet.
          </p>
        ) : (
          <div className="space-y-1">
            {routines.map((r) => (
              <Link
                key={r.id}
                href={`/routines/${r.id}`}
                onClick={() => setIsPickerOpen(false)}
                className="block w-full py-3 px-3 rounded-xl hover:bg-bg-input transition-colors"
              >
                <p className="font-medium text-text-primary">{r.name}</p>
                <p className="text-xs text-text-secondary">
                  {r.routine_items?.length ?? 0} machines
                </p>
              </Link>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

interface ResumeHeroProps {
  session: InProgressSession;
  todaysRoutineName: string | null;
  onResume: () => void;
}

function ResumeHero({ session, todaysRoutineName, onResume }: ResumeHeroProps) {
  const setCount = session.workout_sets?.length ?? 0;
  const elapsed = elapsedLabel(session.started_at);
  const routineName = session.routine?.name ?? "Workout";
  return (
    <section>
      <Card>
        <CardContent className="py-5 space-y-3">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-status-warning">
            In progress
          </p>
          <h2 className="text-2xl font-bold text-text-primary">{routineName}</h2>
          <p className="text-sm text-text-secondary">
            {setCount === 0
              ? `Started ${elapsed} ago`
              : `${setCount} set${setCount === 1 ? "" : "s"} done · ${elapsed} in`}
          </p>
          <Button onClick={onResume} size="lg" className="w-full">
            <Play className="w-4 h-4 mr-1" />
            Resume workout
          </Button>
        </CardContent>
      </Card>
      {todaysRoutineName && (
        <p className="text-xs text-text-secondary mt-3 text-center">
          Today&apos;s plan: {todaysRoutineName}
        </p>
      )}
    </section>
  );
}

interface PlannedHeroProps {
  routine: RoutineWithItems;
  weekday: Weekday;
  onExpand: () => void;
  isExpanded: boolean;
  otherRoutines: RoutineWithItems[];
}

function PlannedHero({
  routine,
  weekday,
  onExpand,
  isExpanded,
  otherRoutines,
}: PlannedHeroProps) {
  const exerciseCount = routine.routine_items?.length ?? 0;
  const estimate = estimateDurationMin(routine);
  const eyebrow = WEEKDAY_LONG[weekday].toUpperCase();
  return (
    <section className="space-y-4">
      <Card>
        <CardContent className="py-5 space-y-3">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-accent-green/80">
            {eyebrow}
          </p>
          <h2 className="text-2xl font-bold text-text-primary">
            <span className="sr-only">
              {WEEKDAY_LONG[weekday]}&apos;s workout:{" "}
            </span>
            {routine.name}
          </h2>
          <p className="text-sm text-text-secondary">
            {exerciseCount} exercise{exerciseCount === 1 ? "" : "s"}
            {estimate !== null && ` · ~${estimate} min`}
          </p>
          <Link href={`/routines/${routine.id}`} className="block">
            <Button size="lg" className="w-full">
              <Play className="w-4 h-4 mr-1" />
              Preview workout
            </Button>
          </Link>
        </CardContent>
      </Card>

      {otherRoutines.length > 0 && (
        <div>
          <button
            onClick={onExpand}
            className="w-full flex items-center justify-between py-2 px-1 text-sm text-text-secondary hover:text-text-primary transition-colors tap-highlight-none"
            aria-expanded={isExpanded}
          >
            <span className="italic">Not feeling it?</span>
            <span className="flex items-center gap-1">
              Choose a different routine
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </span>
          </button>
          {isExpanded && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              {otherRoutines.map((r) => (
                <Link key={r.id} href={`/routines/${r.id}`}>
                  <Card variant="interactive">
                    <CardContent className="p-3">
                      <p className="font-semibold text-text-primary text-sm truncate">
                        {r.name}
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {r.routine_items?.length ?? 0} exercises
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

interface RestHeroProps {
  weekday: Weekday;
  onTrainAnyway: () => void;
}

function RestHero({ weekday, onTrainAnyway }: RestHeroProps) {
  return (
    <section>
      <Card>
        <CardContent className="py-5 space-y-3">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-text-secondary">
            {WEEKDAY_LONG[weekday].toUpperCase()}
          </p>
          <h2 className="text-2xl font-bold text-text-primary">
            <span className="sr-only">
              {WEEKDAY_LONG[weekday]} is a{" "}
            </span>
            Rest day
          </h2>
          <p className="text-sm text-text-secondary italic">
            Recovery is where the gains stick.
          </p>
          <Button
            onClick={onTrainAnyway}
            variant="secondary"
            size="lg"
            className="w-full"
          >
            Train anyway
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}

interface ColdStartHeroProps {
  hasRoutines: boolean;
  onSetUp: () => void;
  onPickToday: () => void;
}

function ColdStartHero({
  hasRoutines,
  onSetUp,
  onPickToday,
}: ColdStartHeroProps) {
  if (!hasRoutines) {
    return (
      <section>
        <Card>
          <CardContent className="text-center py-10 space-y-3">
            <Dumbbell className="w-10 h-10 text-text-secondary mx-auto" />
            <h2 className="text-xl font-bold text-text-primary">
              Build your first routine
            </h2>
            <p className="text-sm text-text-secondary">
              Create a routine and assign it to the days you train.
            </p>
            <Link href="/build" className="inline-block">
              <Button size="lg">Create a routine</Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    );
  }
  return (
    <section>
      <Card>
        <CardContent className="text-center py-10 space-y-3">
          <h2 className="text-xl font-bold text-text-primary">
            Set up your weekly plan
          </h2>
          <p className="text-sm text-text-secondary">
            Assign routines to weekdays so the app knows what you train and
            when.
          </p>
          <Button onClick={onSetUp} size="lg" className={cn("mt-2")}>
            Set up weekly plan
          </Button>
          <button
            onClick={onPickToday}
            className="block mx-auto text-sm text-text-secondary hover:text-accent-green transition-colors"
          >
            Or pick a routine for today →
          </button>
        </CardContent>
      </Card>
    </section>
  );
}
