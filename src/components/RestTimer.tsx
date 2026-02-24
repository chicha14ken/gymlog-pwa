"use client";

export const REST_DURATIONS = [30, 60, 90, 120, 180] as const;
export type RestDuration = (typeof REST_DURATIONS)[number];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}:${String(s).padStart(2, "0")}`;
  return String(s);
}

type Props = {
  remaining: number;
  totalDuration: number;
  onDurationChange: (d: number) => void;
  onDismiss: () => void;
};

export function RestTimer({
  remaining,
  totalDuration,
  onDurationChange,
  onDismiss,
}: Props) {
  const isDone = remaining === 0;
  const progress = totalDuration > 0 ? remaining / totalDuration : 0;

  return (
    <div
      className={`rounded-2xl p-4 shadow-sm ring-1 transition-colors ${
        isDone
          ? "bg-emerald-50 ring-emerald-200 dark:bg-emerald-900/20 dark:ring-emerald-700"
          : "bg-white ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800"
      }`}
    >
      {/* プログレスバー */}
      <div className="mb-3 h-1 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${
            isDone ? "bg-emerald-500" : "bg-zinc-400 dark:bg-zinc-500"
          }`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* カウントダウン + スキップ */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p
            className={`text-[0.65rem] font-semibold uppercase tracking-wider ${
              isDone
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-zinc-400"
            }`}
          >
            {isDone ? "レスト完了！次のセットへ" : "レスト中"}
          </p>
          <p
            className={`text-4xl font-black tabular-nums leading-none ${
              isDone
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-zinc-900 dark:text-zinc-50"
            }`}
          >
            {isDone ? "GO!" : formatTime(remaining)}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-600 transition active:scale-95 dark:bg-zinc-800 dark:text-zinc-300"
        >
          スキップ
        </button>
      </div>

      {/* 時間選択 */}
      <div className="flex gap-1.5">
        {REST_DURATIONS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onDurationChange(d)}
            className={`flex-1 rounded-full py-1.5 text-[0.65rem] font-semibold transition ${
              totalDuration === d
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            {d >= 60 ? `${d / 60}分` : `${d}s`}
          </button>
        ))}
      </div>
    </div>
  );
}
