"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  unit?: string;
  className?: string;
}

export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  label,
  unit,
  className,
}: NumberStepperProps) {
  const handleDecrement = () => {
    const newValue = Math.max(min, value - step);
    onChange(newValue);
  };

  const handleIncrement = () => {
    const newValue = Math.min(max, value + step);
    onChange(newValue);
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <span className="text-sm font-medium text-text-secondary">{label}</span>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          className={cn(
            "w-11 h-11 flex items-center justify-center rounded-xl",
            "bg-bg-input border border-border-default",
            "text-text-primary hover:bg-bg-card",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-colors tap-highlight-none"
          )}
        >
          <Minus className="w-5 h-5" />
        </button>
        <div className="flex items-baseline gap-1 min-w-[60px] justify-center">
          <span className="text-2xl font-semibold text-text-primary">
            {value}
          </span>
          {unit && (
            <span className="text-sm text-text-secondary">{unit}</span>
          )}
        </div>
        <button
          type="button"
          onClick={handleIncrement}
          disabled={value >= max}
          className={cn(
            "w-11 h-11 flex items-center justify-center rounded-xl",
            "bg-bg-input border border-border-default",
            "text-text-primary hover:bg-bg-card",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-colors tap-highlight-none"
          )}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
