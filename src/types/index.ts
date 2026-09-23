export interface Machine {
  id: string;
  name: string;
  category: 'upper' | 'lower' | 'core' | 'cardio';
  brand: string | null;
  description: string | null;
  video_url: string | null;
}

/** Day-of-week index matching JS Date.getDay() and Postgres EXTRACT(DOW).
 *  0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday,
 *  4 = Thursday, 5 = Friday, 6 = Saturday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Routine {
  id: string;
  name: string;
  notes: string | null;
  assigned_weekdays: Weekday[];
  created_at: string;
  updated_at: string;
}

export interface RoutineWithItems extends Routine {
  routine_items: RoutineItemWithMachine[];
}

export interface RoutineItem {
  id: string;
  routine_id: string;
  machine_id: string;
  position: number;
  sets: number;
  reps: number;
  rest_seconds: number;
  default_weight: number | null;
}

export interface RoutineItemWithMachine extends RoutineItem {
  machine: Machine;
  /** Most recent recorded weight for this routine_item across completed sessions.
   *  Populated only by GET /api/routines/[id]. Null when no history exists;
   *  undefined when fetched via an endpoint that doesn't enrich. */
  last_weight?: number | null;
  /** Most recent actual_reps recorded for this routine_item.
   *  For cardio rows, this is duration in minutes. */
  last_actual_reps?: number | null;
  /** ISO timestamp of when last_weight was recorded. */
  last_recorded_at?: string | null;
}

export interface WorkoutSession {
  id: string;
  /** Null when the parent routine was deleted (ON DELETE SET NULL). */
  routine_id: string | null;
  started_at: string;
  ended_at: string | null;
  status: 'in_progress' | 'completed' | 'abandoned';
}

export interface WorkoutSessionWithRoutine extends WorkoutSession {
  routine: Routine | null;
}

export interface WorkoutSet {
  id: string;
  session_id: string;
  routine_item_id: string;
  set_number: number;
  target_reps: number;
  actual_reps: number | null;
  weight: number;
  completed_at: string;
}

export interface WorkoutSetWithItem extends WorkoutSet {
  routine_item: RoutineItemWithMachine;
}

export interface WorkoutSessionWithDetails extends WorkoutSession {
  routine: Routine | null;
  workout_sets: WorkoutSet[];
  routine_items: RoutineItemWithMachine[];
  duration_minutes: number;
  total_weight: number;
}

// Form types
export interface RoutineFormData {
  name: string;
  notes?: string;
}

export interface RoutineItemFormData {
  machine_id: string;
  sets: number;
  reps: number;
  rest_seconds: number;
  default_weight?: number;
}

// Workout player state
export type WorkoutPhase = 'idle' | 'working' | 'resting' | 'hydrating' | 'summary';

export interface WorkoutPlayerState {
  sessionId: string | null;
  phase: WorkoutPhase;
  currentItemIndex: number;
  currentSetNumber: number;
  items: RoutineItemWithMachine[];
  completedSets: WorkoutSet[];
  restTimeRemaining: number;
  isPaused: boolean;
}
