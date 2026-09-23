"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Routine } from "@/types";

const routineSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  notes: z.string().max(500).optional(),
});

type RoutineFormData = z.infer<typeof routineSchema>;

async function createRoutine(data: RoutineFormData): Promise<Routine> {
  const res = await fetch("/api/routines", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create routine");
  return res.json();
}

export default function BuildPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RoutineFormData>({
    resolver: zodResolver(routineSchema),
    defaultValues: {
      name: "",
      notes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: createRoutine,
    onSuccess: (routine) => {
      queryClient.invalidateQueries({ queryKey: ["routines"] });
      router.push(`/build/${routine.id}`);
    },
  });

  const onSubmit = async (data: RoutineFormData) => {
    setIsSubmitting(true);
    try {
      await mutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <header className="flex items-center gap-4 pt-2">
        <Link
          href="/routines"
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-bg-card transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-text-primary" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-text-primary">New Routine</h1>
          <p className="text-sm text-text-secondary">Create a workout plan</p>
        </div>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
            className="w-full h-24 px-4 py-3 bg-bg-input text-text-primary rounded-xl border border-border-default placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-green focus:border-transparent resize-none"
            placeholder="Any notes about this routine..."
            {...register("notes")}
          />
          {errors.notes && (
            <p className="mt-1 text-sm text-status-error">
              {errors.notes.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={isSubmitting}
        >
          Continue to Add Machines
        </Button>
      </form>
    </div>
  );
}
