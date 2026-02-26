# パーソナライズド・トレーニングプラン生成アルゴリズム

## エビデンスベースの筋トレプログラミング・エンジン設計書

> **目的**: gymlog-pwa のログデータを活用し、ユーザーごとに最適なトレーニングプランを自動生成するアルゴリズムを体系化する。
> **対象**: 筋肥大 + 筋力向上の両面を総合的にカバー。

---

## 1. 科学的根拠のサマリー

### 1.1 ボリューム（週あたりセット数）と筋肥大の用量反応関係

最も包括的なメタ回帰分析である Pelland et al. (2024, *Sports Medicine*, 67研究・2,058名) によれば、筋肥大は週あたりセット数の増加に伴い向上するが、**収穫逓減**が明確に存在する。平均的な「分数的ボリューム」12.25セットの地点で、1セット追加あたり約0.24%の筋肥大増加が見込まれる。

先行研究の Schoenfeld et al. (2017) のメタ分析でも、週10セット以上で有意な筋肥大効果が確認されている。

**実用的な指針:**

| 週あたりセット数/筋群 | エビデンス上の位置づけ |
|---|---|
| 5セット未満 | 最低限の刺激（初心者の導入期） |
| 5〜9セット | 中程度の効果（メンテナンスや初心者） |
| 10〜14セット | 多くのトレーニーにとって最適ゾーン |
| 15〜20セット | 上級者向け、収穫逓減が顕著に |
| 20セット超 | 逆U字の可能性、個人の回復力次第 |

**重要な概念 — 分数的ボリューム計量**: Pelland et al. は、間接セット（例: ベンチプレス中の三頭筋への刺激）を0.5セットとして計上する「分数的（fractional）」計量法を提唱。アルゴリズムにもこの概念を組み込むべき。

### 1.2 頻度の影響

ボリュームが等価な場合、週あたりの頻度は筋肥大にほぼ影響しない（Grgic et al. 2018; Pelland et al. 2024）。ただし**筋力向上**には頻度が有意に寄与する（運動学習・神経適応の効果）。

つまり頻度は「ボリュームを分散させるツール」として設計するのが合理的。1セッションあたりのボリュームが過大になる場合に頻度を上げてセッション品質を維持する。

### 1.3 筋タンパク質合成（MPS）の時間経過

MacDougall et al. (1995) の古典的研究から:

- トレーニング後4時間で MPS 50%上昇
- 24時間後に MPS 109%上昇（ピーク）
- 36〜48時間でほぼベースラインに復帰

この知見から、**同一筋群を48〜72時間間隔**でトレーニングするのが理論的に最適。週2〜3回/筋群の根拠。

### 1.4 自己調整（Autoregulation）— RPE/RIR

2025年のネットワークメタ分析では、自己調整型トレーニング（APRE > VBRT > RPE）がパーセンテージベースのトレーニングより筋力向上に優れることが確認された。

RPE/RIR の対応関係:

| RPE | RIR | 主観的感覚 |
|-----|-----|-----------|
| 10 | 0 | 限界（もう1レップも無理） |
| 9 | 1 | あと1レップはできた |
| 8 | 2 | あと2レップはできた |
| 7 | 3 | まだ余裕あり |

Refalo et al. (2024) の研究では、0〜3 RIR の範囲で筋肥大効果の大部分が得られることが示唆されている。

### 1.5 プログレッシブオーバーロード

2024年の研究で、負荷漸増とレップ漸増の間に筋肥大効果の有意差はないことが確認された。つまり**オーバーロードの手段は柔軟に選択可能**。

進行速度の目安:

| トレーニング経験 | 負荷進行の目安 |
|---|---|
| 初心者（〜1年） | 毎セッション or 毎週 +2.5〜5kg |
| 中級者（1〜3年） | 隔週 +2.5kg or レップ漸増 |
| 上級者（3年超） | 月単位 or メゾサイクル単位 |

### 1.6 ディロード（疲労管理）

Bell et al. (2024) の横断調査およびDelphi合意:

- 典型的な頻度: **4〜8週ごと**
- 典型的な期間: **約1週間（6〜7日）**
- 方法: ボリューム削減（セット数 & レップ数を下げる）、負荷はやや軽減、頻度は維持
- トリガー: 計画的（65%）、パフォーマンス停滞（54%）、身体の疲労感（63%）
- Coleman et al. (2024) は、1週間の完全休息が筋力にはマイナスだが筋肥大には影響なしと報告

