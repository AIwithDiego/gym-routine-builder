"use client";

import Link from "next/link";
import { Dumbbell, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { RoutineWithItems } from "@/types";

interface RoutineCardProps {
  routine: RoutineWithItems;
}

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function RoutineCard({ routine }: RoutineCardProps) {
  const machineCount = routine.routine_items?.length || 0;
  const assignedLabel =
    routine.assigned_weekdays.length > 0
      ? [...routine.assigned_weekdays]
          .sort((a, b) => a - b)
          .map((d) => WEEKDAY_SHORT[d])
          .join(" · ")
      : null;

  return (
    <Link href={`/routines/${routine.id}`}>
      <Card variant="interactive">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-text-primary">
                {routine.name}
              </h3>
              {assignedLabel && (
                <p className="text-xs text-accent-green mt-0.5 font-medium tracking-wide">
                  {assignedLabel}
                </p>
              )}
              {routine.notes && (
                <p className="text-sm text-text-secondary mt-1 line-clamp-2">
                  {routine.notes}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-text-secondary">
              <Dumbbell className="w-4 h-4" />
              <span className="text-sm">
                {machineCount} {machineCount === 1 ? "machine" : "machines"}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-text-secondary" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
