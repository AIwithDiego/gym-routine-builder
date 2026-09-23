"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { formatTime } from "@/lib/utils";

interface RestTimerProps {
  timeRemaining: number;
  totalTime: number;
  isPaused: boolean;
  onTick: () => void;
}

export function RestTimer({
  timeRemaining,
  totalTime,
  isPaused,
  onTick,
}: RestTimerProps) {
  useEffect(() => {
    if (isPaused || timeRemaining <= 0) return;

    const interval = setInterval(onTick, 1000);
    return () => clearInterval(interval);
  }, [isPaused, timeRemaining, onTick]);

  const progress = totalTime > 0 ? timeRemaining / totalTime : 0;
  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference * (1 - progress);

  const isComplete = timeRemaining <= 0;

  return (
    <div className="relative w-64 h-64 mx-auto">
      {/* Background circle */}
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="128"
          cy="128"
          r="120"
          fill="none"
          stroke="var(--bg-input)"
          strokeWidth="8"
        />
        {/* Progress circle */}
        <motion.circle
          cx="128"
          cy="128"
          r="120"
          fill="none"
          stroke={isComplete ? "var(--accent-green)" : "var(--accent-green)"}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: 0 }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.3, ease: "linear" }}
        />
      </svg>

      {/* Timer display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`text-5xl font-bold ${
            isComplete ? "text-accent-green" : "text-text-primary"
          }`}
        >
          {formatTime(timeRemaining)}
        </span>
        <span className="text-text-secondary mt-1">
          {isPaused ? "Paused" : isComplete ? "Ready!" : "Rest"}
        </span>
      </div>
    </div>
  );
}
