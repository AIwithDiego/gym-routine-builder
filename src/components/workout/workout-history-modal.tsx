"use client";

import { Dumbbell, Clock } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { WorkoutSessionWithDetails } from "@/types";

interface WorkoutHistoryModalProps {
  workout: WorkoutSessionWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
}

export function WorkoutHistoryModal({ workout, isOpen, onClose }: WorkoutHistoryModalProps) {
  if (!workout) return null;

  const setsCount = workout.workout_sets?.length || 0;

  // Group sets by routine item
  const setsByItem = workout.routine_items.map((item) => ({
    item,
    sets: workout.workout_sets?.filter((set) => set.routine_item_id === item.id) || [],
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={workout.routine?.name ?? "Workout"}
    >
      <div className="-mt-2 mb-4">
        <p className="text-sm text-text-secondary">
          {formatDate(workout.ended_at || workout.started_at)}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card>
          <CardContent className="text-center py-3">
            <Dumbbell className="w-4 h-4 text-text-secondary mx-auto mb-1" />
            <p className="text-xl font-bold text-text-primary">{setsCount}</p>
            <p className="text-xs text-text-secondary">Sets</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-3">
            <p className="text-xl font-bold text-text-primary mb-1">
              {workout.total_weight.toLocaleString()}
            </p>
            <p className="text-xs text-text-secondary">Total kg</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-3">
            <Clock className="w-4 h-4 text-text-secondary mx-auto mb-1" />
            <p className="text-xl font-bold text-text-primary">
              {workout.duration_minutes}
            </p>
            <p className="text-xs text-text-secondary">Minutes</p>
          </CardContent>
        </Card>
      </div>

      <h3 className="text-sm font-semibold text-text-primary mb-3">
        Exercise Summary
      </h3>

      <div className="space-y-2 mb-6">
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

      <Button onClick={onClose} className="w-full" variant="secondary">
        Close
      </Button>
    </Modal>
  );
}