### 1.7 推定1RMの計算

gymlog-pwa は現在 Epley 式を使用: `1RM = W × (1 + R/30)`

研究では Epley 式は3RM負荷で最も正確（+2.7kg、誤差0.013%）であり、6〜10レップ範囲でも実用的。5RM以上では過大評価の傾向あり。アルゴリズム内で複数の式を組み合わせることも検討に値する。

---

## 2. アルゴリズム設計

### 2.1 全体アーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│              Training Plan Engine                     │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌──────────┐    ┌───────────┐    ┌──────────────┐  │
│  │ ユーザー   │    │ ログ解析   │    │ プラン生成    │  │
│  │ プロファイル│───▶│ エンジン   │───▶│ エンジン      │  │
│  └──────────┘    └───────────┘    └──────────────┘  │
│       │               │                  │            │
│       ▼               ▼                  ▼            │
│  ┌──────────┐    ┌───────────┐    ┌──────────────┐  │
│  │ 経験レベル │    │ 進捗追跡   │    │ 自己調整      │  │
│  │ 推定       │    │ & PR検出  │    │ フィードバック  │  │
│  └──────────┘    └───────────┘    └──────────────┘  │
│                       │                               │
│                       ▼                               │
│              ┌───────────────┐                        │
│              │ 疲労モデル      │                        │
│              │ & ディロード判定│                        │
│              └───────────────┘                        │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### 2.2 ユーザープロファイル & 経験レベル推定

アルゴリズムの第一歩は、ユーザーのトレーニング経験レベルを**ログデータから自動推定**すること。

#### 入力データ（gymlog-pwaの既存データから取得可能）

- 総トレーニング日数
- トレーニング期間（初回ログ〜最新ログのスパン）
- 週あたり平均頻度
- 種目ごとの推定1RM推移
- 種目ごとのボリューム推移

#### レベル分類ロジック

```typescript
type TrainingLevel = "beginner" | "intermediate" | "advanced";

function estimateTrainingLevel(
  totalWorkoutDays: number,
  trainingSpanWeeks: number,
  avgWeeklyFrequency: number,
  e1rmProgressRate: number, // 週あたりの1RM変化率（%）
): TrainingLevel {
  // 基本スコア: トレーニング総量
  const consistencyScore = Math.min(
    totalWorkoutDays / 150,  // 150日で満点
    1.0
  );

  // 進行速度スコア: 高い = まだ初心者の伸びしろ
  // 初心者は週1-2%のペースで伸びる、上級者は月0.5%以下
  const progressScore =
    e1rmProgressRate > 1.0 ? 0.0  // 急速に伸びている = 初心者
    : e1rmProgressRate > 0.3 ? 0.5  // 中程度 = 中級者
    : 1.0;  // 停滞気味 = 上級者

  const combinedScore =
    consistencyScore * 0.4 +
    progressScore * 0.4 +
    Math.min(trainingSpanWeeks / 104, 1.0) * 0.2; // 2年で満点

  if (combinedScore < 0.3) return "beginner";
  if (combinedScore < 0.7) return "intermediate";
  return "advanced";
}
```

### 2.3 ボリューム処方アルゴリズム

#### 筋群別の週間ボリューム目標

```typescript
type VolumeTarget = {
  minSets: number;      // 最低有効ボリューム (MEV)
  targetSets: number;   // 最大適応ボリューム (MAV)
  maxSets: number;      // 最大回復可能ボリューム (MRV)
};

// 経験レベル別のデフォルト値（筋群あたり週間セット数）
const VOLUME_TARGETS: Record<TrainingLevel, VolumeTarget> = {
  beginner:     { minSets: 4,  targetSets: 8,  maxSets: 12 },
  intermediate: { minSets: 8,  targetSets: 14, maxSets: 20 },
  advanced:     { minSets: 12, targetSets: 18, maxSets: 25 },
};
```

#### 分数的ボリューム計算

