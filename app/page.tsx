"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { RestTimer } from "@/components/RestTimer";

// ---- 定数 ---------------------------------------------------------------

const BODY_PART_TABS = [
  { id: "chest",     label: "胸" },
  { id: "back",      label: "背中" },
  { id: "legs",      label: "脚" },
  { id: "shoulders", label: "肩" },
  { id: "arms",      label: "腕" },
  { id: "core",      label: "体幹" },
] as const;

type BodyPartTabId = (typeof BODY_PART_TABS)[number]["id"];

/** セットの感触オプション */
const FEELING_OPTIONS = [
  { value: "アップ",   emoji: "🔄", label: "アップ" },
  { value: "余裕あり", emoji: "😊", label: "余裕" },
  { value: "良い感じ", emoji: "💪", label: "良い" },
  { value: "きつい",   emoji: "🔥", label: "きつい" },
  { value: "限界",     emoji: "😵", label: "限界" },
] as const;

// ---- ヘルパー -----------------------------------------------------------

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

function createDraftSetId(): string {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function todayIso(): string {
  return new Date().toISOString();
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Web Audio API で短いビープ音を鳴らす */
function playBeep(): void {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.7);
  } catch {
    /* 非対応環境は無視 */
  }
}

function getFeelingEmoji(feeling: string | undefined): string {
  if (!feeling) return "";
  return FEELING_OPTIONS.find((f) => f.value === feeling)?.emoji ?? "";
}

// =========================================================================

