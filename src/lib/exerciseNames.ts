/**
 * 種目ID → 日本語表示名（ライトユーザー向け）
 */
export const EXERCISE_NAME_JA: Record<string, string> = {
  // ── 胸 ──────────────────────────────────────────────
  "bench-press":          "ベンチプレス",
  "incline-bench":        "インクラインベンチプレス",
  "decline-bench":        "デクラインベンチプレス",
  "dumbbell-fly":         "ダンベルフライ",
  "cable-crossover":      "ケーブルクロスオーバー",
  "chest-press-machine":  "チェストプレスマシン",
  "pec-deck":             "ペックデック",
  "push-up":              "腕立て伏せ",
  // ── 背中 ────────────────────────────────────────────
  "deadlift":             "デッドリフト",
  "barbell-row":          "バーベルロー",
  "cable-row":            "ケーブルロー",
  "t-bar-row":            "Tバーロー",
  "pull-up":              "懸垂（順手）",
  "chin-up":              "チンニング（逆手）",
  "lat-pulldown":         "ラットプルダウン",
  "face-pull":            "フェイスプル",
  // ── 脚 ──────────────────────────────────────────────
  "back-squat":            "バックスクワット",
  "front-squat":           "フロントスクワット",
  "bulgarian-split-squat": "ブルガリアンスプリットスクワット",
  "hack-squat":            "ハックスクワット",
  "sumo-squat":            "スモウスクワット",
  "leg-press":             "レッグプレス",
  "romanian-deadlift":     "ルーマニアンデッドリフト",
  "walking-lunge":         "ウォーキングランジ",
  "leg-curl":              "レッグカール",
  "leg-extension":         "レッグエクステンション",
  "calf-raise":            "カーフレイズ",
  "hip-thrust":            "ヒップスラスト",
  "nordic-curl":           "ノルディックカール",
  // ── 肩 ──────────────────────────────────────────────
  "overhead-press":       "ショルダープレス",
  "push-press":           "プッシュプレス",
  "db-shoulder-press":    "ダンベルショルダープレス",
  "lateral-raise":        "サイドレイズ",
  "front-raise":          "フロントレイズ",
  "rear-delt-fly":        "リアデルトフライ",
  "cable-lateral-raise":  "ケーブルサイドレイズ",
  // ── 上腕二頭筋 ──────────────────────────────────────
  "barbell-curl":         "バーベルカール",
  "dumbbell-curl":        "ダンベルカール",
  "hammer-curl":          "ハンマーカール",
  "concentration-curl":   "コンセントレーションカール",
  "cable-curl":           "ケーブルカール",
  "preacher-curl":        "プリーチャーカール",
  // ── 上腕三頭筋 ──────────────────────────────────────
  "tricep-extension":     "トライセプスエクステンション",
  "dip":                  "ディップス",
  "skull-crusher":        "スカルクラッシャー",
  "tricep-pushdown":      "トライセプスプッシュダウン",
  "overhead-tricep-ext":  "オーバーヘッドエクステンション",
  "close-grip-bench":     "クローズグリップベンチ",
  // ── 体幹 ────────────────────────────────────────────
  "ab-wheel":             "アブローラー",
  "plank":                "プランク",
  "leg-raise":            "レッグレイズ",
  "hanging-leg-raise":    "ハンギングレッグレイズ",
  "cable-crunch":         "ケーブルクランチ",
  "crunches":             "クランチ",
  "dead-bug":             "デッドバグ",
  "russian-twist":        "ロシアンツイスト",
};

export function getExerciseNameJa(id: string, fallback: string): string {
  return EXERCISE_NAME_JA[id] ?? fallback;
}