```typescript
// 種目ごとに「直接」刺激する筋群と「間接」刺激する筋群を定義
type MuscleContribution = {
  muscle: string;         // bodyPart ID
  contribution: number;   // 1.0 = direct, 0.5 = indirect
};

const EXERCISE_MUSCLE_MAP: Record<string, MuscleContribution[]> = {
  "bench-press":     [
    { muscle: "chest", contribution: 1.0 },
    { muscle: "triceps", contribution: 0.5 },
    { muscle: "shoulders", contribution: 0.3 },
  ],
  "barbell-row":     [
    { muscle: "back", contribution: 1.0 },
    { muscle: "biceps", contribution: 0.5 },
  ],
  "back-squat":      [
    { muscle: "legs", contribution: 1.0 },
    { muscle: "core", contribution: 0.3 },
  ],
  "overhead-press":  [
    { muscle: "shoulders", contribution: 1.0 },
    { muscle: "triceps", contribution: 0.5 },
  ],
  // ... 全56種目について定義
};

function calculateFractionalVolume(
  weeklyLogs: SetEntry[],
  exerciseMap: Record<string, MuscleContribution[]>,
): Map<string, number> {
  const volumeByMuscle = new Map<string, number>();

  // 種目ごとにセット数を集計し、分数的に各筋群に配分
  const setsByExercise = groupBy(weeklyLogs, (s) => s.exerciseId);

  for (const [exerciseId, sets] of setsByExercise) {
    const contributions = exerciseMap[exerciseId] ?? [];
    const setCount = sets.length;

    for (const { muscle, contribution } of contributions) {
      const current = volumeByMuscle.get(muscle) ?? 0;
      volumeByMuscle.set(muscle, current + setCount * contribution);
    }
  }

  return volumeByMuscle;
}
```

### 2.4 進行（プログレッション）アルゴリズム

**ダブルプログレッション方式**を基本採用。これはレップ数の上限達成を条件に負荷を増やす方式で、RPE/RIRとの併用が容易。

```typescript
type ProgressionDecision = {
  action: "increase_weight" | "increase_reps" | "maintain" | "deload";
  newWeightKg?: number;
  newRepTarget?: number;
  reason: string;
};

function decideProgression(
  exercise: Exercise,
  recentSets: SetEntry[],      // 直近2〜3セッション分
  currentWeightKg: number,
  repTarget: { min: number; max: number },  // 例: { min: 8, max: 12 }
  estimatedRIR: number,
  weightStep: number,           // 既存のweightStep機能を活用
): ProgressionDecision {
  const lastSessionSets = getLastSessionSets(recentSets);
  const avgReps = average(lastSessionSets.map((s) => s.reps));

  // 全セットでレップ上限を達成 & RIR >= 1 → 負荷増加
  if (avgReps >= repTarget.max && estimatedRIR >= 1) {
    return {
      action: "increase_weight",
      newWeightKg: currentWeightKg + weightStep,
      newRepTarget: repTarget.min,
      reason: `全セットで${repTarget.max}レップ達成。${weightStep}kg増加`,
    };
  }

  // レップ範囲内で RIR が適切 → レップ漸増
  if (avgReps >= repTarget.min && avgReps < repTarget.max) {
    return {
      action: "increase_reps",
      newRepTarget: Math.ceil(avgReps) + 1,
      reason: `レップ範囲内。次回${Math.ceil(avgReps) + 1}レップを目標に`,
    };
  }

  // レップ範囲の下限未満 → 負荷維持 or 軽減
  if (avgReps < repTarget.min) {
    return {
      action: "maintain",
      reason: `${repTarget.min}レップ未達。同じ重量で継続`,
    };
  }

  return { action: "maintain", reason: "現状維持" };
}
```

### 2.5 疲労モデル & ディロード判定

蓄積疲労をログデータから推定し、ディロードの必要性を自動判定する。

