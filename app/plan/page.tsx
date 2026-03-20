"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, TrendingUp, TrendingDown, Minus, CalendarDays } from "lucide-react";
import { createLocalWorkoutRepository } from "@/data/localRepository";
import { generateTrainingPlan } from "@/lib/training-algorithm";
import { getExerciseNameJa } from "@/lib/exerciseNames";
import { MUSCLE_GROUP_LABELS, TRAINING_LEVEL_LABELS } from "@/types/training";
import type { TrainingPlan, VolumeRecommendation, ProgressionSuggestion } from "@/types/training";

// ── Volume bar ────────────────────────────────────────────────────────

function VolumeBar({ rec }: { rec: VolumeRecommendation }) {
  const label = MUSCLE_GROUP_LABELS[rec.muscleGroup];
  const barMax = rec.mrv + 4;
  const currentPct = Math.min((rec.currentSets / barMax) * 100, 100);
  const mavPct = (rec.mav / barMax) * 100;
  const mrvPct = (rec.mrv / barMax) * 100;

  const statusColor =
    rec.status === "optimal"   ? "bg-sage"
    : rec.status === "above_mrv" ? "bg-terracotta"
    : "bg-stone";

  const statusLabel =
    rec.status === "optimal"   ? "適正"
    : rec.status === "above_mrv" ? "超過"
    : "不足";

  const statusTextColor =
    rec.status === "optimal"   ? "text-sage"
    : rec.status === "above_mrv" ? "text-terracotta"
    : "text-stone";

  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-8 shrink-0 text-sm font-semibold text-charcoal">{label}</span>
      <div className="relative flex-1 h-2 rounded-full bg-linen overflow-visible">
        {/* MAV marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-px h-3 bg-stone/40"
          style={{ left: `${mavPct}%` }}
        />
        {/* MRV marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-px h-3 bg-terracotta/40"
          style={{ left: `${mrvPct}%` }}
        />
        {/* Current volume fill */}
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all ${statusColor}`}
          style={{ width: `${currentPct}%` }}
        />
      </div>
      <span className="w-12 shrink-0 text-right text-xs text-stone">
        {rec.currentSets}/{rec.mav}
      </span>
      <span className={`w-8 shrink-0 text-right text-xs font-semibold ${statusTextColor}`}>
        {statusLabel}
      </span>
    </div>
  );
}

// ── Progression card ──────────────────────────────────────────────────

function ProgressionCard({ suggestion }: { suggestion: ProgressionSuggestion }) {
  const nameJa = getExerciseNameJa(suggestion.exerciseId, suggestion.exerciseName);

  const ActionIcon =
    suggestion.action === "increase_weight" ? TrendingUp
    : suggestion.action === "increase_reps" ? TrendingUp
    : suggestion.action === "maintain"       ? Minus
    : TrendingDown;

  const actionColor =
    suggestion.action === "increase_weight" ? "text-sage"
    : suggestion.action === "increase_reps" ? "text-infoBlue"
    : "text-stone";

  const actionLabel =
    suggestion.action === "increase_weight" ? "重量アップ"
    : suggestion.action === "increase_reps" ? "レップアップ"
    : "継続";

  return (
    <div className="rounded-2xl border border-rim bg-card px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-charcoal">{nameJa}</p>
          <p className="mt-0.5 text-xs text-stone">{suggestion.reason}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className={`flex items-center justify-end gap-1 ${actionColor}`}>
            <ActionIcon size={13} strokeWidth={2} />
            <span className="text-xs font-semibold">{actionLabel}</span>
          </div>
          <p className="mt-0.5 text-base font-bold text-charcoal">
            {suggestion.suggestedWeightKg > 0
              ? `${suggestion.suggestedWeightKg} kg`
              : "—"}
          </p>
          <p className="text-xs text-stone">
            {suggestion.suggestedReps} rep 目標
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Fatigue gauge ─────────────────────────────────────────────────────

function FatigueGauge({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 28;
  const dashOffset = circumference - (score / 100) * circumference;

  const color =
    score >= 60 ? "#C4705A"   // terracotta
    : score >= 40 ? "#A39E95" // stone
    : "#6B8F71";              // sage

  return (
    <svg width={72} height={72} viewBox="0 0 72 72">
      <circle cx={36} cy={36} r={28} fill="none" stroke="#EEECE7" strokeWidth={6} />
      <circle
        cx={36} cy={36} r={28}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
      />
      <text x={36} y={41} textAnchor="middle" fontSize={15} fontWeight="800" fill={color}>
        {score}
      </text>
    </svg>
  );
}

// ── Empty state ───────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-linen">
        <CalendarDays size={32} className="stroke-pale" strokeWidth={1.5} />
      </div>
      <p className="text-base font-semibold text-charcoal">プランがまだ生成できません</p>
      <p className="mt-2 text-sm leading-relaxed text-stone">
        記録を積み上げるとプランが生成されます。<br />
        まずはトレーニングを記録してみましょう。
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────

export default function PlanPage() {
  const repo = useMemo(() => createLocalWorkoutRepository(), []);
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [hasData, setHasData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [exercises, workoutsWithSets] = await Promise.all([
          repo.getExercises(),
          repo.listWorkoutsWithSets(),
        ]);

        const hasSets = workoutsWithSets.some((w) => w.sets.length > 0);
        setHasData(hasSets);

        if (hasSets) {
          const generated = generateTrainingPlan(workoutsWithSets, exercises);
          setPlan(generated);
        }
      } catch {
        setError("プランの読み込みに失敗しました。");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [repo]);

  if (loading) {
    return (
      <main className="mx-auto min-h-screen max-w-md bg-ivory pb-24">
        <div className="flex h-48 items-center justify-center">
          <p className="text-sm text-stone">読み込み中…</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto min-h-screen max-w-md bg-ivory pb-24">
        <div className="flex h-48 items-center justify-center px-6">
          <p className="text-sm text-terracotta">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-md bg-ivory pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-rim bg-ivory/90 px-4 py-3 backdrop-blur">
        <h1 className="text-lg font-bold text-charcoal">トレーニングプラン</h1>
      </div>

      {!hasData || !plan ? (
        <EmptyState />
      ) : (
        <div className="space-y-5 px-4 pt-4">

          {/* Training level + Fatigue */}
          <section className="flex gap-3">
            {/* Level */}
            <div className="flex-1 rounded-2xl border border-rim bg-card px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-stone">
                レベル推定
              </p>
              <p className="mt-1.5 text-xl font-bold text-charcoal">
                {TRAINING_LEVEL_LABELS[plan.trainingLevel]}
              </p>
              <p className="mt-0.5 text-xs text-pale">
                {plan.trainingLevel === "beginner"     && "毎セッション進歩できる段階"}
                {plan.trainingLevel === "intermediate" && "隔週〜月単位で進歩する段階"}
                {plan.trainingLevel === "advanced"     && "メゾサイクル単位の計画が有効"}
              </p>
            </div>

            {/* Fatigue */}
            <div className="flex-1 rounded-2xl border border-rim bg-card px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-stone">
                疲労スコア
              </p>
              <div className="mt-1 flex items-center gap-2">
                <FatigueGauge score={plan.fatigueScore.score} />
                <p className="text-xs leading-relaxed text-stone">
                  {plan.fatigueScore.score >= 60
                    ? "ディロードを検討"
                    : plan.fatigueScore.score >= 40
                    ? "やや疲労あり"
                    : "回復良好"}
                </p>
              </div>
            </div>
          </section>

          {/* Deload alert */}
          {plan.deloadRecommendation && (
            <section className="rounded-2xl border border-terracotta/30 bg-terra-light px-4 py-3">
              <div className="flex items-start gap-2">
                <AlertTriangle
                  size={16}
                  strokeWidth={2}
                  className="mt-0.5 shrink-0 stroke-terracotta"
                />
                <div>
                  <p className="text-sm font-semibold text-terracotta">ディロード推奨</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-stone">
                    約{plan.deloadRecommendation.durationDays}日間、ボリュームを
                    {Math.round(plan.deloadRecommendation.volumeMultiplier * 100)}%・
                    強度を{Math.round(plan.deloadRecommendation.intensityMultiplier * 100)}%
                    に落として回復を優先しましょう。
                  </p>
                  {plan.fatigueScore.indicators.length > 0 && (
                    <ul className="mt-2 space-y-0.5">
                      {plan.fatigueScore.indicators.map((ind, i) => (
                        <li key={i} className="text-xs text-stone">
                          · {ind}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Fatigue indicators (non-deload) */}
          {!plan.deloadRecommendation && plan.fatigueScore.indicators.length > 0 && (
            <section className="rounded-2xl border border-rim bg-card px-4 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-stone">
                疲労シグナル
              </p>
              <ul className="space-y-1">
                {plan.fatigueScore.indicators.map((ind, i) => (
                  <li key={i} className="text-xs text-stone">
                    · {ind}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Weekly volume */}
          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-stone">
                今週のボリューム（部位別）
              </h2>
              <p className="text-[10px] text-pale">現在 / 目標 セット数</p>
            </div>
            <div className="rounded-2xl border border-rim bg-card px-4 py-2">
              {/* Legend */}
              <div className="mb-3 flex gap-4 text-[10px] text-pale">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-px bg-stone/40" />
                  目標（MAV）
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-px bg-terracotta/40" />
                  上限（MRV）
                </span>
              </div>
              <div className="divide-y divide-rim">
                {plan.volumeRecommendations.map((rec) => (
                  <VolumeBar key={rec.muscleGroup} rec={rec} />
                ))}
              </div>
            </div>
          </section>

          {/* Progression suggestions */}
          {plan.progressionSuggestions.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-stone">
                次回セッションの推奨
              </h2>
              <div className="space-y-2">
                {plan.progressionSuggestions.slice(0, 8).map((s) => (
                  <ProgressionCard key={s.exerciseId} suggestion={s} />
                ))}
              </div>
            </section>
          )}

          {plan.progressionSuggestions.length === 0 && (
            <section className="rounded-2xl border border-rim bg-card px-4 py-4 text-center">
              <p className="text-sm text-stone">
                直近4週間のログから推奨を生成します。<br />
                もう少し記録を積み上げてみましょう。
              </p>
            </section>
          )}

          {/* Footnote */}
          <p className="pb-2 text-center text-[10px] leading-relaxed text-pale">
            ボリューム推奨は Pelland et al. (2024) の分数的計量法を採用。<br />
            疲労スコアは直近のログデータから自動算出されます。
          </p>
        </div>
      )}
    </main>
  );
}
