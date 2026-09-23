"use client";

import { ChevronRight, Dumbbell, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelativeDate } from "@/lib/utils";
import type { WorkoutSessionWithDetails } from "@/types";

interface WorkoutHistoryCardProps {
  workout: WorkoutSessionWithDetails;
  onClick: () => void;
}

export function WorkoutHistoryCard({ workout, onClick }: WorkoutHistoryCardProps) {
  const setsCount = workout.workout_sets?.length || 0;

  return (
    <Card className="cursor-pointer hover:bg-bg-card/80 transition-colors" onClick={onClick}>
      <CardContent className="py-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-medium text-text-primary truncate">
                {workout.routine?.name ?? "Workout"}
              </h3>
              <ChevronRight className="w-5 h-5 text-text-secondary flex-shrink-0 ml-2" />
            </div>
            <div className="flex items-center gap-4 text-sm text-text-secondary">
              <span>{formatRelativeDate(workout.started_at)}</span>
              <span className="flex items-center gap-1">
                <Dumbbell className="w-3.5 h-3.5" />
                {setsCount} sets
              </span>
              <span>{workout.total_weight.toLocaleString()} kg</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {workout.duration_minutes}m
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