```typescript
type FatigueSignal = {
  score: number;          // 0〜100（高い = 疲労大）
  shouldDeload: boolean;
  indicators: string[];
};

function assessFatigue(
  recentWeeks: WorkoutWithSets[],  // 直近4〜6週間
  exercisePRs: ExercisePr[],
): FatigueSignal {
  const indicators: string[] = [];
  let score = 0;

  // ① パフォーマンス停滞/低下の検出
  // 主要リフトのe1RMが2週連続で横ばいまたは低下
  const e1rmTrend = calculateE1rmTrend(recentWeeks);
  if (e1rmTrend <= 0) {
    score += 30;
    indicators.push("主要リフトのe1RMが停滞/低下中");
  }

  // ② ボリュームの急増検出
  // 直近2週のボリュームが、それ以前の4週平均を20%以上上回る場合
  const volumeRatio = recentVolumeVsBaseline(recentWeeks);
  if (volumeRatio > 1.2) {
    score += 20;
    indicators.push(`ボリュームが基準値の${Math.round(volumeRatio * 100)}%`);
  }

  // ③ トレーニング頻度の増加
  const freqTrend = calculateFrequencyTrend(recentWeeks);
  if (freqTrend > 1.15) {
    score += 15;
    indicators.push("トレーニング頻度が増加傾向");
  }

  // ④ セッション間の回復時間短縮
  const avgRestDays = calculateAvgRestBetweenSessions(recentWeeks);
  if (avgRestDays < 1.5) {
    score += 15;
    indicators.push(`平均休息日が${avgRestDays.toFixed(1)}日と短い`);
  }

  // ⑤ 連続トレーニング週数
  const consecutiveWeeks = countConsecutiveTrainingWeeks(recentWeeks);
  if (consecutiveWeeks >= 6) {
    score += 20;
    indicators.push(`${consecutiveWeeks}週連続でトレーニング中`);
  }

  return {
    score: Math.min(score, 100),
    shouldDeload: score >= 60,
    indicators,
  };
}
```

#### ディロード処方

```typescript
type DeloadPlan = {
  durationDays: number;
  volumeMultiplier: number;   // 例: 0.5 = 通常の50%
  intensityMultiplier: number; // 例: 0.85 = 通常の85%
  keepFrequency: boolean;
};

function prescribeDeload(fatigueScore: number): DeloadPlan {
  if (fatigueScore >= 80) {
    // 重度の疲労蓄積
    return {
      durationDays: 7,
      volumeMultiplier: 0.4,
      intensityMultiplier: 0.7,
      keepFrequency: true,
    };
  }
  // 中程度の疲労
  return {
    durationDays: 7,
    volumeMultiplier: 0.5,
    intensityMultiplier: 0.85,
    keepFrequency: true,
  };
}
```

### 2.6 トレーニングスプリット自動提案

週あたりの利用可能日数に基づいてスプリットを提案。

```typescript
type SplitType =
  | "full_body"         // 全身（週2〜3日）
  | "upper_lower"       // 上半身/下半身（週3〜4日）
  | "push_pull_legs"    // PPL（週4〜6日）
  | "custom";           // ユーザー定義

function recommendSplit(
  availableDaysPerWeek: number,
  level: TrainingLevel,
): { split: SplitType; schedule: string[] } {
  if (availableDaysPerWeek <= 2) {
    return {
      split: "full_body",
      schedule: ["全身A", "全身B"],
    };
  }

  if (availableDaysPerWeek === 3) {
    if (level === "beginner") {
      return {
        split: "full_body",
        schedule: ["全身A", "全身B", "全身C"],
      };
    }
    return {
      split: "upper_lower",
      schedule: ["上半身", "下半身", "上半身"],
    };
  }

  if (availableDaysPerWeek === 4) {
    return {
      split: "upper_lower",
      schedule: ["上半身A", "下半身A", "上半身B", "下半身B"],
    };
  }

  if (availableDaysPerWeek >= 5) {
    return {
      split: "push_pull_legs",
      schedule: ["Push", "Pull", "Legs", "Push", "Pull"],
    };
  }

  return { split: "full_body", schedule: ["全身"] };
}
```

### 2.7 メゾサイクル構造（ブロック・ピリオダイゼーション）

上級者には、ACSM の推奨するブロック・ピリオダイゼーションを自動的に組み込む。

