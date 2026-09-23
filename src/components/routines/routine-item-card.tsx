"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Settings } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { RoutineItemWithMachine } from "@/types";

interface RoutineItemCardProps {
  item: RoutineItemWithMachine;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}

export function RoutineItemCard({
  item,
  index,
  onEdit,
  onDelete,
}: RoutineItemCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "opacity-50")}
    >
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center">
            <button
              {...attributes}
              {...listeners}
              className="p-4 cursor-grab active:cursor-grabbing touch-none"
            >
              <GripVertical className="w-5 h-5 text-text-secondary" />
            </button>

            <div className="flex-1 py-4 pr-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-bg-input flex items-center justify-center text-sm font-medium text-text-secondary">
                  {index + 1}
                </span>
                <span className="font-medium text-text-primary">
                  {item.machine.name}
                </span>
                {item.machine.brand && (
                  <span className="text-xs text-text-secondary">
                    {item.machine.brand}
                  </span>
                )}
              </div>
              <p className="text-sm text-text-secondary mt-1 ml-8">
                {item.sets} sets x {item.reps} reps
                {item.default_weight && ` @ ${item.default_weight} kg`}
                <span className="mx-2">·</span>
                {item.rest_seconds}s rest
              </p>
            </div>

            <button
              onClick={onEdit}
              className="p-3 hover:bg-bg-input rounded-lg transition-colors tap-highlight-none"
            >
              <Settings className="w-5 h-5 text-text-secondary" />
            </button>

            <button
              onClick={onDelete}
              className="p-3 hover:bg-bg-input rounded-lg transition-colors tap-highlight-none mr-2"
            >
              <Trash2 className="w-5 h-5 text-status-error" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
