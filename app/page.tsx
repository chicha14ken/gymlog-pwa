"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Flame, RotateCcw, Compass, Search, Trophy, ChevronRight } from "lucide-react";
import { createLocalWorkoutRepository } from "@/data/localRepository";
import { computeExercisePrs } from "@/domain/pr";
import { getExerciseNameJa } from "@/lib/exerciseNames";
import type { Exercise } from "@/domain/models";
import type { WorkoutWithSets } from "@/data/repository";
import type { SetEntry } from "@/domain/models";

// ── Date helpers ────────────────────────────────────────────────────

const DAY_NAMES = [
  "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY",
];
const MONTH_NAMES = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

function formatDateLabel(): string {
  const d = new Date();
  return `${DAY_NAMES[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

// ── Streak calculation ───────────────────────────────────────────────

type StreakInfo = { streakWeeks: number; thisWeekCount: number; thisWeekGoal: number };

function computeStreak(workouts: WorkoutWithSets[]): StreakInfo {
  const thisWeekGoal = 3;
  if (workouts.length === 0) return { streakWeeks: 0, thisWeekCount: 0, thisWeekGoal };

  const today = new Date();
  const thisWeekStart = getWeekStart(today);

  const thisWeekCount = workouts.filter(
    (w) => getWeekStart(new Date(w.workout.startedAt)) === thisWeekStart,
  ).length;

  const weekSet = new Set(
    workouts.map((w) => getWeekStart(new Date(w.workout.startedAt))),
  );

  let streak = 0;
  let checkDate = new Date(today);

  for (let i = 0; i < 52; i++) {
    const weekStart = getWeekStart(checkDate);
    if (weekSet.has(weekStart)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 7);
    } else if (streak === 0) {
      // No workout yet this week — look at last week before giving up
      checkDate.setDate(checkDate.getDate() - 7);
      if (!weekSet.has(getWeekStart(checkDate))) break;
    } else {
      break;
    }
  }

  return { streakWeeks: streak, thisWeekCount, thisWeekGoal };
}

// ── Body-part map ────────────────────────────────────────────────────

const BODY_PART_JA: Record<string, string> = {
  chest: "胸",
  back: "背中",
  legs: "脚",
  shoulders: "肩",
  biceps: "腕",
  triceps: "腕",
  core: "体幹",
  calves: "脚",
  glutes: "脚",
  "posterior-chain": "脚",
};

// ── Component ────────────────────────────────────────────────────────

export default function HubPage() {
  const repo = useMemo(() => createLocalWorkoutRepository(), []);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutWithSets[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [exList, withSets] = await Promise.all([
          repo.getExercises(),
          repo.listWorkoutsWithSets(),
        ]);
        setExercises(exList);
        setWorkouts(
          withSets.sort(
            (a, b) =>
              new Date(b.workout.startedAt).getTime() -
              new Date(a.workout.startedAt).getTime(),
          ),
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [repo]);

  // ── Derived data ──────────────────────────────────────────────────

  const streak = useMemo(() => computeStreak(workouts), [workouts]);

  const lastWorkout = useMemo(() => {
    if (!loading && workouts.length === 0) return null;
    const today = new Date().toISOString().slice(0, 10);
    const prev = workouts.find((w) => !w.workout.startedAt.startsWith(today));
    if (!prev) return null;

    const bpSet = new Set<string>();
    for (const s of prev.sets) {
      const ex = exercises.find((e) => e.id === s.exerciseId);
      if (ex) bpSet.add(ex.bodyPart);
    }
    const uniqueJa = Array.from(
      new Set(Array.from(bpSet).map((bp) => BODY_PART_JA[bp] ?? bp)),
    );
    const d = new Date(prev.workout.startedAt);
    return {
      dateLabel: `${d.getMonth() + 1}/${d.getDate()}`,
      bodyParts: uniqueJa,
    };
  }, [workouts, exercises, loading]);

  const topPr = useMemo(() => {
    if (workouts.length === 0) return null;
    const allSets: SetEntry[] = workouts.flatMap((w) => w.sets);
    const prs = computeExercisePrs(exercises, allSets);
    if (prs.length === 0) return null;
    const top = prs[0];

    // Find date when this PR was set
    let prDate = "";
    for (const w of workouts) {
      const found = w.sets.find(
        (s) => s.exerciseId === top.exercise.id && s.weightKg >= top.maxWeightKg,
      );
      if (found) {
        const d = new Date(w.workout.startedAt);
        prDate = `${d.getMonth() + 1}/${d.getDate()}`;
        break;
      }
    }

    return {
      exerciseName: getExerciseNameJa(top.exercise.id, top.exercise.name),
      oneRmKg: top.estimatedOneRmKg,
      date: prDate,
    };
  }, [workouts, exercises]);

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen">
      {/* ── Date + Title ── */}
      <div className="px-6 pt-12 pb-2">
        <p className="text-[11px] font-medium text-stone tracking-[0.5px] uppercase">
          {formatDateLabel()}
        </p>
        <h1 className="mt-1 text-[26px] font-black text-charcoal tracking-[-0.8px]">
          Workout
        </h1>
      </div>

      {/* ── Streak Card ── */}
      <div className="px-5 py-3">
        <div className="rounded-2xl bg-linen p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-terra-light flex items-center justify-center shrink-0">
            <Flame size={22} className="fill-terracotta text-terracotta opacity-90" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-charcoal">
              {streak.streakWeeks > 0
                ? `${streak.streakWeeks}週連続`
                : "記録を始めよう"}
            </p>
            <p className="text-[12px] text-stone mt-0.5">
              今週 {streak.thisWeekCount} / {streak.thisWeekGoal}回
            </p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            {Array.from({ length: streak.thisWeekGoal }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i < streak.thisWeekCount ? "bg-terracotta" : "bg-rim"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Start Section ── */}
      <div className="px-5 pt-2">
        <p className="text-[11px] font-semibold text-stone uppercase tracking-[1.5px] mb-3">
          Start
        </p>

        <div className="space-y-2">
          {/* 前回の続き */}
          <Link
            href="/workout"
            className="flex items-center gap-4 bg-card rounded-2xl p-4 border border-rim active:scale-[0.99] transition-transform"
          >
            <div className="w-11 h-11 rounded-xl bg-sage-light flex items-center justify-center shrink-0">
              <RotateCcw size={20} strokeWidth={2} className="stroke-charcoal" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-charcoal tracking-[-0.2px]">
                前回の続き
              </p>
              <p className="text-[12px] text-stone mt-0.5 truncate">
                {loading
                  ? "読み込み中..."
                  : lastWorkout
                  ? `${lastWorkout.bodyParts.join(" + ")} — ${lastWorkout.dateLabel}`
                  : "まだ記録がありません"}
              </p>
            </div>
            <ChevronRight size={16} strokeWidth={2} className="stroke-pale shrink-0" />
          </Link>

          {/* 部位から選ぶ */}
          <Link
            href="/exercises"
            className="flex items-center gap-4 bg-card rounded-2xl p-4 border border-rim active:scale-[0.99] transition-transform"
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "#EBF0F5" }}
            >
              <Compass size={20} strokeWidth={2} className="stroke-charcoal" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-charcoal tracking-[-0.2px]">
                部位から選ぶ
              </p>
              <p className="text-[12px] text-stone mt-0.5">新しい種目を見つける</p>
            </div>
            <ChevronRight size={16} strokeWidth={2} className="stroke-pale shrink-0" />
          </Link>

          {/* 種目を検索 */}
          <Link
            href="/exercises?search=1"
            className="flex items-center gap-4 bg-card rounded-2xl p-4 border border-rim active:scale-[0.99] transition-transform"
          >
            <div className="w-11 h-11 rounded-xl bg-linen flex items-center justify-center shrink-0">
              <Search size={20} strokeWidth={2} className="stroke-charcoal" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-charcoal tracking-[-0.2px]">
                種目を検索
              </p>
              <p className="text-[12px] text-stone mt-0.5">名前で直接探す</p>
            </div>
            <ChevronRight size={16} strokeWidth={2} className="stroke-pale shrink-0" />
          </Link>
        </div>
      </div>

      {/* ── Recent PR ── */}
      {topPr && (
        <div className="px-5 pt-5 pb-4">
          <p className="text-[11px] font-semibold text-stone uppercase tracking-[1.5px] mb-3">
            Recent
          </p>
          <div className="bg-card rounded-2xl p-4 border border-rim flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "#FBF5EE" }}
            >
              <Trophy size={18} strokeWidth={2} style={{ stroke: "#C4975A" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-charcoal truncate">
                {topPr.exerciseName}
              </p>
              <p className="text-[11px] text-stone mt-0.5">
                推定1RM {topPr.oneRmKg.toFixed(0)}kg
                {topPr.date ? ` — ${topPr.date}` : ""}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