```typescript
type MesocyclePhase = {
  name: string;
  weeks: number;
  repRange: { min: number; max: number };
  rirTarget: number;
  volumeMultiplier: number;  // ベースボリュームに対する倍率
};

function generateMesocycle(level: TrainingLevel): MesocyclePhase[] {
  if (level === "beginner") {
    // 初心者: リニアプログレッション、ピリオダイゼーション不要
    return [
      {
        name: "ベース",
        weeks: 8,
        repRange: { min: 8, max: 12 },
        rirTarget: 2,
        volumeMultiplier: 1.0,
      },
    ];
  }

  if (level === "intermediate") {
    return [
      {
        name: "蓄積期（Accumulation）",
        weeks: 4,
        repRange: { min: 8, max: 12 },
        rirTarget: 3,
        volumeMultiplier: 1.0,
      },
      {
        name: "増強期（Intensification）",
        weeks: 3,
        repRange: { min: 5, max: 8 },
        rirTarget: 2,
        volumeMultiplier: 0.85,
      },
      {
        name: "ディロード",
        weeks: 1,
        repRange: { min: 8, max: 12 },
        rirTarget: 4,
        volumeMultiplier: 0.5,
      },
    ];
  }

  // advanced
  return [
    {
      name: "筋肥大期（Hypertrophy）",
      weeks: 4,
      repRange: { min: 8, max: 15 },
      rirTarget: 3,
      volumeMultiplier: 1.1,
    },
    {
      name: "筋力期（Strength）",
      weeks: 3,
      repRange: { min: 3, max: 6 },
      rirTarget: 2,
      volumeMultiplier: 0.8,
    },
    {
      name: "ピーキング",
      weeks: 2,
      repRange: { min: 1, max: 3 },
      rirTarget: 1,
      volumeMultiplier: 0.6,
    },
    {
      name: "ディロード",
      weeks: 1,
      repRange: { min: 8, max: 12 },
      rirTarget: 4,
      volumeMultiplier: 0.4,
    },
  ];
}
```

---

## 3. gymlog-pwa への実装アイデア

### 3.1 データモデル拡張

現在のモデルに以下を追加:

```typescript
// ── 新規: ユーザープロファイル ──
export type UserProfile = {
  id: string;
  trainingLevel: TrainingLevel;
  availableDaysPerWeek: number;
  primaryGoal: "hypertrophy" | "strength" | "both";
  bodyweightKg?: number;
  createdAt: string;
  updatedAt: string;
};

// ── 新規: トレーニングプラン ──
export type TrainingPlan = {
  id: string;
  userId: string;
  splitType: SplitType;
  mesocycle: MesocyclePhase[];
  currentPhaseIndex: number;
  currentWeek: number;
  createdAt: string;
};

// ── 新規: セッションプラン（その日のメニュー） ──
export type SessionPlan = {
  id: string;
  planId: string;
  dayLabel: string;        // "上半身A", "Push" など
  exercises: PlannedExercise[];
};

export type PlannedExercise = {
  exerciseId: string;
  targetSets: number;
  repRange: { min: number; max: number };
  suggestedWeightKg: number;   // 過去ログから推定
  rirTarget: number;
};

// ── 既存 SetEntry への拡張 ──
export type SetEntry = {
  // ... 既存フィールド
  rir?: number;                // Reps In Reserve（任意入力）
};
```

### 3.2 IndexedDB ストア追加

```
gymlog-db v4:
  ├── exercises       (既存)
  ├── workouts        (既存)
  ├── sets            (既存、rirフィールド追加)
  ├── userProfile     (新規)
  ├── trainingPlans   (新規)
  └── sessionPlans    (新規)
```

### 3.3 新規ドメインモジュール

```
src/domain/
  ├── models.ts           (既存、型追加)
  ├── pr.ts               (既存)
  ├── planEngine.ts       (新規: プラン生成のコアロジック)
  ├── volumeTracker.ts    (新規: 分数的ボリューム計算)
  ├── progression.ts      (新規: プログレッションアルゴリズム)
  ├── fatigue.ts          (新規: 疲労モデル & ディロード判定)
  └── muscleMap.ts        (新規: 種目→筋群マッピング)
```

### 3.4 UIの追加/変更案

#### A. 新規ページ: `/plan`（トレーニングプラン）

BottomNav に「プラン」タブを追加。

- **初回**: オンボーディングウィザード
  - 週何日トレーニングできる？
  - 目標は？（筋肥大 / 筋力 / 両方）
  - → 自動でスプリット & メゾサイクル生成
- **通常時**: 今日のセッションプランを表示
  - 種目、目標セット数、目標レップ範囲、推奨重量
  - タップで既存のログ画面に遷移（プリセット済み）

#### B. 既存ページの拡張: `/`（ホーム）

- セット入力時に **RIR の任意入力**を追加（0〜5のスライダー or ドロップダウン）
- プランが存在する場合、推奨重量 & 目標レップをプリフィル
- セット完了後に「プラン通り / 調整が必要」の簡易フィードバック

#### C. 既存ページの拡張: `/pr`

- e1RM の推移グラフ（週単位のトレンドライン）
- 疲労スコアの表示（簡易的なインジケーター）

#### D. 新規ページ: `/insights`（分析）

