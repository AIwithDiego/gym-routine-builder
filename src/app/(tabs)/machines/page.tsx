"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Play, Dumbbell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Machine } from "@/types";

async function fetchMachines(): Promise<Machine[]> {
  const res = await fetch("/api/machines");
  if (!res.ok) throw new Error("Failed to fetch machines");
  return res.json();
}

const categoryLabels: Record<string, string> = {
  upper: "Upper Body",
  lower: "Lower Body",
  core: "Core",
  cardio: "Cardio",
};

const categoryOrder = ["upper", "lower", "core", "cardio"];

export default function MachinesPage() {
  const [search, setSearch] = useState("");

  const {
    data: machines,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["machines"],
    queryFn: fetchMachines,
  });

  const filtered = machines?.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      (m.brand && m.brand.toLowerCase().includes(q))
    );
  });

  const grouped = filtered?.reduce(
    (acc, machine) => {
      if (!acc[machine.category]) acc[machine.category] = [];
      acc[machine.category].push(machine);
      return acc;
    },
    {} as Record<string, Machine[]>
  );

  return (
    <div className="p-4 space-y-6">
      <header className="pt-2">
        <h1 className="text-2xl font-bold text-text-primary">Machines</h1>
        <p className="text-text-secondary">FlyeFit gym equipment guide</p>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
        <input
          type="text"
          placeholder="Search by name or brand..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-12 pl-12 pr-4 bg-bg-input text-text-primary rounded-xl border border-border-default placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-green focus:border-transparent"
        />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-bg-card rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-status-error">Failed to load machines</p>
        </div>
      ) : grouped && Object.keys(grouped).length > 0 ? (
        <div className="space-y-8">
          {categoryOrder.map((category) => {
            const items = grouped[category];
            if (!items || items.length === 0) return null;

            return (
              <section key={category}>
                <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-3">
                  {categoryLabels[category]} ({items.length})
                </h2>
                <div className="space-y-3">
                  {items.map((machine) => (
                    <Card key={machine.id}>
                      <CardContent className="p-4">
                        <div className="flex gap-3">
                          <div className="w-10 h-10 rounded-xl bg-bg-input flex items-center justify-center shrink-0 mt-0.5">
                            <Dumbbell className="w-5 h-5 text-accent-green" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-text-primary">
                              {machine.name}
                            </h3>
                            {machine.brand && (
                              <p className="text-sm text-accent-green">
                                {machine.brand}
                              </p>
                            )}
                            {machine.description && (
                              <p className="text-sm text-text-secondary mt-1">
                                {machine.description}
                              </p>
                            )}
                            {machine.video_url && (
                              <a
                                href={machine.video_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm text-accent-green hover:underline mt-2"
                              >
                                <Play className="w-3.5 h-3.5" />
                                How to use
                              </a>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <p className="text-center text-text-secondary py-8">
          No machines found
        </p>
      )}
    </div>
  );
}
