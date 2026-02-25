"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Minus,
  Plus,
} from "lucide-react";
import { createLocalWorkoutRepository } from "@/data/localRepository";
import type { Exercise } from "@/domain/models";
import { estimateOneRepMax } from "@/domain/pr";
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

// ── Constants ────────────────────────────────────────────────────────

const BODY_PART_TABS = [
  { id: "chest",     label: "胸" },
  { id: "back",      label: "背中" },
  { id: "legs",      label: "脚" },
  { id: "shoulders", label: "肩" },
  { id: "arms",      label: "腕" },
  { id: "core",      label: "体幹" },
] as const;

type BodyPartTabId = (typeof BODY_PART_TABS)[number]["id"];

const REST_PRESETS = [60, 90, 120] as const;

// ── Helpers ─────────────────────────────────────────────────────────

type DraftSet = {
  id: string;
  exerciseId: string;
  weightKg: number;
  reps: number;
  feeling?: string;
};

function getTabForExercise(exercise: Exercise): BodyPartTabId {
  switch (exercise.bodyPart) {
    case "chest":      return "chest";
    case "back":       return "back";
    case "shoulders":  return "shoulders";
    case "biceps":
    case "triceps":    return "arms";
    case "legs":
    case "calves":
    case "glutes":
    case "posterior-chain": return "legs";
    case "core":
    default:           return "core";
  }
}

function createDraftId(): string {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function todayIso(): string { return new Date().toISOString(); }
function todayDate(): string { return new Date().toISOString().slice(0, 10); }

function formatTimer(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function playBeep(): void {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.7);
  } catch { /* ignore */ }
}

// ── Inner component (uses useSearchParams) ──────────────────────────

function WorkoutInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialExerciseId = searchParams.get("exerciseId") ?? "";

  const repo = useMemo(() => createLocalWorkoutRepository(), []);

  // ── Exercise state ─────────────────────────────────────────────
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(initialExerciseId);
  const [selectedBodyPart, setSelectedBodyPart] = useState<BodyPartTabId>("chest");

  // ── Input values ───────────────────────────────────────────────
  const [currentWeight, setCurrentWeight] = useState<number>(60);
  const [currentReps, setCurrentReps] = useState<number>(10);

  // ── Last suggestion / quick mode ───────────────────────────────
  type Suggestion = { exerciseId: string; weightKg: number; reps: number };
  const [lastSuggestion, setLastSuggestion] = useState<Suggestion | null>(null);
  const [showCustomInput, setShowCustomInput] = useState<boolean>(true);

  // ── Sets / workout ─────────────────────────────────────────────
  const [sets, setSets] = useState<DraftSet[]>([]);
  const [todayWorkoutId, setTodayWorkoutId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // ── Inline edit ───────────────────────────────────────────────
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editingWeight, setEditingWeight] = useState<number>(0);
  const [editingReps, setEditingReps] = useState<number>(0);

  // ── PR / best ─────────────────────────────────────────────────
  const [bestWeights, setBestWeights] = useState<Record<string, number>>({});
  const [bestOneRms, setBestOneRms] = useState<Record<string, number>>({});
  const [prCelebration, setPrCelebration] = useState<PrCelebrationData | null>(null);

  // ── Step overrides ────────────────────────────────────────────
  const [stepOverrides, setStepOverrides] = useState<Record<string, StepOption>>({});

  // ── Recent exercises ──────────────────────────────────────────
  const [recentExerciseIds, setRecentExerciseIds] = useState<string[]>([]);

  // ── Rest timer ────────────────────────────────────────────────
  const [restDuration, setRestDuration] = useState<number>(90);
  const [restRemaining, setRestRemaining] = useState<number | null>(null);
  const beepPlayed = useRef(false);

  // ── Effects ───────────────────────────────────────────────────

  useEffect(() => {
    repo.getExercises()
      .then((list) => {
        setExercises(list);
        if (initialExerciseId) {
          const ex = list.find((e) => e.id === initialExerciseId);
          if (ex) setSelectedBodyPart(getTabForExercise(ex));
        }
      })
      .catch(() => setError("エクササイズ一覧の読み込みに失敗しました。"));
  }, [repo, initialExerciseId]);

  useEffect(() => {
    repo.listWorkouts()
      .then((workouts) => {
        const today = todayDate();
        const todays = workouts
          .filter((w) => w.startedAt.startsWith(today))
          .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
        if (todays.length === 0) return;
        const latest = todays[0];
        setTodayWorkoutId(latest.id);
        return repo.listSetsForWorkout(latest.id);
      })
      .then((setsList) => {
        if (!setsList) return;
        setSets(
          setsList.sort((a, b) => a.order - b.order).map((s) => ({
            id: s.id,
            exerciseId: s.exerciseId,
            weightKg: s.weightKg,
            reps: s.reps,
            feeling: s.feeling,
          })),
        );
      })
      .catch(() => {});
  }, [repo]);

  useEffect(() => {
    if (!selectedExerciseId) return;
    repo.getLastSetForExercise(selectedExerciseId)
      .then((set) => {
        if (!set) {
          setLastSuggestion(null);
          setShowCustomInput(true);
          return;
        }
        setLastSuggestion({ exerciseId: set.exerciseId, weightKg: set.weightKg, reps: set.reps });
        setCurrentWeight(set.weightKg);
        setCurrentReps(set.reps);
        setShowCustomInput(false);
      })
      .catch(() => {});
  }, [repo, selectedExerciseId]);

  useEffect(() => {
    repo.listWorkoutsWithSets()
      .then((workoutsWithSets) => {
        const maxWeight: Record<string, number> = {};
        const maxOneRm: Record<string, number> = {};
        for (const { sets: wSets } of workoutsWithSets) {
          for (const s of wSets) {
            if (s.weightKg > (maxWeight[s.exerciseId] ?? 0)) maxWeight[s.exerciseId] = s.weightKg;
            const orm = estimateOneRepMax(s.weightKg, s.reps);
            if (orm > (maxOneRm[s.exerciseId] ?? 0)) maxOneRm[s.exerciseId] = orm;
          }
        }
        setBestWeights(maxWeight);
        setBestOneRms(maxOneRm);

        const todayStr = todayDate();
        const prev = workoutsWithSets
          .filter((w) => !w.workout.startedAt.startsWith(todayStr))
          .sort((a, b) =>
            new Date(b.workout.startedAt).getTime() - new Date(a.workout.startedAt).getTime(),
          );
        if (prev.length > 0) {
          const seen = new Set<string>();
          const ids: string[] = [];
          for (const s of prev[0].sets) {
            if (!seen.has(s.exerciseId)) { seen.add(s.exerciseId); ids.push(s.exerciseId); }
          }
          setRecentExerciseIds(ids.slice(0, 6));
        }
      })
      .catch(() => {});
  }, [repo]);

  useEffect(() => {
    if (restRemaining === null || restRemaining <= 0) return;
    const id = setTimeout(() => {
      setRestRemaining((prev) => {
        const next = prev !== null ? prev - 1 : null;
        if (next === 0 && !beepPlayed.current) {
          beepPlayed.current = true;
          playBeep();
        }
        return next;
      });
    }, 1000);
    return () => clearTimeout(id);
  }, [restRemaining]);

  // ── Derived ──────────────────────────────────────────────────

  const filteredExercises = useMemo(
    () => exercises.filter((e) => getTabForExercise(e) === selectedBodyPart),
    [exercises, selectedBodyPart],
  );

  const weightStep = useMemo((): StepOption => {
    const ex = exercises.find((e) => e.id === selectedExerciseId);
    return ex ? getDefaultStep(ex.name) : 2.5;
  }, [exercises, selectedExerciseId]);

  const effectiveStep = stepOverrides[selectedExerciseId] ?? weightStep;

  const weightChips = useMemo<WeightChip[]>(() => {
    const chips: WeightChip[] = [];
    if (lastSuggestion?.exerciseId === selectedExerciseId) {
      const { weightKg, reps } = lastSuggestion;
      chips.push({
        id: "prev",
        label: `前回 ${weightKg}kg × ${reps}回`,
        weightKg,
        onSelect: () => { setCurrentWeight(weightKg); setCurrentReps(reps); },
      });
    }
    const best = bestWeights[selectedExerciseId];
    if (best != null && best !== lastSuggestion?.weightKg) {
      chips.push({ id: "best", label: `ベスト ${best}kg`, weightKg: best });
    }
    if (lastSuggestion === null && chips.length === 0) {
      const ex = exercises.find((e) => e.id === selectedExerciseId);
      if (ex) {
        const isDumbbell = /dumbbell|\bdb\b/i.test(ex.name);
        const presets = isDumbbell ? [10, 15, 20, 25, 30, 40] : [20, 40, 60, 80, 100];
        presets.forEach((w) => chips.push({ id: `init-${w}`, label: `${w}kg`, weightKg: w }));
      }
    }
    return chips;
  }, [lastSuggestion, bestWeights, selectedExerciseId, exercises]);

  const groupedSets = useMemo(() => {
    const map = new Map<string, DraftSet[]>();
    for (const s of sets) {
      const group = map.get(s.exerciseId) ?? [];
      group.push(s);
      map.set(s.exerciseId, group);
    }
    return Array.from(map.entries());
  }, [sets]);

  // ── Handlers ────────────────────────────────────────────────

  const selectExercise = (exerciseId: string) => {
    setSelectedExerciseId(exerciseId);
    const ex = exercises.find((e) => e.id === exerciseId);
    if (ex) setSelectedBodyPart(getTabForExercise(ex));
  };

  const submitSet = async (weightKg: number, reps: number, feeling?: string) => {
    if (!selectedExerciseId || weightKg <= 0 || reps <= 0) return;
    setIsSaving(true);
    setError(null);
    setInfo(null);

    const currentOneRm = estimateOneRepMax(weightKg, reps);
    const prevBestOneRm = bestOneRms[selectedExerciseId];
    const isNewPr = prevBestOneRm === undefined ? true : currentOneRm > prevBestOneRm;

    try {
      let workoutId = todayWorkoutId;
      if (!workoutId) {
        const w = await repo.createWorkout({ startedAt: todayIso() });
        workoutId = w.id;
        setTodayWorkoutId(workoutId);
      }
      await repo.addSet({ workoutId, exerciseId: selectedExerciseId, weightKg, reps, order: sets.length, feeling });

      setSets((prev) => [...prev, { id: createDraftId(), exerciseId: selectedExerciseId, weightKg, reps, feeling }]);
      setBestWeights((prev) => weightKg > (prev[selectedExerciseId] ?? 0) ? { ...prev, [selectedExerciseId]: weightKg } : prev);
      setBestOneRms((prev) => currentOneRm > (prev[selectedExerciseId] ?? 0) ? { ...prev, [selectedExerciseId]: currentOneRm } : prev);

      beepPlayed.current = false;
      setRestRemaining(restDuration);

      if (isNewPr) {
        const ex = exercises.find((e) => e.id === selectedExerciseId);
        setPrCelebration({
          exerciseName: ex ? getExerciseNameJa(ex.id, ex.name) : selectedExerciseId,
          weightKg,
          reps,
          newOneRmKg: currentOneRm,
          previousOneRmKg: prevBestOneRm ?? null,
        });
      } else {
        setInfo("記録しました。");
      }
    } catch {
      setError("保存に失敗しました。");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSet    = () => submitSet(currentWeight, currentReps);
  const handleQuickSame = () => { if (lastSuggestion) submitSet(lastSuggestion.weightKg, lastSuggestion.reps); };
  const handleQuickPlus = () => {
    if (lastSuggestion) submitSet(Math.round((lastSuggestion.weightKg + effectiveStep) * 10) / 10, lastSuggestion.reps);
  };

  const handleDeleteSet = (id: string) => {
    setSets((prev) => prev.filter((s) => s.id !== id));
    if (editingSetId === id) setEditingSetId(null);
  };

  const handleStartEdit  = (s: DraftSet) => { setEditingSetId(s.id); setEditingWeight(s.weightKg); setEditingReps(s.reps); };
  const handleCancelEdit = () => setEditingSetId(null);
  const handleSaveEdit   = () => {
    if (!editingSetId || editingWeight <= 0 || editingReps <= 0) return;
    setSets((prev) => prev.map((s) => s.id === editingSetId ? { ...s, weightKg: editingWeight, reps: editingReps } : s));
    setEditingSetId(null);
  };

  const handleComplete = async () => {
    if (sets.length === 0 && !todayWorkoutId) { setInfo("セットを追加してください。"); return; }
    setTodayWorkoutId(null);
    setSets([]);
    setRestRemaining(null);
    router.push("/");
  };

  const handleRestPreset = (d: number) => {
    setRestDuration(d);
    setRestRemaining(d);
    beepPlayed.current = false;
  };

  // ── Selected exercise name ────────────────────────────────────
  const selectedEx = exercises.find((e) => e.id === selectedExerciseId);
  const selectedExName = selectedEx ? getExerciseNameJa(selectedEx.id, selectedEx.name) : "";
  const todaySetsForSelected = sets.filter((s) => s.exerciseId === selectedExerciseId);

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="min-h-screen">
      {prCelebration && (
        <PrCelebration {...prCelebration} onDismiss={() => setPrCelebration(null)} />
      )}

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-5 pt-10 pb-4">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-card border border-rim active:scale-[0.95] transition-transform"
        >
          <ArrowLeft size={18} strokeWidth={2} className="stroke-stone" />
        </button>
        <div className="flex-1">
          <h1 className="text-[18px] font-black text-charcoal tracking-[-0.5px]">
            {selectedExName || "ワークアウト"}
          </h1>
          {lastSuggestion?.exerciseId === selectedExerciseId && (
            <p className="text-[11px] text-stone">
              前回 {lastSuggestion.weightKg}kg × {lastSuggestion.reps}回
            </p>
          )}
        </div>
        {todaySetsForSelected.length > 0 && (
          <span className="text-[11px] font-semibold text-stone bg-card border border-rim rounded-full px-3 py-1">
            {todaySetsForSelected.length} セット
          </span>
        )}
      </div>

      {/* ── Recent exercise shortcuts ── */}
      {recentExerciseIds.length > 0 && (
        <div className="px-5 mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-[1.2px] text-stone mb-2">
            前回の種目
          </p>
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5">
            {recentExerciseIds.map((id) => {
              const ex = exercises.find((e) => e.id === id);
              if (!ex) return null;
              const isActive = id === selectedExerciseId;
              const count = sets.filter((s) => s.exerciseId === id).length;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectExercise(id)}
                  className={`relative shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition active:scale-[0.97] ${
                    isActive
                      ? "border-terracotta bg-terra-light text-terracotta"
                      : "border-rim bg-card text-stone"
                  }`}
                >
                  {getExerciseNameJa(ex.id, ex.name)}
                  {count > 0 && (
                    <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-terracotta text-[9px] font-bold text-white">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Body part tabs ── */}
      <div className="px-5 mb-3">
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
          {BODY_PART_TABS.map((tab) => {
            const isActive = tab.id === selectedBodyPart;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedBodyPart(tab.id)}
                className={`shrink-0 rounded-[10px] border px-4 py-2 text-[13px] font-semibold transition ${
                  isActive
                    ? "bg-terracotta border-terracotta text-white"
                    : "bg-card border-rim text-charcoal"
                }`}
                style={isActive ? { boxShadow: "0 2px 8px rgba(196,112,90,0.3)" } : {}}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Exercise grid ── */}
      <div className="px-5 mb-4">
        {filteredExercises.length === 0 ? (
          <p className="text-[12px] text-stone py-2">この部位の種目がありません。</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filteredExercises.map((ex) => {
              const isSelected = ex.id === selectedExerciseId;
              const count = sets.filter((s) => s.exerciseId === ex.id).length;
              return (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => setSelectedExerciseId(ex.id)}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-[13px] font-semibold transition active:scale-[0.98] ${
                    isSelected
                      ? "border-terracotta bg-terra-light text-terracotta"
                      : "border-rim bg-card text-charcoal hover:border-stone"
                  }`}
                  style={isSelected ? { boxShadow: "0 1px 4px rgba(196,112,90,0.2)" } : {}}
                >
                  <span className="truncate">{getExerciseNameJa(ex.id, ex.name)}</span>
                  {count > 0 && (
                    <span className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-terracotta text-[10px] font-bold text-white">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Edit Panel ── */}
      {selectedExerciseId && (
        <div className="px-5 mb-4">
          <div
            className="rounded-2xl bg-card border border-rim p-4"
            style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.03)" }}
          >
            <p className="text-[11px] font-semibold text-stone uppercase tracking-[0.5px] mb-3">
              {lastSuggestion?.exerciseId === selectedExerciseId
                ? `SET ${sets.filter((s) => s.exerciseId === selectedExerciseId).length + 1}`
                : "新しいセット"}
            </p>

            {/* Quick mode */}
            {lastSuggestion && !showCustomInput ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleQuickSame}
                  disabled={isSaving}
                  className="h-14 w-full flex flex-col items-center justify-center rounded-xl text-white transition active:scale-[0.98] disabled:opacity-40"
                  style={{ background: "#C4705A", boxShadow: "0 4px 14px rgba(196,112,90,0.35)" }}
                >
                  <span className="text-[10px] font-medium opacity-80">前回と同じ</span>
                  <span className="text-[17px] font-black tracking-[-0.3px]">
                    {lastSuggestion.weightKg}kg × {lastSuggestion.reps}回
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleQuickPlus}
                  disabled={isSaving}
                  className="h-11 w-full flex items-center justify-center gap-2 rounded-xl border border-rim bg-ivory text-[14px] font-semibold text-charcoal transition active:scale-[0.98] disabled:opacity-40"
                >
                  <span className="text-terracotta">＋{effectiveStep}kg</span>
                  <span className="text-pale">→</span>
                  <span>
                    {Math.round((lastSuggestion.weightKg + effectiveStep) * 10) / 10}kg × {lastSuggestion.reps}回
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCustomInput(true)}
                  className="w-full py-2 text-[12px] font-medium text-stone rounded-xl hover:bg-ivory transition"
                >
                  カスタムで入力…
                </button>
              </div>
            ) : (
              /* Custom form */
              <div className="space-y-4">
                {lastSuggestion && (
                  <button
                    type="button"
                    onClick={() => setShowCustomInput(false)}
                    className="flex items-center gap-1 text-[12px] text-stone hover:text-charcoal transition"
                  >
                    <ArrowLeft size={12} /> クイック入力に戻る
                  </button>
                )}

                {/* Steppers row */}
                <div className="flex gap-3">
                  {/* Weight */}
                  <div className="flex-1">
                    <p className="text-[10px] font-semibold text-stone uppercase tracking-[0.5px] mb-2">重量</p>
                    <div className="flex items-center gap-1 rounded-xl bg-ivory p-1">
                      <button
                        type="button"
                        onClick={() => setCurrentWeight((v) => Math.max(0, Math.round((v - effectiveStep) * 10) / 10))}
                        className="h-9 w-9 rounded-lg bg-card flex items-center justify-center active:scale-[0.95] transition"
                        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
                      >
                        <Minus size={14} strokeWidth={2.5} className="stroke-charcoal" />
                      </button>
                      <div className="flex-1 text-center text-[24px] font-black text-charcoal tracking-[-0.5px]">
                        {currentWeight}
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentWeight((v) => Math.round((v + effectiveStep) * 10) / 10)}
                        className="h-9 w-9 rounded-lg bg-card flex items-center justify-center active:scale-[0.95] transition"
                        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
                      >
                        <Plus size={14} strokeWidth={2.5} className="stroke-charcoal" />
                      </button>
                    </div>
                    <p className="text-[10px] text-pale text-center mt-1">kg</p>
                  </div>

                  {/* Reps */}
                  <div className="flex-1">
                    <p className="text-[10px] font-semibold text-stone uppercase tracking-[0.5px] mb-2">回数</p>
                    <div className="flex items-center gap-1 rounded-xl bg-ivory p-1">
                      <button
                        type="button"
                        onClick={() => setCurrentReps((v) => Math.max(1, v - 1))}
                        className="h-9 w-9 rounded-lg bg-card flex items-center justify-center active:scale-[0.95] transition"
                        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
                      >
                        <Minus size={14} strokeWidth={2.5} className="stroke-charcoal" />
                      </button>
                      <div className="flex-1 text-center text-[24px] font-black text-charcoal tracking-[-0.5px]">
                        {currentReps}
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentReps((v) => v + 1)}
                        className="h-9 w-9 rounded-lg bg-card flex items-center justify-center active:scale-[0.95] transition"
                        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
                      >
                        <Plus size={14} strokeWidth={2.5} className="stroke-charcoal" />
                      </button>
                    </div>
                    <p className="text-[10px] text-pale text-center mt-1">回</p>
                  </div>
                </div>

                {/* Step toggle */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-stone">ステップ</span>
                  <div className="flex gap-1">
                    {STEP_OPTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStepOverrides((prev) => ({ ...prev, [selectedExerciseId]: s }))}
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                          effectiveStep === s
                            ? "bg-charcoal text-white"
                            : "bg-ivory text-stone border border-rim"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Weight chips */}
                {weightChips.length > 0 && (
                  <WeightInput
                    value={currentWeight}
                    onChange={setCurrentWeight}
                    step={effectiveStep}
                    chips={weightChips}
                  />
                )}

                <p className="text-[10px] text-pale">※両手合計で記録（ダンベルも合計）</p>

                {/* CTA */}
                <button
                  type="button"
                  onClick={handleAddSet}
                  disabled={!selectedExerciseId || currentWeight <= 0 || currentReps <= 0 || isSaving}
                  className="w-full py-3.5 rounded-xl text-[15px] font-bold text-white tracking-[0.2px] transition active:scale-[0.97] disabled:opacity-40"
                  style={{ background: "#C4705A", boxShadow: "0 4px 14px rgba(196,112,90,0.35)" }}
                >
                  {isSaving ? "保存中…" : `${currentWeight}kg × ${currentReps} を記録`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Today's sets ── */}
      {groupedSets.length > 0 && (
        <div className="px-5 mb-4">
          <p className="text-[11px] font-semibold text-stone uppercase tracking-[1.5px] mb-3">
            今日のセット
          </p>
          <div className="space-y-4">
            {groupedSets.map(([exerciseId, groupSets]) => {
              const ex = exercises.find((e) => e.id === exerciseId);
              const exName = ex ? getExerciseNameJa(ex.id, ex.name) : "（不明）";
              const totalVol = groupSets.reduce((s, x) => s + x.weightKg * x.reps, 0);
              return (
                <div key={exerciseId}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[13px] font-bold text-charcoal">{exName}</span>
                    <span className="text-[11px] text-stone">
                      {groupSets.length}セット · {totalVol.toLocaleString()}kg
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {groupSets.map((set, idx) => {
                      const isEditing = set.id === editingSetId;
                      return (
                        <li
                          key={set.id}
                          className="flex items-center gap-2.5 rounded-xl border border-sage-light bg-sage-light px-3 py-2.5"
                          style={{ opacity: 0.85 }}
                        >
                          <div className="h-6 w-6 shrink-0 flex items-center justify-center rounded-lg bg-sage">
                            <Check size={12} strokeWidth={3} className="stroke-white" />
                          </div>
                          <span className="text-[12px] font-semibold text-stone w-5 text-center">
                            #{idx + 1}
                          </span>
                          <div className="flex-1">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  className="h-7 w-20 rounded-lg border border-rim bg-white px-2 text-[12px] outline-none"
                                  value={editingWeight || ""}
                                  onChange={(e) => setEditingWeight(Number(e.target.value))}
                                />
                                <span className="text-[11px] text-stone">×</span>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  className="h-7 w-14 rounded-lg border border-rim bg-white px-2 text-[12px] outline-none"
                                  value={editingReps || ""}
                                  onChange={(e) => setEditingReps(Number(e.target.value))}
                                />
                              </div>
                            ) : (
                              <span className="text-[15px] font-bold text-charcoal tracking-[-0.3px]">
                                {set.weightKg}kg × {set.reps}
                              </span>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-0.5">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={handleSaveEdit}
                                  className="rounded-full bg-sage px-2.5 py-1 text-[11px] font-bold text-white"
                                >
                                  保存
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEdit}
                                  className="rounded-full px-2.5 py-1 text-[11px] text-stone"
                                >
                                  取消
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(set)}
                                  className="rounded-full px-2.5 py-1 text-[11px] text-stone hover:bg-white/50 transition"
                                >
                                  編集
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSet(set.id)}
                                  className="rounded-full px-2.5 py-1 text-[11px] text-red-400 hover:bg-red-50 transition"
                                >
                                  削除
                                </button>
                              </>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Complete button */}
          <button
            type="button"
            onClick={handleComplete}
            disabled={sets.length === 0 && !todayWorkoutId}
            className="mt-5 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-sage text-sage text-[14px] font-bold transition active:scale-[0.98] disabled:opacity-40"
          >
            <CheckCircle2 size={18} strokeWidth={2} />
            ワークアウトを完了する
          </button>
        </div>
      )}

      {/* ── Empty state ── */}
      {groupedSets.length === 0 && !selectedExerciseId && (
        <div className="px-5 py-4 text-center">
          <p className="text-[13px] text-stone">
            種目を選んでセットを記録しましょう。
          </p>
        </div>
      )}

      {error && <p className="px-5 text-[12px] text-red-500 mt-1">{error}</p>}
      {info && !error && <p className="px-5 text-[12px] text-sage mt-1">{info}</p>}

      {/* ── Rest Timer Bar ── */}
      {restRemaining !== null && (
        <div
          className="fixed inset-x-0 bottom-[60px] z-10 mx-auto max-w-md px-4"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div
            className="rounded-2xl border border-rim bg-ivory/95 backdrop-blur-lg px-4 py-3 flex items-center justify-between"
            style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
          >
            <div className="flex items-center gap-2.5">
              <Clock size={16} strokeWidth={2} className="stroke-stone" />
              <span
                className={`text-[22px] font-black tracking-[-0.5px] tabular-nums ${
                  restRemaining === 0 ? "text-terracotta" : "text-charcoal"
                }`}
              >
                {restRemaining === 0 ? "GO!" : formatTimer(restRemaining)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {REST_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleRestPreset(p)}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
                    restDuration === p && restRemaining !== null && restRemaining > 0
                      ? "bg-terracotta text-white"
                      : "bg-card border border-rim text-stone"
                  }`}
                  style={
                    restDuration === p && restRemaining !== null && restRemaining > 0
                      ? { boxShadow: "0 2px 8px rgba(196,112,90,0.3)" }
                      : {}
                  }
                >
                  {p < 60 ? `${p}s` : `${p / 60}:00`}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setRestRemaining(null)}
                className="rounded-lg bg-card border border-rim px-2.5 py-1.5 text-[11px] font-semibold text-stone"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page export (Suspense boundary for useSearchParams) ──────────────

export default function WorkoutPage() {
  return (
    <Suspense fallback={<div className="px-6 pt-12 text-stone text-[13px]">読み込み中...</div>}>
      <WorkoutInner />
    </Suspense>
  );
}
