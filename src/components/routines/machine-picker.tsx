"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import type { Machine } from "@/types";

interface MachinePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (machine: Machine) => void;
}

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

export function MachinePicker({
  isOpen,
  onClose,
  onSelect,
}: MachinePickerProps) {
  const [search, setSearch] = useState("");

  const { data: machines, isLoading } = useQuery({
    queryKey: ["machines"],
    queryFn: fetchMachines,
    enabled: isOpen,
  });

  const filteredMachines = machines?.filter((machine) => {
    const q = search.toLowerCase();
    return (
      machine.name.toLowerCase().includes(q) ||
      (machine.brand && machine.brand.toLowerCase().includes(q))
    );
  });

  const groupedMachines = filteredMachines?.reduce(
    (acc, machine) => {
      if (!acc[machine.category]) {
        acc[machine.category] = [];
      }
      acc[machine.category].push(machine);
      return acc;
    },
    {} as Record<string, Machine[]>
  );

  const handleSelect = (machine: Machine) => {
    onSelect(machine);
    setSearch("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Machine">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
          <input
            type="text"
            placeholder="Search machines..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 pl-12 pr-4 bg-bg-input text-text-primary rounded-xl border border-border-default placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-green focus:border-transparent"
            autoFocus
          />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-14 bg-bg-input rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : groupedMachines && Object.keys(groupedMachines).length > 0 ? (
          <div className="space-y-6 max-h-[60vh] overflow-y-auto">
            {categoryOrder.map((category) => {
              const categoryMachines = groupedMachines[category];
              if (!categoryMachines || categoryMachines.length === 0)
                return null;

              return (
                <div key={category}>
                  <h3 className="text-sm font-medium text-text-secondary mb-2">
                    {categoryLabels[category]}
                  </h3>
                  <div className="space-y-2">
                    {categoryMachines.map((machine) => (
                      <button
                        key={machine.id}
                        onClick={() => handleSelect(machine)}
                        className={cn(
                          "w-full p-4 text-left bg-bg-input rounded-xl",
                          "border border-border-default",
                          "hover:bg-bg-card transition-colors tap-highlight-none",
                          "flex items-center justify-between"
                        )}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-text-primary">
                            {machine.name}
                          </span>
                          {machine.brand && (
                            <span className="text-sm text-text-secondary">
                              {machine.brand}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-text-secondary py-8">
            No machines found
          </p>
        )}
      </div>
    </Modal>
  );
}
