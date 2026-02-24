export type Exercise = {
  id: string;
  name: string;
  bodyPart: string;
};

export type Workout = {
  id: string;
  /**
   * ISO-8601 datetime string representing when the workout started.
   */
  startedAt: string;
  note?: string;
  /** Bodyweight in kg at the time of the workout (optional). */
  bodyweightKg?: number;
};

export type SetEntry = {
  id: string;
  workoutId: string;
  exerciseId: string;
  weightKg: number;
  reps: number;
  /**
   * Order of the set within the workout (0-based).
   */
  order: number;
  /**
   * Optional subjective feeling for this set (e.g. "アップ", "良い感じ", "きつい").
   */
  feeling?: string;
};

