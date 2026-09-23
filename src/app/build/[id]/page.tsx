"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ArrowLeft, Plus, Check, Dumbbell } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { MachinePicker } from "@/components/routines/machine-picker";
import { RoutineItemCard } from "@/components/routines/routine-item-card";
import { RoutineItemForm } from "@/components/routines/routine-item-form";
import type {
  RoutineWithItems,
  Machine,
  RoutineItemWithMachine,
  RoutineItemFormData,
} from "@/types";

const routineSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  notes: z.string().max(500).optional(),
});

type RoutineFormData = z.infer<typeof routineSchema>;

async function fetchRoutine(id: string): Promise<RoutineWithItems> {
  const res = await fetch(`/api/routines/${id}`);
  if (!res.ok) throw new Error("Failed to fetch routine");
  return res.json();
}

async function updateRoutine(
  id: string,
  data: RoutineFormData
): Promise<RoutineWithItems> {
  const res = await fetch(`/api/routines/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update routine");
  return res.json();
}

async function addRoutineItem(
  routineId: string,
  data: RoutineItemFormData
): Promise<RoutineItemWithMachine> {
  const res = await fetch(`/api/routines/${routineId}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to add item");
  return res.json();
}

async function updateRoutineItem(
  itemId: string,
  data: RoutineItemFormData
): Promise<RoutineItemWithMachine> {
  const res = await fetch(`/api/routine-items/${itemId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update item");
  return res.json();
}

async function deleteRoutineItem(itemId: string): Promise<void> {
  const res = await fetch(`/api/routine-items/${itemId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete item");
}

async function reorderItems(
  routineId: string,
  itemIds: string[]
): Promise<void> {
  const res = await fetch(`/api/routines/${routineId}/reorder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemIds }),
  });
  if (!res.ok) throw new Error("Failed to reorder items");
}

export default function BuildDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const routineId = params.id as string;

  const [showMachinePicker, setShowMachinePicker] = useState(false);
  const [editingItem, setEditingItem] = useState<RoutineItemWithMachine | null>(
    null
  );
  const [newMachine, setNewMachine] = useState<Machine | null>(null);
  const [items, setItems] = useState<RoutineItemWithMachine[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: routine, isLoading } = useQuery({
    queryKey: ["routine", routineId],
    queryFn: () => fetchRoutine(routineId),
  });

  // Initialize items from fetched routine data (once). Adjusting state during
  // render instead of in an effect avoids an extra render pass.
  const [isInitialized, setIsInitialized] = useState(false);
  if (routine?.routine_items && !isInitialized) {
    setItems(routine.routine_items);
    setIsInitialized(true);
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RoutineFormData>({
    resolver: zodResolver(routineSchema),
    values: routine ? { name: routine.name, notes: routine.notes || "" } : undefined,
  });

  const updateRoutineMutation = useMutation({
    mutationFn: (data: RoutineFormData) => updateRoutine(routineId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routines"] });
      queryClient.invalidateQueries({ queryKey: ["routine", routineId] });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: (data: RoutineItemFormData) => addRoutineItem(routineId, data),
    onSuccess: (newItem) => {
      setItems((prev) => [...prev, newItem]);
      queryClient.invalidateQueries({ queryKey: ["routine", routineId] });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({
      itemId,
      data,
    }: {
      itemId: string;
      data: RoutineItemFormData;
    }) => updateRoutineItem(itemId, data),
    onSuccess: (updatedItem) => {
      setItems((prev) =>
        prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
      );
      queryClient.invalidateQueries({ queryKey: ["routine", routineId] });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: deleteRoutineItem,
    onSuccess: (_, itemId) => {
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      queryClient.invalidateQueries({ queryKey: ["routine", routineId] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (itemIds: string[]) => reorderItems(routineId, itemIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routine", routineId] });
    },
  });

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        setItems((items) => {
          const oldIndex = items.findIndex((item) => item.id === active.id);
          const newIndex = items.findIndex((item) => item.id === over.id);
          const newItems = arrayMove(items, oldIndex, newIndex);
          reorderMutation.mutate(newItems.map((item) => item.id));
          return newItems;
        });
      }
    },
    [reorderMutation]
  );

  const handleMachineSelect = (machine: Machine) => {
    setNewMachine(machine);
  };

  const handleAddItem = (data: RoutineItemFormData) => {
    addItemMutation.mutate(data);
    setNewMachine(null);
  };

  const handleUpdateItem = (data: RoutineItemFormData) => {
    if (editingItem) {
      updateItemMutation.mutate({ itemId: editingItem.id, data });
      setEditingItem(null);
    }
  };

  const handleDeleteItem = (itemId: string) => {
    if (confirm("Remove this machine from the routine?")) {
      deleteItemMutation.mutate(itemId);
    }
  };

  const onSubmit = async (data: RoutineFormData) => {
    await updateRoutineMutation.mutateAsync(data);
    router.push(`/routines/${routineId}`);
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-12 bg-bg-card rounded-xl animate-pulse" />
        <div className="h-24 bg-bg-card rounded-2xl animate-pulse" />
        <div className="h-64 bg-bg-card rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <header className="flex items-center gap-4 pt-2">
        <Link
          href="/routines"
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-bg-card transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-text-primary" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-text-primary">Edit Routine</h1>
        </div>
        <Button
          onClick={handleSubmit(onSubmit)}
          disabled={updateRoutineMutation.isPending}
          size="sm"
        >
          <Check className="w-4 h-4 mr-1" />
          Save
        </Button>
      </header>

      <form className="space-y-4">
        <Input
          label="Routine Name"
          placeholder="e.g., Upper Body Day"
          error={errors.name?.message}
          {...register("name")}
        />

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Notes (optional)
          </label>
          <textarea
            className="w-full h-20 px-4 py-3 bg-bg-input text-text-primary rounded-xl border border-border-default placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-green focus:border-transparent resize-none"
            placeholder="Any notes about this routine..."
            {...register("notes")}
          />
        </div>
      </form>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">
            Machines ({items.length})
          </h2>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowMachinePicker(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>

        {items.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {items.map((item, index) => (
                  <RoutineItemCard
                    key={item.id}
                    item={item}
                    index={index}
                    onEdit={() => setEditingItem(item)}
                    onDelete={() => handleDeleteItem(item.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <Dumbbell className="w-8 h-8 text-text-secondary mx-auto mb-2" />
              <p className="text-text-secondary">No machines added yet</p>
              <button
                onClick={() => setShowMachinePicker(true)}
                className="text-accent-green text-sm mt-1"
              >
                Add your first machine
              </button>
            </CardContent>
          </Card>
        )}
      </section>

      <MachinePicker
        isOpen={showMachinePicker}
        onClose={() => setShowMachinePicker(false)}
        onSelect={handleMachineSelect}
      />

      {newMachine && (
        <RoutineItemForm
          isOpen={true}
          onClose={() => setNewMachine(null)}
          onSave={handleAddItem}
          machineName={newMachine.name}
          machineId={newMachine.id}
        />
      )}

      {editingItem && (
        <RoutineItemForm
          isOpen={true}
          onClose={() => setEditingItem(null)}
          onSave={handleUpdateItem}
          item={editingItem}
          machineName={editingItem.machine.name}
          machineId={editingItem.machine_id}
        />
      )}
    </div>
  );
}
