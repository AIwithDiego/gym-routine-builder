"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { NumberStepper } from "@/components/ui/number-stepper";
import { Input } from "@/components/ui/input";
import type { RoutineItemWithMachine, RoutineItemFormData } from "@/types";

interface RoutineItemFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: RoutineItemFormData) => void;
  item?: RoutineItemWithMachine;
  machineName: string;
  machineId: string;
}

export function RoutineItemForm({
  isOpen,
  onClose,
  onSave,
  item,
  machineName,
  machineId,
}: RoutineItemFormProps) {
  const [sets, setSets] = useState(item?.sets || 3);
  const [reps, setReps] = useState(item?.reps || 10);
  const [restSeconds, setRestSeconds] = useState(item?.rest_seconds || 60);
  const [defaultWeight, setDefaultWeight] = useState(
    item?.default_weight?.toString() || ""
  );

  const handleSave = () => {
    onSave({
      machine_id: machineId,
      sets,
      reps,
      rest_seconds: restSeconds,
      default_weight: defaultWeight ? parseFloat(defaultWeight) : undefined,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={machineName}>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <NumberStepper
            label="Sets"
            value={sets}
            onChange={setSets}
            min={1}
            max={10}
          />
          <NumberStepper
            label="Reps"
            value={reps}
            onChange={setReps}
            min={1}
            max={50}
          />
        </div>

        <NumberStepper
          label="Rest Time"
          value={restSeconds}
          onChange={setRestSeconds}
          min={15}
          max={300}
          step={15}
          unit="sec"
        />

        <Input
          label="Default Weight (optional)"
          type="number"
          placeholder="e.g., 50"
          value={defaultWeight}
          onChange={(e) => setDefaultWeight(e.target.value)}
        />

        <Button onClick={handleSave} className="w-full" size="lg">
          {item ? "Update" : "Add Machine"}
        </Button>
      </div>
    </Modal>
  );
}
