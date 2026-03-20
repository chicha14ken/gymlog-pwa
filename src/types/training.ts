export type MuscleGroup =
  | "chest"
  | "back"
  | "legs"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "core";

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest:     "胸",
  back:      "背中",
  legs:      "脚",
  shoulders: "肩",
  biceps:    "二頭",
  triceps:   "三頭",
  core:      "体幹",
};

export type TrainingLevel = "beginner" | "intermediate" | "advanced";

export const TRAINING_LEVEL_LABELS: Record<TrainingLevel, string> = {
  beginner:     "初心者",
  intermediate: "中級者",
  advanced:     "上級者",
};

export type VolumeRecommendation = {
  muscleGroup: MuscleGroup;
  /** Fractional weekly set count (Pelland 2024 method) */
  currentSets: number;
  /** Minimum Effective Volume */
  mev: number;
  /** Maximum Adaptive Volume */
  mav: number;
  /** Maximum Recoverable Volume */
  mrv: number;
  status: "below_mev" | "optimal" | "above_mrv";
};

export type ProgressionSuggestion = {
  exerciseId: string;
  exerciseName: string;
  action: "increase_weight" | "increase_reps" | "maintain";
  suggestedWeightKg: number;
  suggestedReps: number;
  repRange: { min: number; max: number };
  reason: string;
};

export type FatigueScore = {
  /** 0–100. Higher = more accumulated fatigue. */
  score: number;
  shouldDeload: boolean;
  indicators: string[];
};

export type DeloadRecommendation = {
  durationDays: number;
  /** Fraction of normal volume (e.g. 0.5 = 50%). */
  volumeMultiplier: number;
  /** Fraction of normal intensity (e.g. 0.85 = 85%). */
  intensityMultiplier: number;
  keepFrequency: boolean;
};

export type TrainingPlan = {
  trainingLevel: TrainingLevel;
  volumeRecommendations: VolumeRecommendation[];
  progressionSuggestions: ProgressionSuggestion[];
  fatigueScore: FatigueScore;
  deloadRecommendation: DeloadRecommendation | null;
};
