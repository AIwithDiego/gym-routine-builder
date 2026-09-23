"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StartWorkoutButtonProps {
  routineId: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StartWorkoutButton({
  routineId,
  size = "md",
  className,
}: StartWorkoutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleStart = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/workouts/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routineId }),
      });

      if (!res.ok) {
        throw new Error("Failed to start workout");
      }

      const session = await res.json();
      router.push(`/workout/${session.id}`);
    } catch (error) {
      console.error("Error starting workout:", error);
      alert("Failed to start workout. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleStart}
      isLoading={isLoading}
      size={size}
      className={className}
    >
      {!isLoading && <Play className="w-4 h-4 mr-1" />}
      Start
    </Button>
  );
}
