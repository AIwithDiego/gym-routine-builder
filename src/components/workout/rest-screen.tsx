"use client";

import { Pause, Play, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RestTimer } from "./rest-timer";
import { cn } from "@/lib/utils";

interface RestScreenProps {
  timeRemaining: number;
  totalTime: number;
  isPaused: boolean;
  nextMachineName?: string;
  onTick: () => void;
  onAdjust: (seconds: number) => void;
  onTogglePause: () => void;
  onSkip: () => void;
}

export function RestScreen({
  timeRemaining,
  totalTime,
  isPaused,
  nextMachineName,
  onTick,
  onAdjust,
  onTogglePause,
  onSkip,
}: RestScreenProps) {
  const isComplete = timeRemaining <= 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <h1 className="text-xl font-semibold text-text-secondary mb-8">
          Rest Time
        </h1>

        <RestTimer
          timeRemaining={timeRemaining}
          totalTime={totalTime}
          isPaused={isPaused}
          onTick={onTick}
        />

        <div className="flex items-center gap-3 mt-8">
          <button
            onClick={() => onAdjust(-15)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium",
              "bg-bg-input border border-border-default",
              "text-text-secondary hover:text-text-primary hover:bg-bg-card",
              "transition-colors tap-highlight-none"
            )}
          >
            -15s
          </button>

          <button
            onClick={onTogglePause}
            className={cn(
              "w-14 h-14 flex items-center justify-center rounded-full",
              "bg-bg-input border border-border-default",
              "text-text-primary hover:bg-bg-card",
              "transition-colors tap-highlight-none"
            )}
          >
            {isPaused ? (
              <Play className="w-6 h-6" />
            ) : (
              <Pause className="w-6 h-6" />
            )}
          </button>

          <button
            onClick={() => onAdjust(15)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium",
              "bg-bg-input border border-border-default",
              "text-text-secondary hover:text-text-primary hover:bg-bg-card",
              "transition-colors tap-highlight-none"
            )}
          >
            +15s
          </button>
        </div>

        {nextMachineName && (
          <p className="text-text-secondary text-sm mt-8">
            Next: <span className="text-text-primary">{nextMachineName}</span>
          </p>
        )}
      </div>

      <div className="p-6 pb-safe">
        <Button
          onClick={onSkip}
          className="w-full"
          size="lg"
          variant={isComplete ? "primary" : "secondary"}
        >
          {isComplete ? (
            <>
              <SkipForward className="w-5 h-5 mr-2" />
              Continue
            </>
          ) : (
            "Skip Rest"
          )}
        </Button>
      </div>
    </div>
  );
}
