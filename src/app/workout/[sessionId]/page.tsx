"use client";

import { useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, AlertCircle, ChevronUp, ChevronDown, ArrowDownToLine } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useWorkoutPlayer } from "@/stores/workout-player";
import { WorkSetScreen } from "@/components/workout/work-set-screen";
import { RestScreen } from "@/components/workout/rest-screen";
import { HydrationReminder } from "@/components/workout/hydration-reminder";
import { WorkoutSummary } from "@/components/workout/workout-summary";
import type { WorkoutSet } from "@/types";

interface WorkoutSessionData {
  id: string;
  routine_id: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  routine: {
    id: string;
    name: string;
    routine_items: Array<{
      id: string;
      machine_id: string;
      position: number;
      sets: number;
      reps: number;
      rest_seconds: number;
      default_weight: number | null;
      machine: {
        id: string;
        name: string;
        category: string;
        brand: string | null;
        description: string | null;
        video_url: string | null;
      };
    }>;
  };
  workout_sets: WorkoutSet[];
}

async function fetchWorkoutSession(sessionId: string): Promise<WorkoutSessionData> {
  const res = await fetch(`/api/workouts/${sessionId}`);
  if (!res.ok) throw new Error("Failed to fetch workout session");
  return res.json();
}

async function recordSet(
  sessionId: string,
  data: {
    routine_item_id: string;
    set_number: number;
    target_reps: number;
    weight: number;
  }
): Promise<WorkoutSet> {
  const res = await fetch(`/api/workouts/${sessionId}/set`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to record set");
  return res.json();
}

async function finishWorkout(sessionId: string): Promise<void> {
  const res = await fetch(`/api/workouts/${sessionId}/finish`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to finish workout");
}

async function abandonWorkout(sessionId: string): Promise<void> {
  const res = await fetch(`/api/workouts/${sessionId}/finish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "abandoned" }),
  });
  if (!res.ok) throw new Error("Failed to abandon workout");
}

export default function WorkoutPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const sessionId = params.sessionId as string;
  // Guards initWorkout so it runs once per mount. A ref, not state: nothing
  // renders from it, and setting it must not trigger a render.
  const isInitializedRef = useRef(false);

  const {
    phase,
    currentItemIndex,
    currentSetNumber,
    items,
    completedSets,
    restTimeRemaining,
    restTimerTotal,
    isPaused,
    currentWeight,
    initWorkout,
    completeSet,
    tickRest,
    adjustRestTime,
    togglePause,
    skipRest,
    dismissHydration,
    setCurrentWeight,
    moveExercise,
    resetWorkout,
  } = useWorkoutPlayer();

  const { data: session, isLoading, error } = useQuery({
    queryKey: ["workoutSession", sessionId],
    queryFn: () => fetchWorkoutSession(sessionId),
    refetchOnWindowFocus: false,
  });

  const recordSetMutation = useMutation({
    mutationFn: (data: {
      routine_item_id: string;
      set_number: number;
      target_reps: number;
      weight: number;
    }) => recordSet(sessionId, data),
    onSuccess: (newSet) => {
      completeSet(newSet);
    },
  });

  const finishMutation = useMutation({
    mutationFn: () => finishWorkout(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workoutHistory"] });
      resetWorkout();
      router.push("/");
    },
  });

  const abandonMutation = useMutation({
    mutationFn: () => abandonWorkout(sessionId),
    onSuccess: () => {
      resetWorkout();
      router.push("/");
    },
  });

  // Initialize workout when session data is loaded
  useEffect(() => {
    if (session && !isInitializedRef.current) {
      const items = session.routine.routine_items.map((item) => ({
        ...item,
        routine_id: session.routine_id,
        machine: {
          ...item.machine,
          category: item.machine.category as 'upper' | 'lower' | 'core' | 'cardio',
          brand: item.machine.brand ?? null,
          description: item.machine.description ?? null,
          video_url: item.machine.video_url ?? null,
        },
      }));
      initWorkout(sessionId, items, session.workout_sets || []);
      isInitializedRef.current = true;
    }
  }, [session, sessionId, initWorkout]);

  const handleCompleteSet = useCallback(() => {
    const currentItem = items[currentItemIndex];
    if (!currentItem) return;

    recordSetMutation.mutate({
      routine_item_id: currentItem.id,
      set_number: currentSetNumber,
      target_reps: currentItem.reps,
      weight: currentWeight,
    });
  }, [items, currentItemIndex, currentSetNumber, currentWeight, recordSetMutation]);

  const handleExit = useCallback(() => {
    if (completedSets.length > 0) {
      if (confirm("Are you sure you want to exit? Your progress will be saved.")) {
        abandonMutation.mutate();
      }
    } else {
      abandonMutation.mutate();
    }
  }, [completedSets.length, abandonMutation]);

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-bg-app flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent-green border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading workout...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-dvh bg-bg-app flex items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-status-error mx-auto mb-4" />
          <h1 className="text-xl font-bold text-text-primary mb-2">
            Workout Not Found
          </h1>
          <p className="text-text-secondary mb-6">
            This workout session could not be loaded.
          </p>
          <button
            onClick={() => router.push("/")}
            className="text-accent-green"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const currentItem = items[currentItemIndex];
  const nextItem = items[currentItemIndex + 1];

  // Determine next machine name for rest screen
  const setsForCurrentItem = completedSets.filter(
    (s) => s.routine_item_id === currentItem?.id
  );
  const isMovingToNextExercise =
    currentItem && setsForCurrentItem.length >= currentItem.sets;
  const nextMachineName = isMovingToNextExercise
    ? nextItem?.machine.name
    : currentItem?.machine.name;

  return (
    <div className="min-h-dvh bg-bg-app flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border-default">
        <button
          onClick={handleExit}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-bg-card transition-colors"
        >
          <X className="w-6 h-6 text-text-primary" />
        </button>
        <div className="text-center">
          <h1 className="font-semibold text-text-primary">
            {session.routine?.name ?? "Workout"}
          </h1>
          <div className="flex items-center justify-center gap-2 mt-0.5">
            <p className="text-sm text-text-secondary">
              {currentItemIndex + 1} of {items.length} exercises
            </p>
            {phase === "working" && items.length > 1 && (
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => moveExercise("up")}
                  disabled={currentItemIndex === 0}
                  className="w-6 h-6 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-card disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Move exercise up"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => moveExercise("down")}
                  disabled={currentItemIndex >= items.length - 1}
                  className="w-6 h-6 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-card disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Move exercise down"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  onClick={() => moveExercise("end")}
                  disabled={currentItemIndex >= items.length - 1}
                  className="w-6 h-6 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-card disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Skip to end"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="w-10" /> {/* Spacer for centering */}
      </header>

      {/* Content */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          {phase === "working" && currentItem && (
            <motion.div
              key="working"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <WorkSetScreen
                item={currentItem}
                currentSet={currentSetNumber}
                totalSets={currentItem.sets}
                weight={currentWeight}
                onWeightChange={setCurrentWeight}
                onComplete={handleCompleteSet}
                isLoading={recordSetMutation.isPending}
              />
            </motion.div>
          )}

          {phase === "resting" && (
            <motion.div
              key="resting"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <RestScreen
                timeRemaining={restTimeRemaining}
                totalTime={restTimerTotal}
                isPaused={isPaused}
                nextMachineName={nextMachineName}
                onTick={tickRest}
                onAdjust={adjustRestTime}
                onTogglePause={togglePause}
                onSkip={skipRest}
              />
            </motion.div>
          )}

          {phase === "hydrating" && (
            <motion.div
              key="hydrating"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <HydrationReminder
                nextMachineName={nextItem?.machine.name}
                onDismiss={dismissHydration}
              />
            </motion.div>
          )}

          {phase === "summary" && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <WorkoutSummary
                items={items}
                completedSets={completedSets}
                startedAt={session.started_at}
                onFinish={() => finishMutation.mutate()}
                isLoading={finishMutation.isPending}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
