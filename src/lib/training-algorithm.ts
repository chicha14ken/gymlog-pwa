/**
 * Training Plan Algorithm
 *
 * Evidence-based programming engine for ageta.
 * Based on: Pelland et al. 2024, Schoenfeld 2017, Bell et al. 2024.
 * All logic is pure client-side functions with no external dependencies.
 */

import type { Exercise, SetEntry } from "@/domain/models";
import type { WorkoutWithSets } from "@/data/repository";
import { getDefaultStep } from "@/lib/weightStep";
import type {
  MuscleGroup,
  TrainingLevel,
  VolumeRecommendation,
  ProgressionSuggestion,
  FatigueScore,
  DeloadRecommendation,
  TrainingPlan,
} from "@/types/training";

// ── Volume targets per training level (sets/muscle/week) ─────────────
// Source: Schoenfeld 2017, Pelland 2024
type VolumeTarget = { minSets: number; targetSets: number; maxSets: number };

const VOLUME_TARGETS: Record<TrainingLevel, VolumeTarget> = {
  beginner:     { minSets: 4,  targetSets: 8,  maxSets: 12 },
  intermediate: { minSets: 8,  targetSets: 14, maxSets: 20 },
  advanced:     { minSets: 12, targetSets: 18, maxSets: 25 },
};

// ── Fractional muscle contribution map ───────────────────────────────
// Source: Pelland 2024 fractional volume method.
// Direct stimulus = 1.0, indirect = 0.5, minor = 0.3
type MuscleContribution = { muscle: MuscleGroup; contribution: number };

