"use client";

import { useState } from "react";
import { CheckCircle, Dumbbell, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { RoutineItemWithMachine, WorkoutSet } from "@/types";

interface WorkoutSummaryProps {
  items: RoutineItemWithMachine[];
  completedSets: WorkoutSet[];
  startedAt: string;
  onFinish: () => void;
  isLoading?: boolean;
}

export function WorkoutSummary({
  items,
  completedSets,
  startedAt,
  onFinish,
  isLoading = false,
}: WorkoutSummaryProps) {
  const totalSets = completedSets.length;
  const totalWeight = completedSets.reduce((sum, set) => sum + set.weight, 0);

  // Read the clock once when the summary mounts (render must stay pure).
  const [finishedAtMs] = useState(() => Date.now());
  const duration = Math.round(
    (finishedAtMs - new Date(startedAt).getTime()) / 60000
  );

  // Group sets by routine item
  const setsByItem = items.map((item) => ({
    item,
    sets: completedSets.filter((set) => set.routine_item_id === item.id),
  }));

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full bg-accent-green/20 flex items-center justify-center mb-4">
            <CheckCircle className="w-10 h-10 text-accent-green" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">
            Workout Complete!
          </h1>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="text-center py-4">
              <Dumbbell className="w-5 h-5 text-text-secondary mx-auto mb-1" />
              <p className="text-2xl font-bold text-text-primary">{totalSets}</p>
              <p className="text-xs text-text-secondary">Sets</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="text-center py-4">
              <p className="text-2xl font-bold text-text-primary mb-1">
                {totalWeight.toLocaleString()}
              </p>
              <p className="text-xs text-text-secondary">Total kg</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="text-center py-4">
              <Clock className="w-5 h-5 text-text-secondary mx-auto mb-1" />
              <p className="text-2xl font-bold text-text-primary">{duration}</p>
              <p className="text-xs text-text-secondary">Minutes</p>
            </CardContent>
          </Card>
        </div>

        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Exercise Summary
        </h2>

        <div className="space-y-3">
          {setsByItem.map(({ item, sets }) => (
            <Card key={item.id}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text-primary">
                      {item.machine.name}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {sets.length} sets completed
                    </p>
                  </div>
                  <div className="text-right">
                    {sets.length > 0 && (
                      <>
                        <p className="font-medium text-text-primary">
                          {sets.map((s) => s.weight).join(" / ")} kg
                        </p>
                        <p className="text-xs text-text-secondary">per set</p>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="p-6 pb-safe">
        <Button
          onClick={onFinish}
          className="w-full"
          size="lg"
          isLoading={isLoading}
        >
          Finish Workout
        </Button>
      </div>
    </div>
  );
}
