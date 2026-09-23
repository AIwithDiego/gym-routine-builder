"use client";

import { useState } from "react";
import { Dumbbell, Play, Timer, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WeightInput } from "./weight-input";
import { cn } from "@/lib/utils";
import type { RoutineItemWithMachine } from "@/types";

interface WorkSetScreenProps {
  item: RoutineItemWithMachine;
  currentSet: number;
  totalSets: number;
  weight: number;
  onWeightChange: (weight: number) => void;
  onComplete: () => void;
  isLoading?: boolean;
}

function isCardio(item: RoutineItemWithMachine): boolean {
  return item.machine.category === "cardio";
}

function CardioDurationInput({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-center gap-6">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, value - 5))}
          className="w-14 h-14 flex items-center justify-center rounded-2xl bg-bg-input border border-border-default text-text-primary hover:bg-bg-card transition-colors tap-highlight-none"
        >
          <Minus className="w-6 h-6" />
        </button>

        <div className="flex items-baseline gap-1">
          <input
            type="number"
            value={value}
            onChange={(e) =>
              onChange(Math.max(1, parseInt(e.target.value) || 1))
            }
            className="w-24 text-center text-4xl font-bold bg-transparent text-text-primary focus:outline-none"
          />
          <span className="text-lg text-text-secondary">min</span>
        </div>

        <button
          type="button"
          onClick={() => onChange(value + 5)}
          className="w-14 h-14 flex items-center justify-center rounded-2xl bg-bg-input border border-border-default text-text-primary hover:bg-bg-card transition-colors tap-highlight-none"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <div className="flex justify-center gap-2">
        {[5, 10, 15, 20, 30].map((mins) => (
          <button
            key={mins}
            type="button"
            onClick={() => onChange(mins)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium",
              "bg-bg-input border border-border-default",
              "text-text-secondary hover:text-text-primary hover:bg-bg-card",
              "transition-colors tap-highlight-none",
              value === mins && "border-accent-green text-accent-green"
            )}
          >
            {mins}m
          </button>
        ))}
      </div>
    </div>
  );
}

export function WorkSetScreen({
  item,
  currentSet,
  totalSets,
  weight,
  onWeightChange,
  onComplete,
  isLoading = false,
}: WorkSetScreenProps) {
  const cardio = isCardio(item);
  const [duration, setDuration] = useState(20);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-16 h-16 rounded-2xl bg-bg-card border border-border-default flex items-center justify-center mb-6">
          {cardio ? (
            <Timer className="w-8 h-8 text-accent-green" />
          ) : (
            <Dumbbell className="w-8 h-8 text-accent-green" />
          )}
        </div>

        <h1 className="text-2xl font-bold text-text-primary text-center mb-2">
          {item.machine.name}
        </h1>

        {cardio ? (
          <p className="text-text-secondary text-center mb-4">Cardio</p>
        ) : (
          <p className="text-text-secondary text-center mb-4">
            Set {currentSet} of {totalSets} · {item.reps} reps
          </p>
        )}

        {item.machine.video_url && (
          <a
            href={item.machine.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-accent-green hover:underline mb-8"
          >
            <Play className="w-4 h-4" />
            How to use this machine
          </a>
        )}

        {cardio ? (
          <CardioDurationInput
            value={duration}
            onChange={setDuration}
            className="mb-auto"
          />
        ) : (
          <WeightInput
            value={weight}
            onChange={onWeightChange}
            className="mb-auto"
          />
        )}
      </div>

      <div className="p-6 pb-safe">
        <Button
          onClick={onComplete}
          className="w-full"
          size="lg"
          isLoading={isLoading}
        >
          {cardio ? "Complete" : "Complete Set"}
        </Button>
      </div>
    </div>
  );
}