const EXERCISE_MUSCLE_MAP: Record<string, MuscleContribution[]> = {
  // ── 胸 ──────────────────────────────────────────────────────────
  "bench-press":          [{ muscle: "chest", contribution: 1.0 }, { muscle: "triceps", contribution: 0.5 }, { muscle: "shoulders", contribution: 0.3 }],
  "incline-bench":        [{ muscle: "chest", contribution: 1.0 }, { muscle: "triceps", contribution: 0.5 }, { muscle: "shoulders", contribution: 0.5 }],
  "decline-bench":        [{ muscle: "chest", contribution: 1.0 }, { muscle: "triceps", contribution: 0.5 }],
  "dumbbell-fly":         [{ muscle: "chest", contribution: 1.0 }, { muscle: "shoulders", contribution: 0.3 }],
  "cable-crossover":      [{ muscle: "chest", contribution: 1.0 }, { muscle: "shoulders", contribution: 0.3 }],
  "chest-press-machine":  [{ muscle: "chest", contribution: 1.0 }, { muscle: "triceps", contribution: 0.5 }, { muscle: "shoulders", contribution: 0.3 }],
  "pec-deck":             [{ muscle: "chest", contribution: 1.0 }],
  "push-up":              [{ muscle: "chest", contribution: 1.0 }, { muscle: "triceps", contribution: 0.5 }, { muscle: "shoulders", contribution: 0.3 }],
  // ── 背中 ────────────────────────────────────────────────────────
  "deadlift":             [{ muscle: "back", contribution: 1.0 }, { muscle: "legs", contribution: 0.5 }, { muscle: "core", contribution: 0.3 }],
  "barbell-row":          [{ muscle: "back", contribution: 1.0 }, { muscle: "biceps", contribution: 0.5 }],
  "cable-row":            [{ muscle: "back", contribution: 1.0 }, { muscle: "biceps", contribution: 0.5 }],
  "t-bar-row":            [{ muscle: "back", contribution: 1.0 }, { muscle: "biceps", contribution: 0.5 }],
  "pull-up":              [{ muscle: "back", contribution: 1.0 }, { muscle: "biceps", contribution: 0.5 }],
  "chin-up":              [{ muscle: "back", contribution: 1.0 }, { muscle: "biceps", contribution: 0.5 }],
  "lat-pulldown":         [{ muscle: "back", contribution: 1.0 }, { muscle: "biceps", contribution: 0.5 }],
  "face-pull":            [{ muscle: "back", contribution: 0.5 }, { muscle: "shoulders", contribution: 1.0 }],
  // ── 脚 ──────────────────────────────────────────────────────────
  "back-squat":           [{ muscle: "legs", contribution: 1.0 }, { muscle: "core", contribution: 0.3 }],
  "front-squat":          [{ muscle: "legs", contribution: 1.0 }, { muscle: "core", contribution: 0.5 }],
  "bulgarian-split-squat":[{ muscle: "legs", contribution: 1.0 }, { muscle: "core", contribution: 0.3 }],
  "hack-squat":           [{ muscle: "legs", contribution: 1.0 }],
  "sumo-squat":           [{ muscle: "legs", contribution: 1.0 }, { muscle: "core", contribution: 0.3 }],
  "leg-press":            [{ muscle: "legs", contribution: 1.0 }],
  "romanian-deadlift":    [{ muscle: "legs", contribution: 1.0 }, { muscle: "back", contribution: 0.5 }],
  "walking-lunge":        [{ muscle: "legs", contribution: 1.0 }, { muscle: "core", contribution: 0.3 }],
  "leg-curl":             [{ muscle: "legs", contribution: 1.0 }],
  "leg-extension":        [{ muscle: "legs", contribution: 1.0 }],
  "calf-raise":           [{ muscle: "legs", contribution: 0.5 }],
  "hip-thrust":           [{ muscle: "legs", contribution: 1.0 }, { muscle: "core", contribution: 0.3 }],
  "nordic-curl":          [{ muscle: "legs", contribution: 1.0 }],
  // ── 肩 ──────────────────────────────────────────────────────────
  "overhead-press":       [{ muscle: "shoulders", contribution: 1.0 }, { muscle: "triceps", contribution: 0.5 }],
  "push-press":           [{ muscle: "shoulders", contribution: 1.0 }, { muscle: "triceps", contribution: 0.5 }, { muscle: "legs", contribution: 0.3 }],
  "db-shoulder-press":    [{ muscle: "shoulders", contribution: 1.0 }, { muscle: "triceps", contribution: 0.5 }],
  "lateral-raise":        [{ muscle: "shoulders", contribution: 1.0 }],
  "front-raise":          [{ muscle: "shoulders", contribution: 1.0 }],
  "rear-delt-fly":        [{ muscle: "shoulders", contribution: 1.0 }, { muscle: "back", contribution: 0.3 }],
  "cable-lateral-raise":  [{ muscle: "shoulders", contribution: 1.0 }],
  // ── 上腕二頭筋 ──────────────────────────────────────────────────
  "barbell-curl":         [{ muscle: "biceps", contribution: 1.0 }],
  "dumbbell-curl":        [{ muscle: "biceps", contribution: 1.0 }],
  "hammer-curl":          [{ muscle: "biceps", contribution: 1.0 }],
  "concentration-curl":   [{ muscle: "biceps", contribution: 1.0 }],
  "cable-curl":           [{ muscle: "biceps", contribution: 1.0 }],
  "preacher-curl":        [{ muscle: "biceps", contribution: 1.0 }],
  // ── 上腕三頭筋 ──────────────────────────────────────────────────
  "tricep-extension":     [{ muscle: "triceps", contribution: 1.0 }],
  "dip":                  [{ muscle: "triceps", contribution: 1.0 }, { muscle: "chest", contribution: 0.5 }, { muscle: "shoulders", contribution: 0.3 }],
  "skull-crusher":        [{ muscle: "triceps", contribution: 1.0 }],
  "tricep-pushdown":      [{ muscle: "triceps", contribution: 1.0 }],
  "overhead-tricep-ext":  [{ muscle: "triceps", contribution: 1.0 }],
  "close-grip-bench":     [{ muscle: "triceps", contribution: 1.0 }, { muscle: "chest", contribution: 0.5 }],
  // ── 体幹 ────────────────────────────────────────────────────────
  "ab-wheel":             [{ muscle: "core", contribution: 1.0 }],
  "plank":                [{ muscle: "core", contribution: 1.0 }],
  "leg-raise":            [{ muscle: "core", contribution: 1.0 }],
  "hanging-leg-raise":    [{ muscle: "core", contribution: 1.0 }],
  "cable-crunch":         [{ muscle: "core", contribution: 1.0 }],
  "crunches":             [{ muscle: "core", contribution: 1.0 }],
  "dead-bug":             [{ muscle: "core", contribution: 1.0 }],
  "russian-twist":        [{ muscle: "core", contribution: 1.0 }],
};

// ── Helpers ───────────────────────────────────────────────────────────

