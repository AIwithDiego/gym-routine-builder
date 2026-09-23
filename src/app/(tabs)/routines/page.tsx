"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, List } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { RoutineCard } from "@/components/routines/routine-card";
import type { RoutineWithItems } from "@/types";

async function fetchRoutines(): Promise<RoutineWithItems[]> {
  const res = await fetch("/api/routines");
  if (!res.ok) throw new Error("Failed to fetch routines");
  return res.json();
}

export default function RoutinesPage() {
  const {
    data: routines,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["routines"],
    queryFn: fetchRoutines,
  });

  return (
    <div className="p-4 space-y-6">
      <header className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Routines</h1>
          <p className="text-text-secondary">Your workout plans</p>
        </div>
        <Link href="/build">
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
        </Link>
      </header>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-bg-card rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-status-error">Failed to load routines</p>
        </div>
      ) : routines && routines.length > 0 ? (
        <div className="space-y-4">
          {routines.map((routine) => (
            <RoutineCard key={routine.id} routine={routine} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={List}
          title="No routines yet"
          description="Create your first workout routine to get started"
          action={
            <Link href="/build">
              <Button>
                <Plus className="w-4 h-4 mr-1" />
                Create Routine
              </Button>
            </Link>
          }
        />
      )}
    </div>
  );
}
