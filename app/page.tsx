 "use client";

import { useEffect, useMemo, useState } from "react";
import { createLocalWorkoutRepository } from "@/data/localRepository";
import type { Exercise } from "@/domain/models";
import { getExerciseNameJa } from "@/lib/exerciseNames";
import { WeightInput, type WeightChip } from "@/components/WeightInput";
import {
  STEP_OPTIONS,
  type StepOption,
  getDefaultStep,
} from "@/lib/weightStep";
import {
  PrCelebration,
  type PrCelebrationData,
} from "@/components/PrCelebration";

type DraftSet = {
  id: string;
  exerciseId: string;
  weightKg: number;
  reps: number;
};

const BODY_PART_TABS = [
  { id: "chest", label: "胸" },
  { id: "back", label: "背中" },
  { id: "legs", label: "脚" },
  { id: "shoulders", label: "肩" },
  { id: "arms", label: "腕" },
  { id: "core", label: "体幹" },
] as const;

type BodyPartTabId = (typeof BODY_PART_TABS)[number]["id"];

function getTabForExercise(exercise: Exercise): BodyPartTabId {
  switch (exercise.bodyPart) {
    case "chest":
      return "chest";
    case "back":
      return "back";
    case "shoulders":
      return "shoulders";
    case "biceps":
    case "triceps":
      return "arms";
    case "legs":
    case "calves":
    case "glutes":
    case "posterior-chain":
      return "legs";
    case "core":
    default:
      return "core";
  }
}

function createDraftSetId(): string {
  return (
    Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8)
  );
}