function getWeekKey(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function getSetsFromLastDays(workoutsWithSets: WorkoutWithSets[], days: number): SetEntry[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const result: SetEntry[] = [];
  for (const { workout, sets } of workoutsWithSets) {
    if (new Date(workout.startedAt).getTime() >= cutoff) {
      result.push(...sets);
    }
  }
  return result;
}

// ── Training level estimation ─────────────────────────────────────────
// Source: design doc §2.2
function estimateE1rmProgressRate(workoutsWithSets: WorkoutWithSets[]): number {
  if (workoutsWithSets.length < 2) return 2.0; // Assume fast progress = beginner

  const weeklyBest = new Map<string, number>();
  for (const { workout, sets } of workoutsWithSets) {
    const wk = getWeekKey(new Date(workout.startedAt));
    const current = weeklyBest.get(wk) ?? 0;
    for (const s of sets) {
      if (s.weightKg > 0 && s.reps > 0) {
        const e1rm = s.weightKg * (1 + s.reps / 30);
        if (e1rm > current) weeklyBest.set(wk, e1rm);
      }
    }
  }

  const entries = Array.from(weeklyBest.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  if (entries.length < 2) return 2.0;

  const values = entries.map(([, v]) => v);
  const n = values.length;
  const half = Math.ceil(n / 2);
  const firstHalf = values.slice(0, half);
  const secondHalf = values.slice(half);
  if (secondHalf.length === 0) return 2.0;

  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  if (avgFirst <= 0) return 2.0;

  const spanWeeks = Math.max(half, 1);
  return ((avgSecond - avgFirst) / avgFirst / spanWeeks) * 100;
}

export function estimateTrainingLevel(
  totalWorkoutDays: number,
  trainingSpanWeeks: number,
  e1rmProgressRate: number,
): TrainingLevel {
  const consistencyScore = Math.min(totalWorkoutDays / 150, 1.0);
  const progressScore =
    e1rmProgressRate > 1.0 ? 0.0
    : e1rmProgressRate > 0.3 ? 0.5
    : 1.0;
  const combinedScore =
    consistencyScore * 0.4 +
    progressScore * 0.4 +
    Math.min(trainingSpanWeeks / 104, 1.0) * 0.2;

  if (combinedScore < 0.3) return "beginner";
  if (combinedScore < 0.7) return "intermediate";
  return "advanced";
}

// ── Fractional volume calculation ─────────────────────────────────────
// Source: Pelland 2024 — indirect sets counted as 0.5
export function calculateFractionalVolume(sets: SetEntry[]): Map<MuscleGroup, number> {
  const volumeByMuscle = new Map<MuscleGroup, number>();

  const setsByExercise = new Map<string, number>();
  for (const set of sets) {
    setsByExercise.set(set.exerciseId, (setsByExercise.get(set.exerciseId) ?? 0) + 1);
  }

  for (const [exerciseId, setCount] of setsByExercise) {
    const contributions = EXERCISE_MUSCLE_MAP[exerciseId] ?? [];
    for (const { muscle, contribution } of contributions) {
      volumeByMuscle.set(muscle, (volumeByMuscle.get(muscle) ?? 0) + setCount * contribution);
    }
  }

  return volumeByMuscle;
}

// ── Double progression ────────────────────────────────────────────────
// Source: design doc §2.4
export function decideProgression(
  exerciseId: string,
  exerciseName: string,
  exerciseType: string | undefined,
  recentSets: SetEntry[],
): ProgressionSuggestion | null {
  if (exerciseType === "bodyweight" || exerciseType === "timed") return null;
  if (recentSets.length === 0) return null;

  // Group sets by workout to identify last session
  const setsByWorkout = new Map<string, SetEntry[]>();
  for (const set of recentSets) {
    const arr = setsByWorkout.get(set.workoutId) ?? [];
    arr.push(set);
    setsByWorkout.set(set.workoutId, arr);
  }

  // Find most recent workout (by IDB insertion order via set.order as proxy)
  // We rely on the fact that workoutIds are UUID/timestamp-based
  const workoutIds = Array.from(setsByWorkout.keys());
  const lastWorkoutSets = setsByWorkout.get(workoutIds[workoutIds.length - 1]) ?? [];
  const validSets = lastWorkoutSets.filter((s) => s.weightKg > 0 && s.reps > 0);
  if (validSets.length === 0) return null;

  const avgReps = validSets.reduce((sum, s) => sum + s.reps, 0) / validSets.length;
  const currentWeight = validSets[validSets.length - 1].weightKg;
  const weightStep = getDefaultStep(exerciseName);
  const repRange = { min: 8, max: 12 };

  if (avgReps >= repRange.max) {
    return {
      exerciseId,
      exerciseName,
      action: "increase_weight",
      suggestedWeightKg: currentWeight + weightStep,
      suggestedReps: repRange.min,
      repRange,
      reason: `全セット${repRange.max}rep達成。${weightStep}kg増量を推奨`,
    };
  }

  if (avgReps >= repRange.min) {
    const nextReps = Math.min(Math.ceil(avgReps) + 1, repRange.max);
    return {
      exerciseId,
      exerciseName,
      action: "increase_reps",
      suggestedWeightKg: currentWeight,
      suggestedReps: nextReps,
      repRange,
      reason: `${Math.round(avgReps)}rep達成。次回${nextReps}repを目標に`,
    };
  }

  return {
    exerciseId,
    exerciseName,
    action: "maintain",
    suggestedWeightKg: currentWeight,
    suggestedReps: repRange.min,
    repRange,
    reason: `${repRange.min}rep未達。同じ重量で継続`,
  };
}

// ── Fatigue model ─────────────────────────────────────────────────────
// Source: Bell et al. 2024, design doc §2.5

function calculateE1rmTrend(sorted: WorkoutWithSets[]): number {
  const weeklyBest = new Map<string, number>();
  for (const { workout, sets } of sorted) {
    const wk = getWeekKey(new Date(workout.startedAt));
    const current = weeklyBest.get(wk) ?? 0;
    for (const s of sets) {
      if (s.weightKg > 0 && s.reps > 0) {
        const e1rm = s.weightKg * (1 + s.reps / 30);
        if (e1rm > current) weeklyBest.set(wk, e1rm);
      }
    }
  }

  const weeks = Array.from(weeklyBest.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  if (weeks.length < 3) return 1;

  const recent = weeks.slice(-2).map(([, v]) => v);
  const previous = weeks.slice(-4, -2).map(([, v]) => v);
  if (previous.length === 0) return 1;

  const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
  const avgPrev = previous.reduce((a, b) => a + b, 0) / previous.length;
  return avgRecent - avgPrev;
}

function recentVolumeVsBaseline(sorted: WorkoutWithSets[]): number {
  const now = Date.now();
  const cutoffRecent = now - 14 * 24 * 60 * 60 * 1000;
  const cutoffBaseline = now - 42 * 24 * 60 * 60 * 1000;

  let recentSets = 0;
  let baselineSets = 0;

  for (const { workout, sets } of sorted) {
    const t = new Date(workout.startedAt).getTime();
    if (t >= cutoffRecent) {
      recentSets += sets.length;
    } else if (t >= cutoffBaseline) {
      baselineSets += sets.length;
    }
  }

  if (baselineSets === 0) return 1;
  const recentPerWeek = recentSets / 2;
  const baselinePerWeek = baselineSets / 4;
  return baselinePerWeek > 0 ? recentPerWeek / baselinePerWeek : 1;
}

function calculateAvgRestBetweenSessions(sorted: WorkoutWithSets[]): number {
  if (sorted.length < 2) return 99;
  const dates = sorted.map((w) => new Date(w.workout.startedAt).getTime());
  let totalDays = 0;
  for (let i = 1; i < dates.length; i++) {
    totalDays += (dates[i] - dates[i - 1]) / (24 * 60 * 60 * 1000);
  }
  return totalDays / (dates.length - 1);
}

function countConsecutiveTrainingWeeks(sorted: WorkoutWithSets[]): number {
  if (sorted.length === 0) return 0;
  const weekKeys = new Set(sorted.map((w) => getWeekKey(new Date(w.workout.startedAt))));

  const checkDate = new Date();
  let count = 0;
  for (let i = 0; i < 52; i++) {
    if (weekKeys.has(getWeekKey(checkDate))) {
      count++;
      checkDate.setDate(checkDate.getDate() - 7);
    } else {
      break;
    }
  }
  return count;
}

export function assessFatigue(workoutsWithSets: WorkoutWithSets[]): FatigueScore {
  if (workoutsWithSets.length === 0) return { score: 0, shouldDeload: false, indicators: [] };

  const sorted = [...workoutsWithSets].sort(
    (a, b) => new Date(a.workout.startedAt).getTime() - new Date(b.workout.startedAt).getTime(),
  );

  const indicators: string[] = [];
  let score = 0;

  // ① e1RM performance trend
  const e1rmTrend = calculateE1rmTrend(sorted);
  if (e1rmTrend <= 0) {
    score += 30;
    indicators.push("主要リフトのe1RMが停滞または低下中");
  }

  // ② Volume spike vs baseline
  const volumeRatio = recentVolumeVsBaseline(sorted);
  if (volumeRatio > 1.2) {
    score += 20;
    indicators.push(`週間ボリュームが基準値の${Math.round(volumeRatio * 100)}%`);
  }

  // ③ Short rest between sessions
  const avgRestDays = calculateAvgRestBetweenSessions(sorted);
  if (avgRestDays > 0 && avgRestDays < 1.5) {
    score += 15;
    indicators.push(`セッション間の平均休息日が${avgRestDays.toFixed(1)}日と短い`);
  }

  // ④ Consecutive training weeks ≥ 6
  const consecutiveWeeks = countConsecutiveTrainingWeeks(sorted);
  if (consecutiveWeeks >= 6) {
    score += 20;
    indicators.push(`${consecutiveWeeks}週連続でトレーニング中`);
  }

  return {
    score: Math.min(score, 100),
    shouldDeload: score >= 60,
    indicators,
  };
}

// ── Deload prescription ───────────────────────────────────────────────
// Source: Bell et al. 2024, design doc §2.5
export function prescribeDeload(fatigueScore: number): DeloadRecommendation {
  if (fatigueScore >= 80) {
    return {
      durationDays: 7,
      volumeMultiplier: 0.4,
      intensityMultiplier: 0.7,
      keepFrequency: true,
    };
  }
  return {
    durationDays: 7,
    volumeMultiplier: 0.5,
    intensityMultiplier: 0.85,
    keepFrequency: true,
  };
}

// ── Main plan generation ──────────────────────────────────────────────

export function generateTrainingPlan(
  workoutsWithSets: WorkoutWithSets[],
  exercises: Exercise[],
): TrainingPlan {
  const exerciseMap = new Map(exercises.map((e) => [e.id, e]));

  const sorted = [...workoutsWithSets].sort(
    (a, b) => new Date(a.workout.startedAt).getTime() - new Date(b.workout.startedAt).getTime(),
  );

  // Estimate training level
  const totalWorkoutDays = workoutsWithSets.length;
  let trainingSpanWeeks = 0;
  if (sorted.length >= 2) {
    const first = new Date(sorted[0].workout.startedAt).getTime();
    const last = new Date(sorted[sorted.length - 1].workout.startedAt).getTime();
    trainingSpanWeeks = (last - first) / (7 * 24 * 60 * 60 * 1000);
  }
  const e1rmProgressRate = estimateE1rmProgressRate(workoutsWithSets);
  const trainingLevel = estimateTrainingLevel(totalWorkoutDays, trainingSpanWeeks, e1rmProgressRate);

  // Weekly volume (last 7 days, fractional method)
  const weekSets = getSetsFromLastDays(workoutsWithSets, 7);
  const fractionalVolume = calculateFractionalVolume(weekSets);
  const target = VOLUME_TARGETS[trainingLevel];

  const muscleGroups: MuscleGroup[] = ["chest", "back", "legs", "shoulders", "biceps", "triceps", "core"];
  const volumeRecommendations: VolumeRecommendation[] = muscleGroups.map((mg) => {
    const currentSets = Math.round((fractionalVolume.get(mg) ?? 0) * 10) / 10;
    let status: "below_mev" | "optimal" | "above_mrv";
    if (currentSets < target.minSets) status = "below_mev";
    else if (currentSets > target.maxSets) status = "above_mrv";
    else status = "optimal";
    return { muscleGroup: mg, currentSets, mev: target.minSets, mav: target.targetSets, mrv: target.maxSets, status };
  });

  // Progression suggestions (exercises used in last 28 days)
  const recentSets = getSetsFromLastDays(workoutsWithSets, 28);
  const setsByExercise = new Map<string, SetEntry[]>();
  for (const set of recentSets) {
    const arr = setsByExercise.get(set.exerciseId) ?? [];
    arr.push(set);
    setsByExercise.set(set.exerciseId, arr);
  }

  const progressionSuggestions: ProgressionSuggestion[] = [];
  for (const [exerciseId, sets] of setsByExercise) {
    const exercise = exerciseMap.get(exerciseId);
    if (!exercise) continue;
    const suggestion = decideProgression(exerciseId, exercise.name, exercise.type, sets);
    if (suggestion) progressionSuggestions.push(suggestion);
  }

  // Fatigue and deload
  const fatigueScore = assessFatigue(workoutsWithSets);
  const deloadRecommendation = fatigueScore.shouldDeload
    ? prescribeDeload(fatigueScore.score)
    : null;

  return {
    trainingLevel,
    volumeRecommendations,
    progressionSuggestions,
    fatigueScore,
    deloadRecommendation,
  };
}
