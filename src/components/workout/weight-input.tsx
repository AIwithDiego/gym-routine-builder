"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeightInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

const quickAdjustments = [
  { label: "-5", value: -5 },
  { label: "-2.5", value: -2.5 },
  { label: "+2.5", value: 2.5 },
  { label: "+5", value: 5 },
];

export function WeightInput({ value, onChange, className }: WeightInputProps) {
  const handleQuickAdjust = (adjustment: number) => {
    const newValue = Math.max(0, value + adjustment);
    onChange(newValue);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-center gap-6">
        <button
          type="button"
          onClick={() => handleQuickAdjust(-5)}
          className="w-14 h-14 flex items-center justify-center rounded-2xl bg-bg-input border border-border-default text-text-primary hover:bg-bg-card transition-colors tap-highlight-none"
        >
          <Minus className="w-6 h-6" />
        </button>

        <div className="flex items-baseline gap-1">
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-24 text-center text-4xl font-bold bg-transparent text-text-primary focus:outline-none"
          />
          <span className="text-lg text-text-secondary">kg</span>
        </div>

        <button
          type="button"
          onClick={() => handleQuickAdjust(5)}
          className="w-14 h-14 flex items-center justify-center rounded-2xl bg-bg-input border border-border-default text-text-primary hover:bg-bg-card transition-colors tap-highlight-none"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <div className="flex justify-center gap-2">
        {quickAdjustments.map((adj) => (
          <button
            key={adj.label}
            type="button"
            onClick={() => handleQuickAdjust(adj.value)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium",
              "bg-bg-input border border-border-default",
              "text-text-secondary hover:text-text-primary hover:bg-bg-card",
              "transition-colors tap-highlight-none"
            )}
          >
            {adj.label}
          </button>
        ))}
      </div>
    </div>
  );
}
