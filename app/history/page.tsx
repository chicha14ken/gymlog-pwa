"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { createLocalWorkoutRepository } from "@/data/localRepository";
import type { WorkoutWithSets } from "@/data/repository";
import type { Exercise } from "@/domain/models";
import { getExerciseNameJa } from "@/lib/exerciseNames";

const BODY_PART_JA: Record<string, string> = {
  chest: "胸", back: "背中", legs: "脚", shoulders: "肩",
  biceps: "腕", triceps: "腕", core: "体幹", calves: "脚",
  glutes: "脚", "posterior-chain": "脚",
};

type GroupedWorkouts = { dateLabel: string; workouts: WorkoutWithSets[] };

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric", month: "long", day: "numeric", weekday: "short",
  }).format(d);
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

  const groups: GroupedWorkouts[] = useMemo(() => {
    const byDate = new Map<string, WorkoutWithSets[]>();
    for (const w of workouts) {
      const dateKey = w.workout.startedAt.slice(0, 10);
      const arr = byDate.get(dateKey) ?? [];
      arr.push(w);
      byDate.set(dateKey, arr);
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => (a > b ? -1 : 1))
      .map(([dateKey, list]) => ({ dateLabel: formatDate(dateKey), workouts: list }));
  }, [workouts]);

  const getExName = (id: string) => {
    const ex = exercises.find((e) => e.id === id);
    return ex ? getExerciseNameJa(ex.id, ex.name) : "（不明）";
  };

  const getBpSummary = (w: WorkoutWithSets): string => {
    const bpSet = new Set<string>();
    for (const s of w.sets) {
      const ex = exercises.find((e) => e.id === s.exerciseId);
      if (ex) bpSet.add(ex.bodyPart);
    }
    return Array.from(new Set(Array.from(bpSet).map((bp) => BODY_PART_JA[bp] ?? bp))).join(" · ");
  };

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
        <div className="px-5 space-y-5 pb-6">
          {groups.map((group) => (
            <section key={group.dateLabel}>
              <p className="mb-2 text-[11px] font-semibold text-stone">{group.dateLabel}</p>

              <div className="space-y-2">
                {group.workouts.map((item) => {
                  const isExpanded = expandedId === item.workout.id;
                  const totalVol = item.sets.reduce((s, x) => s + x.weightKg * x.reps, 0);
                  const bpSummary = getBpSummary(item);

                  return (
                    <div
                      key={item.workout.id}
                      className="rounded-2xl border border-rim bg-card overflow-hidden"
                      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId((prev) =>
                            prev === item.workout.id ? null : item.workout.id,
                          )
                        }
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-ivory transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[14px] font-bold text-charcoal">
                              {new Date(item.workout.startedAt).toLocaleTimeString("ja-JP", {
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </span>
                            {bpSummary && (
                              <span className="text-[11px] text-stone">{bpSummary}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[11px] text-stone">{item.sets.length} セット</span>
                            {totalVol > 0 && (
                              <span className="text-[11px] text-stone">{totalVol.toLocaleString()} kg</span>
                            )}
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp size={16} strokeWidth={2} className="stroke-pale shrink-0" />
                        ) : (
                          <ChevronDown size={16} strokeWidth={2} className="stroke-pale shrink-0" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="border-t border-rim bg-ivory px-4 pb-3 pt-2">
                          <ul className="space-y-1.5">
                            {item.sets.map((set) => (
                              <li
                                key={set.id}
                                className="flex items-center justify-between rounded-xl bg-card border border-rim px-3 py-2.5"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-[12px] font-medium text-stone truncate">
                                    {getExName(set.exerciseId)}
                                  </p>
                                  <p className="text-[15px] font-bold text-charcoal tracking-[-0.3px]">
                                    {set.weightKg}kg × {set.reps}回
                                  </p>
                                </div>
                                <span className="text-[11px] text-pale ml-3 shrink-0">
                                  #{set.order + 1}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