function todayIso(): string {
  return new Date().toISOString();
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function TodayPage() {
  const repo = useMemo(() => createLocalWorkoutRepository(), []);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("");
  const [selectedBodyPart, setSelectedBodyPart] =
    useState<BodyPartTabId>("chest");
  const [currentWeight, setCurrentWeight] = useState<number>(60);
  const [currentReps, setCurrentReps] = useState<number>(5);
  type Suggestion = {
    exerciseId: string;
    weightKg: number;
    reps: number;
  };
  const [lastSuggestion, setLastSuggestion] = useState<Suggestion | null>(null);
  const [sets, setSets] = useState<DraftSet[]>([]);
  const [todayWorkoutId, setTodayWorkoutId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editingWeight, setEditingWeight] = useState<number>(0);
  const [editingReps, setEditingReps] = useState<number>(0);
  const [bodyweightKg, setBodyweightKg] = useState<number | undefined>(
    undefined,
  );
  const [bestWeights, setBestWeights] = useState<Record<string, number>>({});
  const [stepOverrides, setStepOverrides] = useState<Record<string, StepOption>>({});
  const [prCelebration, setPrCelebration] = useState<PrCelebrationData | null>(null);

  useEffect(() => {
    repo
      .getExercises()
      .then((list) => {
        setExercises(list);
        if (list.length > 0) {
          const first = list[0];
          setSelectedExerciseId(first.id);
          setSelectedBodyPart(getTabForExercise(first));
        }
      })
      .catch(() => {
        setError("エクササイズ一覧の読み込みに失敗しました。");
      });
  }, [repo]);

  useEffect(() => {
    repo
      .listWorkouts()
      .then((workouts) => {
        const today = todayDateString();
        const todays = workouts.filter((w) => w.startedAt.startsWith(today));
        if (todays.length === 0) return;
        const latest = todays.sort(
          (a, b) =>
            new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
        )[0];
        if (!latest) return;
        setTodayWorkoutId(latest.id);
        return repo.listSetsForWorkout(latest.id);
      })
      .then((setsList) => {
        if (!setsList) return;
        const draft: DraftSet[] = setsList
          .sort((a, b) => a.order - b.order)
          .map((s) => ({
            id: s.id,
            exerciseId: s.exerciseId,
            weightKg: s.weightKg,
            reps: s.reps,
          }));
        setSets(draft);
      })
      .catch(() => {});
  }, [repo]);

  useEffect(() => {
    if (!selectedExerciseId) return;
    repo
      .getLastSetForExercise(selectedExerciseId)
      .then((set) => {
        if (!set) {
          setLastSuggestion(null);
          return;
        }
        setLastSuggestion({
          exerciseId: set.exerciseId,
          weightKg: set.weightKg,
          reps: set.reps,
        });
      })
      .catch(() => {
        // ignore suggestion errors
      });
  }, [repo, selectedExerciseId]);

  useEffect(() => {
    repo
      .listWorkoutsWithSets()
      .then((workoutsWithSets) => {
        const maxByExercise: Record<string, number> = {};
        for (const { sets } of workoutsWithSets) {
          for (const set of sets) {
            if (set.weightKg > (maxByExercise[set.exerciseId] ?? 0)) {
              maxByExercise[set.exerciseId] = set.weightKg;
            }
          }
        }
        setBestWeights(maxByExercise);
      })
      .catch(() => {});
  }, [repo]);

  const filteredExercises = useMemo(
    () =>
      exercises.filter(
        (exercise) => getTabForExercise(exercise) === selectedBodyPart,
      ),
    [exercises, selectedBodyPart],
  );

  const weightStep = useMemo((): StepOption => {
    const exercise = exercises.find((e) => e.id === selectedExerciseId);
    return exercise ? getDefaultStep(exercise.name) : 2.5;
  }, [exercises, selectedExerciseId]);

  const effectiveStep = stepOverrides[selectedExerciseId] ?? weightStep;

  const weightChips = useMemo<WeightChip[]>(() => {
    const chips: WeightChip[] = [];
    if (lastSuggestion && lastSuggestion.exerciseId === selectedExerciseId) {
      const { weightKg, reps } = lastSuggestion;
      chips.push({
        id: "prev",
        label: `前回 ${weightKg}kg × ${reps}回`,
        weightKg,
        onSelect: () => {
          setCurrentWeight(weightKg);
          setCurrentReps(reps);
        },
      });
    }
    const best = bestWeights[selectedExerciseId];
    if (best != null && best !== lastSuggestion?.weightKg) {
      chips.push({ id: "best", label: `ベスト ${best}kg`, weightKg: best });
    }
    return chips;
  }, [lastSuggestion, bestWeights, selectedExerciseId]);

  const handleAddSet = async () => {
    if (!selectedExerciseId || currentWeight <= 0 || currentReps <= 0) return;
    setIsSaving(true);
    setError(null);
    setInfo(null);

    // PR判定：保存前に現在のベストを確認
    const previousBest = bestWeights[selectedExerciseId]; // undefined = 初記録
    const isNewPr = previousBest === undefined
      ? true
      : currentWeight > previousBest;

    try {
      let workoutId = todayWorkoutId;
      if (!workoutId) {
        const workout = await repo.createWorkout({ startedAt: todayIso() });
        workoutId = workout.id;
        setTodayWorkoutId(workoutId);
      }
      await repo.addSet({
        workoutId,
        exerciseId: selectedExerciseId,
        weightKg: currentWeight,
        reps: currentReps,
        order: sets.length,
      });
      const newSet: DraftSet = {
        id: createDraftSetId(),
        exerciseId: selectedExerciseId,
        weightKg: currentWeight,
        reps: currentReps,
      };
      setSets((prev) => [...prev, newSet]);
      setBestWeights((prev) => {
        const currentBest = prev[selectedExerciseId] ?? 0;
        return currentWeight > currentBest
          ? { ...prev, [selectedExerciseId]: currentWeight }
          : prev;
      });

      if (isNewPr) {
        // 🏆 PR達成 → お祝い演出
        const exercise = exercises.find((e) => e.id === selectedExerciseId);
        const exerciseName = exercise
          ? getExerciseNameJa(exercise.id, exercise.name)
          : selectedExerciseId;
        setPrCelebration({
          exerciseName,
          newWeightKg: currentWeight,
          previousWeightKg: previousBest !== undefined ? previousBest : null,
        });
      } else {
        setInfo("セットを記録しました。");
      }
    } catch {
      setError("セットの保存に失敗しました。");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSet = (id: string) => {
    setSets((prev) => prev.filter((set) => set.id !== id));
    if (editingSetId === id) {
      setEditingSetId(null);
    }
  };

  const handleStartEditSet = (set: DraftSet) => {
    setEditingSetId(set.id);
    setEditingWeight(set.weightKg);
    setEditingReps(set.reps);
  };

  const handleCancelEditSet = () => {
    setEditingSetId(null);
  };

  const handleSaveEditSet = () => {
    if (!editingSetId || editingWeight <= 0 || editingReps <= 0) {
      return;
    }
    setSets((prev) =>
      prev.map((set) =>
        set.id === editingSetId
          ? { ...set, weightKg: editingWeight, reps: editingReps }
          : set,
      ),
    );
    setEditingSetId(null);
  };

  const handleSaveWorkout = async () => {
    if (sets.length === 0 && !todayWorkoutId) {
      setInfo("セットを追加してください。");
      return;
    }
    if (todayWorkoutId && bodyweightKg != null && bodyweightKg > 0) {
      try {
        const workout = await repo.getWorkout(todayWorkoutId);
        if (workout) {
          await repo.updateWorkout({
            ...workout,
            bodyweightKg,
          });
        }
      } catch {
        setError("体重の保存に失敗しました。");
        return;
      }
    }
    setTodayWorkoutId(null);
    setSets([]);
    setBodyweightKg(undefined);
    setInfo("ワークアウトを保存しました。履歴で確認できます。");
  };

  return (
    <div className="space-y-4">
      {/* PR達成時のお祝いオーバーレイ */}
      {prCelebration && (
        <PrCelebration
          {...prCelebration}
          onDismiss={() => setPrCelebration(null)}
        />
      )}
      <section className="space-y-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            今日のワークアウト
          </h2>
          <span className="text-[0.7rem] text-zinc-500">
            オフラインで保存されます
          </span>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                部位 / エクササイズ
              </span>
              <span className="text-[0.7rem] text-zinc-500">
                部位をタップして選択
              </span>
            </div>
            <div className="overflow-x-auto pb-1">
              <div className="inline-flex rounded-full bg-zinc-100 p-1 text-xs dark:bg-zinc-800">
                {BODY_PART_TABS.map((tab) => {
                  const isActive = tab.id === selectedBodyPart;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedBodyPart(tab.id)}
                      className={`mx-0.5 rounded-full px-3 py-1 font-medium transition ${
                        isActive
                          ? "bg-zinc-900 text-white shadow-sm dark:bg-zinc-50 dark:text-zinc-900"
                          : "text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="pt-1">
              {filteredExercises.length === 0 ? (
                <p className="text-[0.7rem] text-zinc-500">
                  この部位のエクササイズはまだありません。
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {filteredExercises.map((exercise) => {
                    const isSelected = exercise.id === selectedExerciseId;
                    return (
                      <button
                        key={exercise.id}
                        type="button"
                        onClick={() => setSelectedExerciseId(exercise.id)}
                        className={`flex h-10 items-center justify-between rounded-xl border px-3 text-xs font-medium transition active:scale-[0.98] ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-400 dark:bg-emerald-900/40 dark:text-emerald-100"
                            : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-500"
                        }`}
                      >
                        <span className="truncate">{exercise.name}</span>
                        {isSelected && (
                          <span className="ml-2 text-[0.65rem] font-semibold">
                            選択中
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-[1.2fr_1fr] items-end gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  重量 (kg)
                </label>
                <div className="inline-flex rounded-full bg-zinc-100 p-0.5 dark:bg-zinc-800">
                  {STEP_OPTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() =>
                        setStepOverrides((prev) => ({
                          ...prev,
                          [selectedExerciseId]: s,
                        }))
                      }
                      className={`rounded-full px-2 py-0.5 text-[0.65rem] font-medium transition ${
                        effectiveStep === s
                          ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                          : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <WeightInput
                value={currentWeight}
                onChange={setCurrentWeight}
                step={effectiveStep}
                chips={weightChips}
              />
              <p className="text-[0.65rem] text-zinc-400 dark:text-zinc-600">
                ※重量は両手合計（ダンベルも合計）で記録
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                回数
              </label>
              <input
                type="number"
                inputMode="numeric"
                className="h-8 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
                value={Number.isNaN(currentReps) ? "" : currentReps}
                onChange={(e) =>
                  setCurrentReps(
                    e.target.value === "" ? 0 : Number(e.target.value),
                  )
                }
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddSet}
            disabled={
              !selectedExerciseId ||
              currentWeight <= 0 ||
              currentReps <= 0 ||
              isSaving
            }
            className="h-9 w-full rounded-full bg-zinc-900 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {isSaving ? "保存中..." : "セットを追加"}
          </button>
        </div>
      </section>

      <section className="space-y-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            今日のセット
          </h2>
          <span className="text-xs text-zinc-500">{sets.length} セット</span>
        </div>

        {sets.length === 0 ? (
          <p className="text-xs text-zinc-500">
            まだ記録がありません。上の「セットを追加」から記録を始めましょう。
          </p>
        ) : (
          <ul className="space-y-1.5 text-xs">
            {sets.map((set, index) => {
              const ex = exercises.find((e) => e.id === set.exerciseId);
              const isEditing = set.id === editingSetId;
              return (
                <li
                  key={set.id}
                  className="flex items-center justify-between rounded-lg bg-zinc-50 px-2.5 py-1.5 dark:bg-zinc-800/80"
                >
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[0.7rem] font-medium text-zinc-600 dark:text-zinc-300">
                        {ex ? getExerciseNameJa(ex.id, ex.name) : "（不明）"}
                      </span>
                      <span className="text-[0.7rem] text-zinc-500">
                        #{index + 1}
                      </span>
                    </div>
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-[0.7rem] text-zinc-500">
                            重量
                          </span>
                          <input
                            type="number"
                            inputMode="decimal"
                            className="h-7 w-20 rounded-lg border border-zinc-200 bg-white px-2 text-[0.75rem] outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
                            value={
                              Number.isNaN(editingWeight) ? "" : editingWeight
                            }
                            onChange={(e) =>
                              setEditingWeight(
                                e.target.value === ""
                                  ? 0
                                  : Number(e.target.value),
                              )
                            }
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[0.7rem] text-zinc-500">
                            回数
                          </span>
                          <input
                            type="number"
                            inputMode="numeric"
                            className="h-7 w-16 rounded-lg border border-zinc-200 bg-white px-2 text-[0.75rem] outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
                            value={Number.isNaN(editingReps) ? "" : editingReps}
                            onChange={(e) =>
                              setEditingReps(
                                e.target.value === ""
                                  ? 0
                                  : Number(e.target.value),
                              )
                            }
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                        {set.weightKg}kg × {set.reps}回
                      </span>
                    )}
                  </div>
                  <div className="ml-2 flex flex-col items-end gap-1">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={handleSaveEditSet}
                          className="h-6 rounded-full bg-emerald-600 px-2 text-[0.7rem] font-semibold text-white shadow-sm active:scale-[0.97] dark:bg-emerald-500"
                        >
                          保存
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEditSet}
                          className="h-6 rounded-full px-2 text-[0.7rem] text-zinc-500 hover:bg-zinc-200/70 dark:text-zinc-300 dark:hover:bg-zinc-700/80"
                        >
                          キャンセル
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartEditSet(set)}
                        className="h-6 rounded-full px-2 text-[0.7rem] text-zinc-500 hover:bg-zinc-200/70 dark:text-zinc-300 dark:hover:bg-zinc-700/80"
                      >
                        編集
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteSet(set.id)}
                      className="h-6 rounded-full px-2 text-[0.7rem] text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/40"
                    >
                      削除
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
            体重 (kg)
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="任意"
            className="h-8 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            value={
              bodyweightKg == null || bodyweightKg === 0
                ? ""
                : bodyweightKg
            }
            onChange={(e) => {
              const v = e.target.value;
              setBodyweightKg(v === "" ? undefined : Number(v));
            }}
          />
        </div>

        <button
          type="button"
          onClick={handleSaveWorkout}
          disabled={sets.length === 0 && !todayWorkoutId}
          className="mt-2 h-10 w-full rounded-full bg-emerald-600 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-40 dark:bg-emerald-500"
        >
          ワークアウトを保存
        </button>

        {error && (
          <p className="mt-1 text-xs text-red-500" role="alert">
            {error}
          </p>
        )}
        {info && !error && (
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
            {info}
          </p>
        )}
      </section>
    </div>
  );
}