export default function TodayPage() {
  const repo = useMemo(() => createLocalWorkoutRepository(), []);

  // ---- エクササイズ -------------------------------------------------------
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("");
  const [selectedBodyPart, setSelectedBodyPart] = useState<BodyPartTabId>("chest");

  // ---- 入力値 -------------------------------------------------------------
  const [currentWeight, setCurrentWeight] = useState<number>(60);
  const [currentReps,   setCurrentReps]   = useState<number>(10);
  const [currentFeeling, setCurrentFeeling] = useState<string | undefined>(undefined);

  // ---- 前回値・クイックモード ---------------------------------------------
  type Suggestion = { exerciseId: string; weightKg: number; reps: number };
  const [lastSuggestion, setLastSuggestion] = useState<Suggestion | null>(null);
  /** true = カスタム入力フォームを表示、false = クイックボタンを表示 */
  const [showCustomInput, setShowCustomInput] = useState<boolean>(true);

  // ---- セット / ワークアウト -----------------------------------------------
  const [sets,            setSets]           = useState<DraftSet[]>([]);
  const [todayWorkoutId,  setTodayWorkoutId] = useState<string | null>(null);
  const [isSaving,        setIsSaving]       = useState(false);
  const [error,           setError]          = useState<string | null>(null);
  const [info,            setInfo]           = useState<string | null>(null);

  // ---- インライン編集 -------------------------------------------------------
  const [editingSetId,    setEditingSetId]   = useState<string | null>(null);
  const [editingWeight,   setEditingWeight]  = useState<number>(0);
  const [editingReps,     setEditingReps]    = useState<number>(0);

  // ---- PR / ベスト値 -------------------------------------------------------
  const [bestWeights, setBestWeights] = useState<Record<string, number>>({});
  const [bestOneRms,  setBestOneRms]  = useState<Record<string, number>>({});
  const [prCelebration, setPrCelebration] = useState<PrCelebrationData | null>(null);

  // ---- ステップ override ---------------------------------------------------
  const [stepOverrides, setStepOverrides] = useState<Record<string, StepOption>>({});

  // ---- 最近使った種目（前回ワークアウト由来） ---------------------------------
  const [recentExerciseIds, setRecentExerciseIds] = useState<string[]>([]);

  // ---- レストタイマー -------------------------------------------------------
  const [restTimerDuration,  setRestTimerDuration]  = useState<number>(90);
  const [restTimerRemaining, setRestTimerRemaining] = useState<number | null>(null);
  const beepPlayedRef = useRef(false);

  // =========================================================================
  // Effects
  // =========================================================================

  /** エクササイズ一覧ロード */
  useEffect(() => {
    repo.getExercises()
      .then((list) => {
        setExercises(list);
        if (list.length > 0) {
          const first = list[0];
          setSelectedExerciseId(first.id);
          setSelectedBodyPart(getTabForExercise(first));
        }
      })
      .catch(() => setError("エクササイズ一覧の読み込みに失敗しました。"));
  }, [repo]);

  /** 今日のワークアウト復元 */
  useEffect(() => {
    repo.listWorkouts()
      .then((workouts) => {
        const today = todayDateString();
        const todays = workouts.filter((w) => w.startedAt.startsWith(today));
        if (todays.length === 0) return;
        const latest = todays.sort(
          (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
        )[0];
        if (!latest) return;
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

  /** 前回値ロード → 自動入力 + クイックモード切替 */
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
        setShowCustomInput(false); // 前回値があればクイックモード
      })
      .catch(() => {});
  }, [repo, selectedExerciseId]);

  /** 全ワークアウトからベスト値 + 最近使った種目を計算 */
  useEffect(() => {
    repo.listWorkoutsWithSets()
      .then((workoutsWithSets) => {
        const maxWeight: Record<string, number> = {};
        const maxOneRm:  Record<string, number> = {};
        for (const { sets: wSets } of workoutsWithSets) {
          for (const s of wSets) {
            if (s.weightKg > (maxWeight[s.exerciseId] ?? 0)) maxWeight[s.exerciseId] = s.weightKg;
            const oneRm = estimateOneRepMax(s.weightKg, s.reps);
            if (oneRm > (maxOneRm[s.exerciseId] ?? 0)) maxOneRm[s.exerciseId] = oneRm;
          }
        }
        setBestWeights(maxWeight);
        setBestOneRms(maxOneRm);

        // 直近ワークアウトの種目順を取得（今日以外で最新）
        const todayStr = todayDateString();
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

  /** レストタイマーカウントダウン（1秒ごと） */
  useEffect(() => {
    if (restTimerRemaining === null || restTimerRemaining <= 0) return;
    const id = setTimeout(() => {
      setRestTimerRemaining((prev) => {
        const next = prev !== null ? prev - 1 : null;
        if (next === 0 && !beepPlayedRef.current) {
          beepPlayedRef.current = true;
          playBeep();
        }
        return next;
      });
    }, 1000);
    return () => clearTimeout(id);
  }, [restTimerRemaining]);

  // =========================================================================
  // Derived / memos
  // =========================================================================

  const filteredExercises = useMemo(
    () => exercises.filter((e) => getTabForExercise(e) === selectedBodyPart),
    [exercises, selectedBodyPart],
  );

  const weightStep = useMemo((): StepOption => {
    const ex = exercises.find((e) => e.id === selectedExerciseId);
    return ex ? getDefaultStep(ex.name) : 2.5;
  }, [exercises, selectedExerciseId]);

  const effectiveStep = stepOverrides[selectedExerciseId] ?? weightStep;

  /**
   * Weight chips for WeightInput:
   * - "前回" and "ベスト" chips when there's history
   * - First-time preset chips when there's no history at all
   */
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

    // 初回種目：よく使う重量プリセットを提案
    if (lastSuggestion === null && chips.length === 0) {
      const ex = exercises.find((e) => e.id === selectedExerciseId);
      if (ex) {
        const isDumbbell = /dumbbell|\bdb\b/i.test(ex.name);
        const presets = isDumbbell
          ? [10, 15, 20, 25, 30, 40]
          : [20, 40, 60, 80, 100];
        presets.forEach((w) =>
          chips.push({ id: `init-${w}`, label: `${w}kg`, weightKg: w }),
        );
      }
    }

    return chips;
  }, [lastSuggestion, bestWeights, selectedExerciseId, exercises]);

  /** 今日のセットを種目ごとにグルーピング */
  const groupedSets = useMemo(() => {
    const map = new Map<string, DraftSet[]>();
    for (const s of sets) {
      const group = map.get(s.exerciseId) ?? [];
      group.push(s);
      map.set(s.exerciseId, group);
    }
    return Array.from(map.entries());
  }, [sets]);

  // =========================================================================
  // Handlers
  // =========================================================================

  /** 最近の種目をタップして選択 */
  const selectRecentExercise = (exerciseId: string) => {
    setSelectedExerciseId(exerciseId);
    const ex = exercises.find((e) => e.id === exerciseId);
    if (ex) setSelectedBodyPart(getTabForExercise(ex));
  };

  /** セット保存の本体（quick / custom 共通） */
  const submitSet = async (weightKg: number, reps: number, feeling?: string) => {
    if (!selectedExerciseId || weightKg <= 0 || reps <= 0) return;
    setIsSaving(true);
    setError(null);
    setInfo(null);

    // 1RM 基準で PR 判定
    const currentOneRm      = estimateOneRepMax(weightKg, reps);
    const previousBestOneRm = bestOneRms[selectedExerciseId];
    const isNewPr = previousBestOneRm === undefined ? true : currentOneRm > previousBestOneRm;

    try {
      let workoutId = todayWorkoutId;
      if (!workoutId) {
        const w  = await repo.createWorkout({ startedAt: todayIso() });
        workoutId = w.id;
        setTodayWorkoutId(workoutId);
      }
      await repo.addSet({
        workoutId,
        exerciseId: selectedExerciseId,
        weightKg,
        reps,
        order: sets.length,
        feeling,
      });

      setSets((prev) => [
        ...prev,
        { id: createDraftSetId(), exerciseId: selectedExerciseId, weightKg, reps, feeling },
      ]);
      setBestWeights((prev) => weightKg > (prev[selectedExerciseId] ?? 0) ? { ...prev, [selectedExerciseId]: weightKg } : prev);
      setBestOneRms((prev)  => currentOneRm > (prev[selectedExerciseId] ?? 0) ? { ...prev, [selectedExerciseId]: currentOneRm } : prev);

      // 感触リセット
      setCurrentFeeling(undefined);

      // レストタイマー開始
      beepPlayedRef.current = false;
      setRestTimerRemaining(restTimerDuration);

      if (isNewPr) {
        const ex = exercises.find((e) => e.id === selectedExerciseId);
        setPrCelebration({
          exerciseName:    ex ? getExerciseNameJa(ex.id, ex.name) : selectedExerciseId,
          weightKg,
          reps,
          newOneRmKg:      currentOneRm,
          previousOneRmKg: previousBestOneRm ?? null,
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

  const handleAddSet    = () => submitSet(currentWeight, currentReps, currentFeeling);
  const handleQuickSame = () => { if (lastSuggestion) submitSet(lastSuggestion.weightKg, lastSuggestion.reps); };
  const handleQuickPlus = () => { if (lastSuggestion) submitSet(Math.round((lastSuggestion.weightKg + effectiveStep) * 10) / 10, lastSuggestion.reps); };

  const handleDeleteSet = (id: string) => {
    setSets((prev) => prev.filter((s) => s.id !== id));
    if (editingSetId === id) setEditingSetId(null);
  };

  const handleStartEditSet  = (s: DraftSet) => { setEditingSetId(s.id); setEditingWeight(s.weightKg); setEditingReps(s.reps); };
  const handleCancelEditSet = () => setEditingSetId(null);
  const handleSaveEditSet   = () => {
    if (!editingSetId || editingWeight <= 0 || editingReps <= 0) return;
    setSets((prev) => prev.map((s) => s.id === editingSetId ? { ...s, weightKg: editingWeight, reps: editingReps } : s));
    setEditingSetId(null);
  };

  const handleSaveWorkout = async () => {
    if (sets.length === 0 && !todayWorkoutId) { setInfo("セットを追加してください。"); return; }
    setTodayWorkoutId(null);
    setSets([]);
    setRestTimerRemaining(null);
    setInfo("ワークアウトを保存しました。履歴で確認できます。");
  };

  const handleRestDurationChange = (d: number) => {
    setRestTimerDuration(d);
    setRestTimerRemaining(d); // 選択と同時にリスタート
    beepPlayedRef.current = false;
  };

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="space-y-4">
      {/* PR 演出オーバーレイ */}
      {prCelebration && (
        <PrCelebration {...prCelebration} onDismiss={() => setPrCelebration(null)} />
      )}

      {/* ── 今日のワークアウト ──────────────────────────── */}
      <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">今日のワークアウト</h2>
          <span className="text-[0.7rem] text-zinc-400">オフライン保存</span>
        </div>

        {/* ① 最近の種目ショートカット */}
        {recentExerciseIds.length > 0 && (
          <div>
            <p className="mb-1.5 text-[0.6rem] font-semibold uppercase tracking-wider text-zinc-400">
              前回の種目
            </p>
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5">
              {recentExerciseIds.map((id) => {
                const ex = exercises.find((e) => e.id === id);
                if (!ex) return null;
                const isSelected = id === selectedExerciseId;
                const todayCount = sets.filter((s) => s.exerciseId === id).length;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => selectRecentExercise(id)}
                    className={`relative shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition active:scale-[0.97] ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-400 dark:bg-emerald-900/40 dark:text-emerald-100"
                        : "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    {getExerciseNameJa(ex.id, ex.name)}
                    {todayCount > 0 && (
                      <span className="ml-1.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-[0.55rem] font-bold text-white">
                        {todayCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 部位タブ */}
        <div className="overflow-x-auto pb-0.5">
          <div className="no-scrollbar inline-flex rounded-full bg-zinc-100 p-1 text-xs dark:bg-zinc-800">
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

        {/* 種目グリッド */}
        {filteredExercises.length === 0 ? (
          <p className="text-[0.7rem] text-zinc-500">この部位のエクササイズはありません。</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filteredExercises.map((exercise) => {
              const isSelected     = exercise.id === selectedExerciseId;
              const todaySetsCount = sets.filter((s) => s.exerciseId === exercise.id).length;
              return (
                <button
                  key={exercise.id}
                  type="button"
                  onClick={() => setSelectedExerciseId(exercise.id)}
                  className={`flex h-10 items-center justify-between rounded-xl border px-3 text-xs font-medium transition active:scale-[0.98] ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-400 dark:bg-emerald-900/40 dark:text-emerald-100"
                      : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                  }`}
                >
                  <span className="truncate">{getExerciseNameJa(exercise.id, exercise.name)}</span>
                  <div className="ml-1 flex shrink-0 items-center gap-1">
                    {todaySetsCount > 0 && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[0.6rem] font-bold text-white">
                        {todaySetsCount}
                      </span>
                    )}
                    {isSelected && <span className="text-[0.65rem] font-semibold">選択中</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ── 入力エリア ────────────────────────── */}
        {selectedExerciseId && (
          <div className="space-y-2 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">

            {/* ② クイックアクション / カスタムフォーム 切り替え */}
            {lastSuggestion && !showCustomInput ? (
              /* ── クイックモード ── */
              <div className="space-y-2">
                {/* 前回と同じ（大ボタン） */}
                <button
                  type="button"
                  onClick={handleQuickSame}
                  disabled={isSaving}
                  className="flex h-14 w-full flex-col items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-sm transition active:scale-[0.98] disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900"
                >
                  <span className="text-[0.6rem] font-medium opacity-70">前回と同じ</span>
                  <span className="text-base font-black">
                    {lastSuggestion.weightKg}kg × {lastSuggestion.reps}回
                  </span>
                </button>

                {/* ＋Xkg */}
                <button
                  type="button"
                  onClick={handleQuickPlus}
                  disabled={isSaving}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white text-sm font-semibold text-zinc-800 transition active:scale-[0.98] disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <span className="text-emerald-600 dark:text-emerald-400">
                    ＋{effectiveStep}kg
                  </span>
                  <span className="text-zinc-400">→</span>
                  <span>
                    {(Math.round((lastSuggestion.weightKg + effectiveStep) * 10) / 10)}kg × {lastSuggestion.reps}回
                  </span>
                </button>

                {/* カスタム入力へ */}
                <button
                  type="button"
                  onClick={() => setShowCustomInput(true)}
                  className="h-8 w-full rounded-xl text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  カスタムで入力…
                </button>
              </div>
            ) : (
              /* ── カスタムフォーム ── */
              <div className="space-y-3">
                {/* クイックに戻るボタン（前回値がある場合のみ） */}
                {lastSuggestion && (
                  <button
                    type="button"
                    onClick={() => setShowCustomInput(false)}
                    className="flex items-center gap-1 text-xs text-zinc-400 transition hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    ← クイック入力に戻る
                  </button>
                )}

                {/* 重量 + ステップ選択 */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">重量 (kg)</label>
                    <div className="inline-flex rounded-full bg-zinc-200 p-0.5 dark:bg-zinc-700">
                      {STEP_OPTIONS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setStepOverrides((prev) => ({ ...prev, [selectedExerciseId]: s }))}
                          className={`rounded-full px-2 py-0.5 text-[0.65rem] font-medium transition ${
                            effectiveStep === s
                              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50"
                              : "text-zinc-500 dark:text-zinc-400"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <WeightInput value={currentWeight} onChange={setCurrentWeight} step={effectiveStep} chips={weightChips} />
                  <p className="text-[0.6rem] text-zinc-400">※両手合計で記録（ダンベルも合計）</p>
                </div>

                {/* 回数入力（シンプルな数値フィールド） */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">回数</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="回数を入力"
                    min={1}
                    className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                    value={currentReps > 0 ? currentReps : ""}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (!Number.isNaN(v) && v >= 0) setCurrentReps(v);
                    }}
                  />
                </div>

                {/* 感触セレクター */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    感触 <span className="font-normal text-zinc-400">（任意）</span>
                  </label>
                  <div className="flex gap-1.5">
                    {FEELING_OPTIONS.map((opt) => {
                      const isSelected = currentFeeling === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            setCurrentFeeling((prev) =>
                              prev === opt.value ? undefined : opt.value,
                            )
                          }
                          className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[0.6rem] font-medium transition active:scale-[0.95] ${
                            isSelected
                              ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                              : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                          }`}
                        >
                          <span className="text-base leading-none">{opt.emoji}</span>
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* セット追加ボタン */}
                <button
                  type="button"
                  onClick={handleAddSet}
                  disabled={!selectedExerciseId || currentWeight <= 0 || currentReps <= 0 || isSaving}
                  className="h-10 w-full rounded-full bg-zinc-900 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900"
                >
                  {isSaving ? "保存中…" : "セットを追加"}
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ④ レストタイマー */}
      {restTimerRemaining !== null && (
        <RestTimer
          remaining={restTimerRemaining}
          totalDuration={restTimerDuration}
          onDurationChange={handleRestDurationChange}
          onDismiss={() => setRestTimerRemaining(null)}
        />
      )}

      {/* ── 今日のセット ────────────────────────────────── */}
      <section className="space-y-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">今日のセット</h2>
          <span className="text-xs text-zinc-500">{sets.length} セット</span>
        </div>

        {groupedSets.length === 0 ? (
          <p className="text-xs text-zinc-500">
            まだ記録がありません。上から種目を選んで追加しましょう。
          </p>
        ) : (
          <div className="space-y-4">
            {groupedSets.map(([exerciseId, groupSets]) => {
              const ex = exercises.find((e) => e.id === exerciseId);
              const exName = ex ? getExerciseNameJa(ex.id, ex.name) : "（不明）";
              const totalVolume = groupSets.reduce((sum, s) => sum + s.weightKg * s.reps, 0);
              return (
                <div key={exerciseId}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">{exName}</span>
                    <span className="text-[0.7rem] text-zinc-400">
                      {groupSets.length}セット・{totalVolume.toLocaleString()}kg
                    </span>
                  </div>
                  <ul className="space-y-1 text-xs">
                    {groupSets.map((set, idx) => {
                      const isEditing = set.id === editingSetId;
                      const feelingEmoji = getFeelingEmoji(set.feeling);
                      return (
                        <li key={set.id} className="flex items-center gap-2 rounded-lg bg-zinc-50 px-2.5 py-1.5 dark:bg-zinc-800/80">
                          <span className="w-5 shrink-0 text-center text-[0.65rem] font-bold text-zinc-400">{idx + 1}</span>
                          <div className="flex flex-1 items-center">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <span className="text-[0.7rem] text-zinc-500">重量</span>
                                  <input type="number" inputMode="decimal"
                                    className="h-7 w-20 rounded-lg border border-zinc-200 bg-white px-2 text-[0.75rem] outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
                                    value={Number.isNaN(editingWeight) ? "" : editingWeight}
                                    onChange={(e) => setEditingWeight(e.target.value === "" ? 0 : Number(e.target.value))}
                                  />
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-[0.7rem] text-zinc-500">回数</span>
                                  <input type="number" inputMode="numeric"
                                    className="h-7 w-16 rounded-lg border border-zinc-200 bg-white px-2 text-[0.75rem] outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
                                    value={Number.isNaN(editingReps) ? "" : editingReps}
                                    onChange={(e) => setEditingReps(e.target.value === "" ? 0 : Number(e.target.value))}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                                {set.weightKg}kg × {set.reps}回
                                {feelingEmoji && (
                                  <span className="ml-1.5 text-base leading-none" title={set.feeling}>
                                    {feelingEmoji}
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-0.5">
                            {isEditing ? (
                              <>
                                <button type="button" onClick={handleSaveEditSet}
                                  className="h-6 rounded-full bg-emerald-600 px-2 text-[0.7rem] font-semibold text-white active:scale-[0.97] dark:bg-emerald-500">
                                  保存
                                </button>
                                <button type="button" onClick={handleCancelEditSet}
                                  className="h-6 rounded-full px-2 text-[0.7rem] text-zinc-500 hover:bg-zinc-200/70 dark:text-zinc-300">
                                  取消
                                </button>
                              </>
                            ) : (
                              <>
                                <button type="button" onClick={() => handleStartEditSet(set)}
                                  className="h-6 rounded-full px-2 text-[0.7rem] text-zinc-500 hover:bg-zinc-200/70 dark:text-zinc-300">
                                  編集
                                </button>
                                <button type="button" onClick={() => handleDeleteSet(set.id)}
                                  className="h-6 rounded-full px-2 text-[0.7rem] text-red-500 hover:bg-red-50 dark:text-red-400">
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
        )}

        <button
          type="button"
          onClick={handleSaveWorkout}
          disabled={sets.length === 0 && !todayWorkoutId}
          className="mt-2 h-10 w-full rounded-full bg-emerald-600 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-40 dark:bg-emerald-500"
        >
          ワークアウトを完了する
        </button>

        {error && <p className="mt-1 text-xs text-red-500" role="alert">{error}</p>}
        {info && !error && <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">{info}</p>}
      </section>
    </div>
  );
}
