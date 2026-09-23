"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Trophy,
  Flame,
  Weight,
  Clock,
  Calendar,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface MachineProgress {
  machine_id: string;
  machine_name: string;
  brand: string | null;
  category: string;
  sessions_count: number;
  first_weight: number;
  latest_weight: number;
  max_weight: number;
}

interface MetricsData {
  total_workouts: number;
  total_volume: number;
  avg_duration_minutes: number;
  total_duration_minutes: number;
  workouts_this_week: number;
  current_streak: number;
  machine_progress: MachineProgress[];
}

async function fetchMetrics(): Promise<MetricsData> {
  const res = await fetch("/api/workouts/metrics");
  if (!res.ok) throw new Error("Failed to fetch metrics");
  return res.json();
}

const categoryLabels: Record<string, string> = {
  upper: "Upper Body",
  lower: "Lower Body",
  core: "Core",
  cardio: "Cardio",
};

const categoryOrder = ["upper", "lower", "core", "cardio"];

export default function MetricsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["metrics"],
    queryFn: fetchMetrics,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-10 bg-bg-card rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-bg-card rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-8 bg-bg-card rounded-xl animate-pulse" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-bg-card rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.total_workouts === 0) {
    return (
      <div className="p-4 space-y-6">
        <header className="pt-2">
          <h1 className="text-2xl font-bold text-text-primary">Metrics</h1>
          <p className="text-sm text-text-secondary">
            Track your workout progress
          </p>
        </header>
        <Card>
          <CardContent className="text-center py-12">
            <Trophy className="w-10 h-10 text-text-secondary mx-auto mb-3" />
            <p className="text-text-primary font-medium">No workouts yet</p>
            <p className="text-sm text-text-secondary mt-1">
              Complete your first workout to see stats here
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group machines by category
  const grouped = new Map<string, MachineProgress[]>();
  for (const mp of data.machine_progress) {
    const cat = mp.category;
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(mp);
  }

  return (
    <div className="p-4 space-y-6">
      <header className="pt-2">
        <h1 className="text-2xl font-bold text-text-primary">Metrics</h1>
        <p className="text-sm text-text-secondary">
          Track your workout progress
        </p>
      </header>

      {/* Overview cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-accent-green" />
              <span className="text-xs text-text-secondary">Total Workouts</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">
              {data.total_workouts}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-1">
              <Weight className="w-4 h-4 text-accent-green" />
              <span className="text-xs text-text-secondary">Total Volume</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">
              {data.total_volume.toLocaleString()}{" "}
              <span className="text-sm font-normal text-text-secondary">kg</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-accent-green" />
              <span className="text-xs text-text-secondary">Avg Duration</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">
              {data.avg_duration_minutes}{" "}
              <span className="text-sm font-normal text-text-secondary">min</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-4 h-4 text-accent-green" />
              <span className="text-xs text-text-secondary">Streak</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">
              {data.current_streak}{" "}
              <span className="text-sm font-normal text-text-secondary">
                {data.current_streak === 1 ? "day" : "days"}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* This week summary */}
      <Card>
        <CardContent className="py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-accent-green" />
            <span className="text-sm text-text-secondary">This week</span>
          </div>
          <span className="text-lg font-semibold text-text-primary">
            {data.workouts_this_week}{" "}
            <span className="text-sm font-normal text-text-secondary">
              {data.workouts_this_week === 1 ? "workout" : "workouts"}
            </span>
          </span>
        </CardContent>
      </Card>

      {/* Machine progress */}
      {data.machine_progress.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-accent-green" />
            <h2 className="text-lg font-semibold text-text-primary">
              Machine Progress
            </h2>
          </div>

          <div className="space-y-6">
            {categoryOrder
              .filter((cat) => grouped.has(cat))
              .map((cat) => (
                <div key={cat}>
                  <h3 className="text-sm font-medium text-text-secondary mb-2 uppercase tracking-wide">
                    {categoryLabels[cat] || cat}
                  </h3>
                  <div className="space-y-2">
                    {grouped.get(cat)!.map((mp) => (
                      <Card key={mp.machine_id}>
                        <CardContent className="py-3">
                          <div className="flex items-center justify-between mb-1">
                            <div>
                              <span className="text-sm font-medium text-text-primary">
                                {mp.machine_name}
                              </span>
                              {mp.brand && (
                                <span className="text-xs text-text-secondary ml-2">
                                  {mp.brand}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-text-secondary">
                              {mp.sessions_count}{" "}
                              {mp.sessions_count === 1 ? "session" : "sessions"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-sm text-text-secondary">
                              {mp.first_weight} kg
                            </span>
                            <ArrowRight className="w-3 h-3 text-text-secondary" />
                            <span
                              className={`text-sm font-semibold ${
                                mp.latest_weight > mp.first_weight
                                  ? "text-accent-green"
                                  : mp.latest_weight < mp.first_weight
                                    ? "text-status-error"
                                    : "text-text-primary"
                              }`}
                            >
                              {mp.latest_weight} kg
                            </span>
                            {mp.max_weight > mp.latest_weight && (
                              <span className="text-xs text-text-secondary ml-auto">
                                PR: {mp.max_weight} kg
                              </span>
                            )}
                            {mp.max_weight === mp.latest_weight &&
                              mp.max_weight > mp.first_weight && (
                                <span className="text-xs text-accent-green ml-auto">
                                  PR!
                                </span>
                              )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
