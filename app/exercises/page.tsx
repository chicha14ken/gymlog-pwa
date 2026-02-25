"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { createLocalWorkoutRepository } from "@/data/localRepository";
import type { Exercise } from "@/domain/models";
import { getExerciseNameJa } from "@/lib/exerciseNames";

// ── Body part tabs ────────────────────────────────────────────────────

const BODY_PART_TABS = [
  { id: "chest",     label: "胸" },
  { id: "back",      label: "背中" },
  { id: "legs",      label: "脚" },
  { id: "shoulders", label: "肩" },
  { id: "arms",      label: "腕" },
  { id: "core",      label: "体幹" },
] as const;

type BodyPartTabId = (typeof BODY_PART_TABS)[number]["id"];

// ── Category detection ────────────────────────────────────────────────

const CATEGORIES = ["すべて", "マシン", "バーベル", "ダンベル", "ケーブル", "自重"] as const;
type Category = (typeof CATEGORIES)[number];

function getCategory(exercise: Exercise): Category {
  const n = exercise.name.toLowerCase();
  if (n.includes("cable")) return "ケーブル";
  if (
    n.includes("machine") ||
    n.includes("pec deck") ||
    n.includes("leg press") ||
    n.includes("chest press") ||
    n.includes("seated row") ||
    n.includes("smith")
  )
    return "マシン";
  if (n.includes("dumbbell") || /\bdb\b/.test(n)) return "ダンベル";
  const bodyweight = [
    "push-up", "pull-up", "chin-up", "dip", "plank",
    "dead bug", "ab wheel", "leg raise", "crunches", "russian twist",
    "nordic curl", "hanging leg raise",
  ];
  if (bodyweight.some((bw) => n.includes(bw))) return "自重";
  return "バーベル";
}

// ── Badges ────────────────────────────────────────────────────────────

const BEGINNER_EXERCISES = [
  "chest press machine", "pec deck", "leg press",
  "lat pulldown", "seated cable row", "cable row",
  "machine shoulder press",
];

const RECOMMENDED_EXERCISES = [
  "bench press", "squat", "deadlift", "pull-up", "barbell overhead press",
  "barbell row", "romanian deadlift", "hip thrust",
];

function getBadge(exercise: Exercise): { label: string; type: "beginner" | "recommended" } | null {
  const n = exercise.name.toLowerCase();
  if (BEGINNER_EXERCISES.some((b) => n.includes(b))) return { label: "初心者向け", type: "beginner" };
  if (RECOMMENDED_EXERCISES.some((r) => n.includes(r))) return { label: "おすすめ", type: "recommended" };
  return null;
}

// ── Tab → bodyPart filter ──────────────────────────────────────────

function filterByTab(exercises: Exercise[], tabId: BodyPartTabId): Exercise[] {
  return exercises.filter((e) => {
    switch (tabId) {
      case "chest":     return e.bodyPart === "chest";
      case "back":      return e.bodyPart === "back";
      case "legs":      return ["legs", "calves", "glutes", "posterior-chain"].includes(e.bodyPart);
      case "shoulders": return e.bodyPart === "shoulders";
      case "arms":      return ["biceps", "triceps"].includes(e.bodyPart);
      case "core":      return e.bodyPart === "core";
    }
  });
}

// ── Inner component ───────────────────────────────────────────────────

function ExercisesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showSearch = searchParams.get("search") === "1";

  const repo = useMemo(() => createLocalWorkoutRepository(), []);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [lastValues, setLastValues] = useState<Record<string, { weightKg: number; reps: number }>>({});
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<BodyPartTabId>("chest");
  const [activeCategory, setActiveCategory] = useState<Category>("すべて");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchMode, setIsSearchMode] = useState(showSearch);

  useEffect(() => {
    async function load() {
      try {
        const list = await repo.getExercises();
        setExercises(list);

        // Load last values for all exercises
        const vals: Record<string, { weightKg: number; reps: number }> = {};
        await Promise.all(
          list.map(async (ex) => {
            const s = await repo.getLastSetForExercise(ex.id);
            if (s) vals[ex.id] = { weightKg: s.weightKg, reps: s.reps };
          }),
        );
        setLastValues(vals);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [repo]);

  const filteredExercises = useMemo(() => {
    if (isSearchMode) {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return exercises;
      return exercises.filter((e) => {
        const ja = getExerciseNameJa(e.id, e.name).toLowerCase();
        return ja.includes(q) || e.name.toLowerCase().includes(q);
      });
    }

    let list = filterByTab(exercises, activeTab);
    if (activeCategory !== "すべて") {
      list = list.filter((e) => getCategory(e) === activeCategory);
    }

    // Sort: machines first, then by name
    return list.sort((a, b) => {
      const aCat = getCategory(a);
      const bCat = getCategory(b);
      if (aCat === "マシン" && bCat !== "マシン") return -1;
      if (bCat === "マシン" && aCat !== "マシン") return 1;
      return getExerciseNameJa(a.id, a.name).localeCompare(getExerciseNameJa(b.id, b.name), "ja");
    });
  }, [exercises, activeTab, activeCategory, isSearchMode, searchQuery]);

  const handleSelect = (exerciseId: string) => {
    router.push(`/workout?exerciseId=${exerciseId}`);
  };

  return (
    <div className="min-h-screen">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-5 pt-10 pb-4">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-card border border-rim active:scale-[0.95] transition-transform"
        >
          <ArrowLeft size={18} strokeWidth={2} className="stroke-stone" />
        </button>
        <h1 className="text-[20px] font-black text-charcoal tracking-[-0.5px]">
          {isSearchMode ? "種目を検索" : "部位から選ぶ"}
        </h1>
        {!isSearchMode && (
          <button
            type="button"
            onClick={() => setIsSearchMode(true)}
            className="ml-auto text-[12px] font-semibold text-stone underline"
          >
            検索
          </button>
        )}
        {isSearchMode && (
          <button
            type="button"
            onClick={() => { setIsSearchMode(false); setSearchQuery(""); }}
            className="ml-auto text-[12px] font-semibold text-stone underline"
          >
            部位で絞る
          </button>
        )}
      </div>

      {/* ── Search input ── */}
      {isSearchMode && (
        <div className="px-5 mb-4">
          <input
            type="search"
            autoFocus
            placeholder="種目名を入力..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 rounded-xl border border-rim bg-card px-4 text-[14px] text-charcoal placeholder:text-pale outline-none focus:border-stone transition"
          />
        </div>
      )}

      {/* ── Body part pills (non-search) ── */}
      {!isSearchMode && (
        <div className="px-5 mb-4">
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5 flex-wrap">
            {BODY_PART_TABS.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => { setActiveTab(tab.id); setActiveCategory("すべて"); }}
                  className={`shrink-0 rounded-[10px] border px-4 py-2 text-[13px] font-semibold transition ${
                    isActive
                      ? "bg-terracotta border-terracotta text-white"
                      : "bg-card border-rim text-charcoal"
                  }`}
                  style={isActive ? { boxShadow: "0 2px 10px rgba(196,112,90,0.3)" } : {}}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Category filter (non-search) ── */}
      {!isSearchMode && (
        <div className="px-5 mb-4">
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
            {CATEGORIES.map((cat) => {
              const isActive = cat === activeCategory;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${
                    isActive
                      ? "bg-terra-light text-terracotta"
                      : "text-stone bg-transparent"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Exercise list ── */}
      <div className="px-5 space-y-1.5 pb-6">
        {loading ? (
          <p className="text-[13px] text-stone py-4 text-center">読み込み中...</p>
        ) : filteredExercises.length === 0 ? (
          <p className="text-[13px] text-stone py-4 text-center">
            {isSearchMode ? "「" + searchQuery + "」に一致する種目はありません。" : "この部位の種目はありません。"}
          </p>
        ) : (
          filteredExercises.map((ex) => {
            const badge = getBadge(ex);
            const cat = getCategory(ex);
            const last = lastValues[ex.id];

            return (
              <button
                key={ex.id}
                type="button"
                onClick={() => handleSelect(ex.id)}
                className="w-full flex items-center gap-3 rounded-xl border border-rim bg-card px-3.5 py-3 text-left transition active:scale-[0.99]"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              >
                {/* Category tag */}
                <span className="shrink-0 rounded-md bg-ivory px-2 py-1 text-[10px] font-semibold text-stone min-w-[44px] text-center">
                  {cat}
                </span>

                {/* Name + badge */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-semibold text-charcoal">
                      {getExerciseNameJa(ex.id, ex.name)}
                    </span>
                    {badge && (
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                          badge.type === "beginner"
                            ? "bg-sage-light text-sage"
                            : "bg-terra-light text-terracotta"
                        }`}
                      >
                        {badge.label}
                      </span>
                    )}
                  </div>
                  {last && (
                    <p className="text-[11px] text-stone mt-0.5">
                      前回 {last.weightKg}kg × {last.reps}回
                    </p>
                  )}
                </div>

                <ChevronRight size={14} strokeWidth={2} className="stroke-pale shrink-0" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Page export ───────────────────────────────────────────────────────

export default function ExercisesPage() {
  return (
    <Suspense fallback={<div className="px-6 pt-12 text-stone text-[13px]">読み込み中...</div>}>
      <ExercisesInner />
    </Suspense>
  );
}
