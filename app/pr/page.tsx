"use client";

import { useEffect, useMemo, useState } from "react";
import { Trophy } from "lucide-react";
import { createLocalWorkoutRepository } from "@/data/localRepository";
import { computeExercisePrs } from "@/domain/pr";
import type { SetEntry } from "@/domain/models";
import { getExerciseNameJa } from "@/lib/exerciseNames";

type ExercisePrRow = {
  id: string;
  name: string;
  bodyPart: string;
  maxWeightKg: number;
  bestReps: number;
  estimatedOneRmKg: number;
};

const BODY_PART_JA: Record<string, string> = {
  chest: "胸", back: "背中", legs: "脚", shoulders: "肩",
  biceps: "腕", triceps: "腕", core: "体幹", calves: "脚",
  glutes: "脚", "posterior-chain": "脚",
};

export default function PrPage() {
  const repo = useMemo(() => createLocalWorkoutRepository(), []);
  const [rows, setRows] = useState<ExercisePrRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [exercises, workoutsWithSets] = await Promise.all([
          repo.getExercises(),
          repo.listWorkoutsWithSets(),
        ]);
        const allSets: SetEntry[] = workoutsWithSets.flatMap((w) => w.sets);
        const prs = computeExercisePrs(exercises, allSets);
        setRows(
          prs.map((pr) => ({
            id: pr.exercise.id,
            name: pr.exercise.name,
            bodyPart: pr.exercise.bodyPart,
            maxWeightKg: pr.maxWeightKg,
            bestReps: pr.bestReps,
            estimatedOneRmKg: pr.estimatedOneRmKg,
          })),
        );
      } catch {
        setError("PR 情報の読み込みに失敗しました。");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [repo]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-6 pt-12 pb-4">
        <p className="text-[11px] font-medium text-stone tracking-[0.5px] uppercase">Personal Records</p>
        <h1 className="mt-1 text-[26px] font-black text-charcoal tracking-[-0.8px]">PR</h1>
      </div>

      {loading && <div className="px-6 text-[13px] text-stone">読み込み中...</div>}
      {error && <div className="px-6 text-[13px] text-red-500">{error}</div>}

      {!loading && !error && rows.length === 0 && (
        <div className="px-6 py-8 text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-linen flex items-center justify-center">
            <Trophy size={24} strokeWidth={2} style={{ stroke: "#C4975A" }} />
          </div>
          <p className="text-[13px] text-stone">まだ記録がありません。</p>
          <p className="text-[12px] text-pale mt-1">
            トレーニングを記録すると、ここにベストが表示されます。
          </p>
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="px-5 pb-6">
          <p className="text-[10px] text-pale mb-3">
            推定1RM ＝ 重量 × (1 ＋ 回数 ÷ 30)
          </p>
          <div className="space-y-2">
            {rows.map((row, idx) => (
              <div
                key={row.id}
                className="flex items-center gap-3 rounded-2xl border border-rim bg-card px-4 py-3.5"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              >
                {/* Rank */}
                {idx < 3 && (
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[12px] font-black"
                    style={{
                      background: idx === 0 ? "#FBF5EE" : idx === 1 ? "#F5F5F5" : "#FEF3EC",
                      color: idx === 0 ? "#C4975A" : idx === 1 ? "#9E9E9E" : "#CD7F32",
                    }}
                  >
                    {idx + 1}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-charcoal truncate">
                    {getExerciseNameJa(row.id, row.name)}
                  </p>
                  <p className="text-[11px] text-stone mt-0.5">
                    {BODY_PART_JA[row.bodyPart] ?? row.bodyPart} ·{" "}
                    最高 {row.maxWeightKg.toFixed(1)}kg × {row.bestReps}回
                  </p>
                </div>

                {/* 1RM */}
                <div className="text-right shrink-0">
                  <p className="text-[11px] text-stone">推定1RM</p>
                  <p className="text-[18px] font-black text-terracotta tracking-[-0.5px]">
                    {row.estimatedOneRmKg.toFixed(0)}
                    <span className="text-[12px] font-semibold">kg</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
