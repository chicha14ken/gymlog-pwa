"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { createLocalWorkoutRepository } from "@/data/localRepository";
import type { WorkoutWithSets } from "@/data/repository";
import type { Exercise } from "@/domain/models";
import { getExerciseNameJa } from "@/lib/exerciseNames";

type ExerciseType = "weighted" | "bodyweight" | "timed";

type SetSnapshot = {
  id: string;
  weightKg: number;
  reps: number;
  order: number;
  feeling?: string;
};

type DateGroup = {
  dateKey: string;
  dateLabel: string;
  sets: SetSnapshot[];
};

type ExerciseHistoryGroup = {
  exerciseId: string;
  exerciseName: string;
  exerciseType: ExerciseType;
  lastDateKey: string;
  lastDateLabel: string;
  totalSets: number;
  dateGroups: DateGroup[];
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(d);
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(d);
}

function formatSetValue(set: SetSnapshot, type: ExerciseType): string {
  if (type === "bodyweight") return `自重 × ${set.reps}回`;
  if (type === "timed")      return `${set.reps}秒`;
  return `${set.weightKg}kg × ${set.reps}回`;
}

export default function HistoryPage() {
  const repo = useMemo(() => createLocalWorkoutRepository(), []);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutWithSets[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [exList, withSets] = await Promise.all([
          repo.getExercises(),
          repo.listWorkoutsWithSets(),
        ]);
        setExercises(exList);
        setWorkouts(withSets);
      } catch {
        setError("履歴の読み込みに失敗しました。");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [repo]);

  /** 種目ごとにグルーピング → 日付ごとにサブグルーピング */
  const groups: ExerciseHistoryGroup[] = useMemo(() => {
    const byExercise = new Map<string, Map<string, SetSnapshot[]>>();

    for (const { workout, sets } of workouts) {
      const dateKey = workout.startedAt.slice(0, 10);
      for (const set of sets) {
        let dateMap = byExercise.get(set.exerciseId);
        if (!dateMap) {
          dateMap = new Map();
          byExercise.set(set.exerciseId, dateMap);
        }
        const arr = dateMap.get(dateKey) ?? [];
        arr.push({
          id: set.id,
          weightKg: set.weightKg,
          reps: set.reps,
          order: set.order,
          feeling: set.feeling,
        });
        dateMap.set(dateKey, arr);
      }
    }

    const result: ExerciseHistoryGroup[] = [];

    for (const [exerciseId, dateMap] of byExercise.entries()) {
      const ex = exercises.find((e) => e.id === exerciseId);
      const exerciseName = ex ? getExerciseNameJa(ex.id, ex.name) : "（不明）";
      const exerciseType: ExerciseType = ex?.type ?? "weighted";

      const dateGroups: DateGroup[] = Array.from(dateMap.entries())
        .sort(([a], [b]) => (a > b ? -1 : 1))
        .map(([dateKey, sets]) => ({
          dateKey,
          dateLabel: formatDate(dateKey),
          sets: sets.sort((a, b) => a.order - b.order),
        }));

      const lastDateKey   = dateGroups[0]?.dateKey ?? "";
      const lastDateLabel = lastDateKey ? formatDateShort(lastDateKey) : "";
      const totalSets     = dateGroups.reduce((s, d) => s + d.sets.length, 0);

      result.push({
        exerciseId,
        exerciseName,
        exerciseType,
        lastDateKey,
        lastDateLabel,
        totalSets,
        dateGroups,
      });
    }

    result.sort((a, b) => (a.lastDateKey > b.lastDateKey ? -1 : 1));
    return result;
  }, [workouts, exercises]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-6 pt-12 pb-4">
        <p className="text-[11px] font-medium text-stone tracking-[0.5px] uppercase">History</p>
        <h1 className="mt-1 text-[26px] font-black text-charcoal tracking-[-0.8px]">履歴</h1>
      </div>

      {loading && <div className="px-6 text-[13px] text-stone">読み込み中...</div>}
      {error && <div className="px-6 text-[13px] text-red-500">{error}</div>}

      {!loading && !error && groups.length === 0 && (
        <div className="px-6 py-8 text-center">
          <p className="text-[13px] text-stone">まだワークアウト記録がありません。</p>
          <p className="text-[12px] text-pale mt-1">記録タブからトレーニングを始めましょう。</p>
        </div>
      )}

      {!loading && !error && groups.length > 0 && (
        <div className="px-5 space-y-2 pb-6">
          {groups.map((group) => {
            const isExpanded = expandedId === group.exerciseId;
            return (
              <div
                key={group.exerciseId}
                className="rounded-2xl border border-rim bg-card overflow-hidden"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              >
                {/* Card header */}
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId((prev) =>
                      prev === group.exerciseId ? null : group.exerciseId,
                    )
                  }
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-ivory transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-bold text-charcoal">
                        {group.exerciseName}
                      </span>
                      {group.exerciseType === "bodyweight" && (
                        <span className="rounded-md bg-linen px-1.5 py-0.5 text-[10px] font-semibold text-stone">
                          自重
                        </span>
                      )}
                      {group.exerciseType === "timed" && (
                        <span className="rounded-md bg-linen px-1.5 py-0.5 text-[10px] font-semibold text-stone">
                          秒数
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px] text-stone">
                        最終: {group.lastDateLabel}
                      </span>
                      <span className="text-[11px] text-stone">
                        計 {group.totalSets} セット
                      </span>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp size={16} strokeWidth={2} className="stroke-pale shrink-0" />
                  ) : (
                    <ChevronDown size={16} strokeWidth={2} className="stroke-pale shrink-0" />
                  )}
                </button>

                {/* Expanded: date subgroups */}
                {isExpanded && (
                  <div className="border-t border-rim bg-ivory px-4 pb-3 pt-2">
                    <div className="space-y-3">
                      {group.dateGroups.map((dg) => (
                        <div key={dg.dateKey}>
                          <p className="mb-1.5 text-[11px] font-semibold text-stone">
                            {dg.dateLabel}
                          </p>
                          <ul className="space-y-1.5">
                            {dg.sets.map((set, idx) => (
                              <li
                                key={set.id}
                                className="flex items-center justify-between rounded-xl bg-card border border-rim px-3 py-2.5"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-[11px] font-semibold text-pale w-4">
                                    {idx + 1}
                                  </span>
                                  <p className="text-[15px] font-bold text-charcoal tracking-[-0.3px]">
                                    {formatSetValue(set, group.exerciseType)}
                                  </p>
                                </div>
                                {set.feeling && (
                                  <span className="text-[11px] text-pale ml-3 shrink-0">
                                    {set.feeling}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
