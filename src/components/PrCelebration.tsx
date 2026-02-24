"use client";

import { useEffect } from "react";

export type PrCelebrationData = {
  exerciseName: string;
  newWeightKg: number;
  /** null = このエクササイズの初記録 */
  previousWeightKg: number | null;
};

type Props = PrCelebrationData & {
  onDismiss: () => void;
};

const CONFETTI_COLORS = [
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

type Particle = {
  id: number;
  color: string;
  left: number;
  delay: number;
  duration: number;
  isCircle: boolean;
  size: number;
};

function generateParticles(): Particle[] {
  return Array.from({ length: 22 }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    left: 4 + i * 4.3,
    delay: (i * 0.065) % 0.75,
    duration: 1.0 + ((i * 0.17) % 0.9),
    isCircle: i % 3 !== 0,
    size: 6 + (i % 4) * 2,
  }));
}

const PARTICLES = generateParticles();

export function PrCelebration({
  exerciseName,
  newWeightKg,
  previousWeightKg,
  onDismiss,
}: Props) {
  const isFirstRecord = previousWeightKg === null;
  const improvement =
    previousWeightKg !== null ? newWeightKg - previousWeightKg : null;

  const shareText = isFirstRecord
    ? `${exerciseName} を初記録！💪\n${newWeightKg}kg\n筋トレログアプリで記録中 #筋トレ #筋トレログ`
    : `${exerciseName} で自己ベスト更新！🏆\n${newWeightKg}kg${
        improvement !== null && improvement > 0 ? `（+${improvement}kg UP）` : ""
      }\n#筋トレ #PR更新 #筋トレログ`;

  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ text: shareText }).catch(() => {});
    } else {
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
        "_blank",
        "noopener,noreferrer",
      );
    }
  };

  // 5秒後に自動で閉じる
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <>
      <style>{`
        @keyframes pr-overlay-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes pr-card-in {
          from { opacity: 0; transform: scale(0.80) translateY(20px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        @keyframes pr-trophy-float {
          0%,100% { transform: translateY(0)    rotate(-6deg) scale(1);    }
          50%     { transform: translateY(-14px) rotate( 6deg) scale(1.08); }
        }
        @keyframes pr-confetti-fall {
          0%  { transform: translateY(-10px) rotate(0deg);   opacity: 1; }
          80% { opacity: 1; }
          100%{ transform: translateY(260px)  rotate(600deg); opacity: 0; }
        }
        .pr-overlay { animation: pr-overlay-in 0.2s ease-out both; }
        .pr-card    { animation: pr-card-in 0.4s cubic-bezier(0.34,1.56,0.64,1) both; }
        .pr-trophy  { animation: pr-trophy-float 1s ease-in-out infinite; display: inline-block; }
      `}</style>

      {/* バックドロップ */}
      <div
        className="pr-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-5 backdrop-blur-sm"
        onClick={onDismiss}
      >
        {/* カード */}
        <div
          className="pr-card relative w-full max-w-[320px] overflow-hidden rounded-3xl bg-white p-7 text-center shadow-2xl dark:bg-zinc-900"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 紙吹雪 */}
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            {PARTICLES.map((p) => (
              <div
                key={p.id}
                className="absolute top-1"
                style={{
                  left: `${p.left}%`,
                  width: p.size,
                  height: p.size,
                  backgroundColor: p.color,
                  borderRadius: p.isCircle ? "50%" : "3px",
                  animation: `pr-confetti-fall ${p.duration}s ${p.delay}s ease-in both`,
                }}
              />
            ))}
          </div>

          {/* トロフィー */}
          <div className="mb-2 text-5xl">
            <span className="pr-trophy">{isFirstRecord ? "🎉" : "🏆"}</span>
          </div>

          {/* タイトル */}
          <p className="mb-1 text-[1.6rem] font-black tracking-tight text-zinc-900 dark:text-zinc-50">
            {isFirstRecord ? "初記録！" : "新記録更新！"}
          </p>

          {/* 種目名 */}
          <p className="mb-4 text-sm text-zinc-500">{exerciseName}</p>

          {/* 重量 */}
          <p className="mb-1 text-5xl font-black tabular-nums leading-none text-emerald-500">
            {newWeightKg}
            <span className="text-2xl font-bold">kg</span>
          </p>

          {/* 改善量 or 初記録バッジ */}
          <div className="mb-6 h-5">
            {improvement !== null && improvement > 0 ? (
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                ＋{improvement}kg アップ 🔥
              </p>
            ) : isFirstRecord ? (
              <p className="text-sm font-bold text-amber-500">
                はじめての記録 ✨
              </p>
            ) : null}
          </div>

          {/* ボタン */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-sky-500 text-sm font-semibold text-white shadow active:scale-[0.97]"
            >
              シェア 🐦
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="flex h-11 items-center justify-center rounded-full bg-zinc-100 px-4 text-sm font-semibold text-zinc-700 active:scale-[0.97] dark:bg-zinc-800 dark:text-zinc-300"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