- 筋群別の週間ボリュームヒートマップ
- ボリュームバランス（過不足の可視化）
- ディロード推奨の通知バナー

### 3.5 実装優先度の提案

| 優先度 | 機能 | 工数感 | 依存関係 |
|--------|------|--------|----------|
| **P0** | RIR 入力の追加 | 小 | なし（既存UIの小改修） |
| **P0** | `muscleMap.ts` 作成 | 小 | なし |
| **P1** | `volumeTracker.ts` 実装 | 中 | muscleMap |
| **P1** | 筋群別ボリューム表示 (insights) | 中 | volumeTracker |
| **P2** | `progression.ts` 実装 | 中 | 過去ログ参照 |
| **P2** | `fatigue.ts` 実装 | 中 | ボリューム & PR データ |
| **P3** | UserProfile & オンボーディング | 中 | IDB v4マイグレーション |
| **P3** | `planEngine.ts`（統合） | 大 | 上記すべて |
| **P4** | セッションプラン表示 & プリフィル | 大 | planEngine |
| **P4** | メゾサイクル管理UI | 大 | planEngine |

### 3.6 オフラインファースト設計の維持

gymlog-pwa はバックエンドを持たないオフラインファーストの設計。アルゴリズムはすべて**クライアントサイドの純粋関数**として実装し、この原則を維持する。

- プラン生成ロジック: `src/domain/` に純粋関数として配置
- データ永続化: IndexedDB のストア追加で対応
- 外部API不要: LLM等の外部サービスには依存しない

---

## 4. 参考文献

1. Pelland JC, et al. "The Resistance Training Dose Response: Meta-Regressions Exploring the Effects of Weekly Volume and Frequency on Muscle Hypertrophy and Strength Gain." *Sports Medicine*, 2024/2025.
   - https://sportrxiv.org/index.php/server/preprint/view/460
   - https://pubmed.ncbi.nlm.nih.gov/41343037/

2. Schoenfeld BJ, et al. "Dose-response relationship between weekly resistance training volume and increases in muscle mass." *J Sports Sci*, 2017.
   - https://pubmed.ncbi.nlm.nih.gov/27433992/

3. Grgic J, et al. "Effect of Resistance Training Frequency on Gains in Muscular Strength: A Systematic Review and Meta-Analysis." *Sports Med*, 2018.
   - https://pubmed.ncbi.nlm.nih.gov/30558493/

4. Refalo MC, et al. "Similar muscle hypertrophy following eight weeks of resistance training to momentary muscular failure or with repetitions-in-reserve." *J Sports Sci*, 2024.
   - https://www.tandfonline.com/doi/full/10.1080/02640414.2024.2321021

5. 自己調整型トレーニングのネットワークメタ分析. *ScienceDirect*, 2025.
   - https://www.sciencedirect.com/science/article/pii/S1728869X25000590

6. Coleman M, et al. "Gaining more from doing less? The effects of a one-week deload period." *PeerJ*, 2024.
   - https://peerj.com/articles/16777/

7. Bell L, et al. "Deloading Practices in Strength and Physique Sports: A Cross-sectional Survey." *Sports Med Open*, 2024.
   - https://link.springer.com/article/10.1186/s40798-024-00691-y

8. Bell L, et al. "A Practical Approach to Deloading: Recommendations and Considerations." *Strength Cond J*, 2025.
   - https://shura.shu.ac.uk/35313/3/Bell-APracticalApproach(AM).pdf

9. ACSM Position Stand. "Progression Models in Resistance Training for Healthy Adults." 2009.
   - https://pubmed.ncbi.nlm.nih.gov/19204579/

10. MacDougall JD, et al. "The time course for elevated muscle protein synthesis following heavy resistance exercise." *Can J Appl Physiol*, 1995.
    - https://pubmed.ncbi.nlm.nih.gov/8563679/

11. Schoenfeld BJ, et al. "Loading Recommendations for Muscle Strength, Hypertrophy, and Local Endurance: A Re-Examination of the Repetition Continuum." *Sports*, 2021.
    - https://pmc.ncbi.nlm.nih.gov/articles/PMC7927075/

---

> **注記**: 本ドキュメントは2025年2月時点での最新エビデンスに基づく。アルゴリズムのパラメータ（ボリューム閾値、疲労スコアの重みなど）は実運用データに基づくチューニングが必要。
