import { useState } from "react";

/* ── lucide-react を使わず、インラインSVGで代替 ── */
const Icon = {
  ChevronDown: ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  ChevronUp: ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  ),
  TrendingUp: ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  TrendingDown: ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
      <polyline points="17 18 23 18 23 12" />
    </svg>
  ),
  Minus: ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  AlertTriangle: ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  CheckCircle: ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  Calendar: ({ size = 16, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
};

/* ─────────────────────────────────────────
   カラーパレット（既存アプリ準拠 ダーク）
───────────────────────────────────────── */
const C = {
  bg:          "#0f0f0f",
  surface:     "#1a1a1a",
  surfaceHigh: "#242424",
  border:      "#2e2e2e",
  text:        "#f0f0f0",
  textMuted:   "#888",
  blue:        "#3b82f6",
  green:       "#22c55e",
  yellow:      "#eab308",
  red:         "#ef4444",
  orange:      "#f97316",
  purple:      "#a855f7",
};

/* ─────────────────────────────────────────
   共通コンポーネント
───────────────────────────────────────── */
const Badge = ({ children, color = C.blue }) => (
  <span style={{
    background: color + "22", color, border: `1px solid ${color}44`,
    borderRadius: 6, fontSize: 11, padding: "2px 8px", fontWeight: 600,
    whiteSpace: "nowrap",
  }}>{children}</span>
);

const Card = ({ children, style = {} }) => (
  <div style={{
    background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 12, padding: "14px 16px", marginBottom: 10, ...style,
  }}>{children}</div>
);

const Pill = ({ children, active, onClick, color = C.blue }) => (
  <button onClick={onClick} style={{
    background: active ? color + "22" : C.surfaceHigh,
    color: active ? color : C.textMuted,
    border: `1px solid ${active ? color + "66" : C.border}`,
    borderRadius: 20, padding: "5px 12px", fontSize: 12,
    fontWeight: active ? 600 : 400, cursor: "pointer", whiteSpace: "nowrap",
  }}>{children}</button>
);

const SectionLabel = ({ children }) => (
  <p style={{
    color: C.textMuted, fontSize: 11, fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 8, marginTop: 0,
  }}>{children}</p>
);

const ProgressBar = ({ value, max, color = C.blue, height = 6 }) => (
  <div style={{ background: C.surfaceHigh, borderRadius: height, height, overflow: "hidden" }}>
    <div style={{
      width: `${Math.min((value / max) * 100, 100)}%`,
      background: color, height: "100%", borderRadius: height,
    }} />
  </div>
);

const StepBtn = ({ label, onClick }) => (
  <button onClick={onClick} style={{
    background: C.surfaceHigh, border: `1px solid ${C.border}`,
    color: C.text, borderRadius: 8, width: 36, height: 36,
    cursor: "pointer", fontSize: 20, lineHeight: 1,
  }}>{label}</button>
);

/* ── BottomNav ── */
const BottomNav = ({ screen, setScreen }) => {
  const tabs = [
    { id: "home",     emoji: "🏋️", label: "トレーニング" },
    { id: "plan",     emoji: "📅",  label: "プラン",   isNew: true },
    { id: "insights", emoji: "📊",  label: "分析",     isNew: true },
    { id: "pr",       emoji: "⭐",  label: "PR" },
  ];
  return (
    <div style={{
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 448, background: C.surface,
      borderTop: `1px solid ${C.border}`, display: "flex", zIndex: 100,
    }}>
      {tabs.map(({ id, emoji, label, isNew }) => {
        const active = screen === id;
        return (
          <button key={id} onClick={() => setScreen(id)} style={{
            flex: 1, padding: "10px 4px 12px", background: "none", border: "none",
            color: active ? C.blue : C.textMuted, cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
          }}>
            <span style={{ fontSize: 18 }}>{emoji}</span>
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{label}</span>
            {isNew && <span style={{ fontSize: 9, color: C.green, fontWeight: 700 }}>NEW</span>}
          </button>
        );
      })}
    </div>
  );
};

/* ─────────────────────────────────────────
   SCREEN 1: ホーム（既存拡張 — RIR追加）
───────────────────────────────────────── */
const HomeScreen = () => {
  const [rir, setRir]       = useState(2);
  const [weight, setWeight] = useState(80);
  const [reps, setReps]     = useState(8);
  const [sets, setSets]     = useState([
    { w: 80, r: 8, rir: 2 },
    { w: 80, r: 9, rir: 2 },
  ]);

  const rirColors = [C.red, C.orange, C.yellow, C.green, C.blue, C.textMuted];
  const rirLabels = ["限界", "あと1", "あと2", "あと3", "余裕", "軽い"];

  return (
    <div style={{ padding: "16px 16px 120px" }}>

      {/* プラン由来の推奨バナー */}
      <Card style={{ background: C.blue + "11", border: `1px solid ${C.blue}33`, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Icon.Calendar size={13} color={C.blue} />
          <span style={{ color: C.blue, fontSize: 12, fontWeight: 600 }}>今日のプラン — 上半身A</span>
        </div>
        <p style={{ color: C.textMuted, fontSize: 12, margin: 0 }}>
          ベンチプレス: 4セット × 8〜12rep｜推奨 <strong style={{ color: C.text }}>80 kg</strong>｜RIR目標 2
        </p>
      </Card>

      {/* 種目ヘッダー */}
      <h2 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>ベンチプレス</h2>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <Badge color={C.blue}>胸</Badge>
        <Badge color={C.purple}>蓄積期 W2</Badge>
      </div>

      {/* 入力カード */}
      <Card>
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <SectionLabel>重量 (kg)</SectionLabel>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <StepBtn label="−" onClick={() => setWeight(w => Math.max(0, +(w - 2.5).toFixed(1)))} />
              <div style={{
                flex: 1, textAlign: "center", fontSize: 22, fontWeight: 700,
                color: C.text, background: C.surfaceHigh, borderRadius: 8, padding: "6px 0",
              }}>{weight}</div>
              <StepBtn label="+" onClick={() => setWeight(w => +(w + 2.5).toFixed(1))} />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <SectionLabel>レップ数</SectionLabel>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <StepBtn label="−" onClick={() => setReps(r => Math.max(1, r - 1))} />
              <div style={{
                flex: 1, textAlign: "center", fontSize: 22, fontWeight: 700,
                color: C.text, background: C.surfaceHigh, borderRadius: 8, padding: "6px 0",
              }}>{reps}</div>
              <StepBtn label="+" onClick={() => setReps(r => r + 1)} />
            </div>
          </div>
        </div>

        {/* ── NEW: RIR 入力 ── */}
        <div style={{ paddingTop: 10, borderTop: `1px solid ${C.border}`, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <SectionLabel>RIR（余力レップ数）</SectionLabel>
            <span style={{ fontSize: 12, color: rirColors[rir], fontWeight: 700 }}>{rirLabels[rir]}</span>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {[0, 1, 2, 3, 4, 5].map(v => (
              <button key={v} onClick={() => setRir(v)} style={{
                flex: 1, height: 32, borderRadius: 6,
                border: `1.5px solid ${rir === v ? rirColors[v] : C.border}`,
                background: rir === v ? rirColors[v] + "22" : C.surfaceHigh,
                color: rir === v ? rirColors[v] : C.textMuted,
                cursor: "pointer", fontSize: 13, fontWeight: rir === v ? 700 : 400,
              }}>{v}</button>
            ))}
          </div>
          <p style={{ color: C.textMuted, fontSize: 11, margin: "6px 0 0" }}>
            ※重量は両手合計（ダンベルも合計）で記録
          </p>
        </div>

        <button
          onClick={() => setSets(prev => [...prev, { w: weight, r: reps, rir }])}
          style={{
            width: "100%", padding: "12px 0", background: C.blue,
            color: "#fff", border: "none", borderRadius: 10,
            fontSize: 15, fontWeight: 700, cursor: "pointer",
          }}>
          セット追加
        </button>
      </Card>

      {/* セット一覧 */}
      <SectionLabel>本日のセット</SectionLabel>
      {sets.map((s, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center",
          padding: "10px 14px", marginBottom: 6,
          background: C.surfaceHigh, borderRadius: 10, border: `1px solid ${C.border}`,
        }}>
          <span style={{ color: C.textMuted, fontSize: 13, width: 22 }}>{i + 1}</span>
          <span style={{ color: C.text, flex: 1, fontSize: 15, fontWeight: 600 }}>
            {s.w} kg × {s.r} rep
          </span>
          <Badge color={rirColors[s.rir]}>RIR {s.rir}</Badge>
          <span style={{ color: C.textMuted, fontSize: 12, marginLeft: 10 }}>
            e1RM {Math.round(s.w * (1 + s.r / 30))} kg
          </span>
        </div>
      ))}

      {sets.length >= 3 && (
        <Card style={{ background: C.green + "11", border: `1px solid ${C.green}33`, marginTop: 4 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <Icon.CheckCircle size={16} color={C.green} />
            <span style={{ color: C.green, fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>
              目標セット数を達成！次回は <strong>82.5 kg</strong> を試してみましょう 💪
            </span>
          </div>
        </Card>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────
   SCREEN 2-A: オンボーディング
───────────────────────────────────────── */
const OnboardScreen = ({ setScreen }) => {
  const [step, setStep] = useState(0);
  const [days, setDays]  = useState(4);
  const [goal, setGoal]  = useState("both");

  const splitLabel = { 2: "全身2分割", 3: "全身3分割", 4: "上下4分割", 5: "PPL 5分割", 6: "PPL 6分割" };
  const goalLabel  = { hypertrophy: "筋肥大重視", strength: "筋力向上重視", both: "筋肥大＋筋力バランス" };

  if (step === 0) return (
    <div style={{ padding: "40px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>🧬</div>
      <h2 style={{ color: C.text, fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
        パーソナルプランを作ろう
      </h2>
      <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.75, marginBottom: 32 }}>
        これまでの<strong style={{ color: C.text }}>47回分のログ</strong>をもとに、
        あなた専用のトレーニングプランを自動生成します。3問に答えるだけです。
      </p>
      <button onClick={() => setStep(1)} style={{
        width: "100%", padding: "14px 0", background: C.blue,
        color: "#fff", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer",
      }}>
        はじめる →
      </button>
    </div>
  );

  if (step === 1) return (
    <div style={{ padding: "28px 20px" }}>
      <p style={{ color: C.textMuted, fontSize: 12, margin: "0 0 6px" }}>ステップ 1 / 3</p>
      <ProgressBar value={1} max={3} height={4} />
      <h3 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: "20px 0 18px" }}>
        週に何日トレーニングできますか？
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 28 }}>
        {[2, 3, 4, 5, 6].map(d => (
          <button key={d} onClick={() => setDays(d)} style={{
            padding: "18px 0", borderRadius: 12, cursor: "pointer",
            background: days === d ? C.blue + "22" : C.surfaceHigh,
            border: `2px solid ${days === d ? C.blue : C.border}`,
            color: days === d ? C.blue : C.text,
            fontSize: 20, fontWeight: 700,
          }}>{d}</button>
        ))}
      </div>
      <p style={{ color: C.textMuted, fontSize: 12, textAlign: "center", marginBottom: 20 }}>
        推奨スプリット: <strong style={{ color: C.text }}>{splitLabel[days]}</strong>
      </p>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => setStep(0)} style={{
          flex: 1, padding: "13px 0", background: C.surfaceHigh,
          color: C.text, border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 14, cursor: "pointer",
        }}>戻る</button>
        <button onClick={() => setStep(2)} style={{
          flex: 2, padding: "13px 0", background: C.blue,
          color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer",
        }}>次へ</button>
      </div>
    </div>
  );

  if (step === 2) return (
    <div style={{ padding: "28px 20px" }}>
      <p style={{ color: C.textMuted, fontSize: 12, margin: "0 0 6px" }}>ステップ 2 / 3</p>
      <ProgressBar value={2} max={3} height={4} />
      <h3 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: "20px 0 16px" }}>
        主なトレーニング目標は？
      </h3>
      {[
        { id: "hypertrophy", emoji: "💪", label: "筋肥大",       desc: "高レップ・高ボリューム優先。筋肉量を増やす" },
        { id: "strength",    emoji: "🏋️", label: "筋力向上",     desc: "低レップ・高強度優先。1RM向上を目指す" },
        { id: "both",        emoji: "⚡", label: "両方バランス", desc: "筋肥大と筋力を同時に追う（おすすめ）" },
      ].map(({ id, emoji, label, desc }) => (
        <button key={id} onClick={() => setGoal(id)} style={{
          width: "100%", textAlign: "left", padding: "13px 14px",
          marginBottom: 10, borderRadius: 12, cursor: "pointer",
          background: goal === id ? C.blue + "15" : C.surfaceHigh,
          border: `2px solid ${goal === id ? C.blue : C.border}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 26 }}>{emoji}</span>
            <div style={{ flex: 1 }}>
              <p style={{ color: goal === id ? C.blue : C.text, fontWeight: 700, margin: "0 0 2px" }}>{label}</p>
              <p style={{ color: C.textMuted, fontSize: 12, margin: 0 }}>{desc}</p>
            </div>
            {goal === id && <Icon.CheckCircle size={18} color={C.blue} />}
          </div>
        </button>
      ))}
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <button onClick={() => setStep(1)} style={{
          flex: 1, padding: "13px 0", background: C.surfaceHigh,
          color: C.text, border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 14, cursor: "pointer",
        }}>戻る</button>
        <button onClick={() => setStep(3)} style={{
          flex: 2, padding: "13px 0", background: C.blue,
          color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer",
        }}>次へ</button>
      </div>
    </div>
  );

  return (
    <div style={{ padding: "28px 20px" }}>
      <p style={{ color: C.textMuted, fontSize: 12, margin: "0 0 6px" }}>ステップ 3 / 3</p>
      <ProgressBar value={3} max={3} height={4} color={C.green} />
      <div style={{ textAlign: "center", margin: "24px 0 8px", fontSize: 48 }}>🤖</div>
      <h3 style={{ color: C.text, fontSize: 18, fontWeight: 800, textAlign: "center", marginBottom: 4 }}>
        プランを生成しました
      </h3>
      <p style={{ color: C.textMuted, fontSize: 12, textAlign: "center", marginBottom: 20 }}>
        ログ47回分を分析した結果
      </p>
      <Card>
        {[
          ["トレーニングレベル", <Badge color={C.yellow}>中級者 🔥</Badge>],
          ["推奨スプリット",     <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{splitLabel[days]}</span>],
          ["目標設定",           <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{goalLabel[goal]}</span>],
          ["メゾサイクル",       <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>蓄積4週→強化3週→DL1週</span>],
        ].map(([k, v], i) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "9px 0", borderBottom: i < 3 ? `1px solid ${C.border}` : "none",
          }}>
            <span style={{ color: C.textMuted, fontSize: 13 }}>{k}</span>
            {v}
          </div>
        ))}
      </Card>
      <Card style={{ background: C.purple + "11", border: `1px solid ${C.purple}33` }}>
        <p style={{ color: C.purple, fontSize: 13, fontWeight: 700, margin: "0 0 4px" }}>💡 アルゴリズムからの気づき</p>
        <p style={{ color: C.textMuted, fontSize: 12, margin: 0, lineHeight: 1.65 }}>
          胸・肩のボリュームが不足（週8セット）。背中は週16セットと理想的。
          プレス系を増やしてバランスを改善することを推奨します。
        </p>
      </Card>
      <button onClick={() => setScreen("plan")} style={{
        width: "100%", marginTop: 12, padding: "14px 0", background: C.blue,
        color: "#fff", border: "none", borderRadius: 12,
        fontSize: 16, fontWeight: 700, cursor: "pointer",
      }}>
        プランを確認する 🎉
      </button>
    </div>
  );
};

/* ─────────────────────────────────────────
   SCREEN 2-B: プランページ
───────────────────────────────────────── */
const PlanScreen = ({ setScreen }) => {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [expanded, setExpanded] = useState(null);

  const phases = [
    { name: "蓄積期",     weeks: 4, done: 2, repRange: "8〜12", rir: 3, color: C.blue },
    { name: "強化期",     weeks: 3, done: 0, repRange: "5〜8",  rir: 2, color: C.orange },
    { name: "ディロード", weeks: 1, done: 0, repRange: "8〜12", rir: 4, color: C.green },
  ];

  const exercises = [
    { name: "ベンチプレス",         sets: 4, rep: "8〜12",  weight: 80, rir: 3, muscle: "胸" },
    { name: "インクラインDB プレス", sets: 3, rep: "10〜15", weight: 44, rir: 3, muscle: "胸" },
    { name: "オーバーヘッドプレス", sets: 3, rep: "8〜12",  weight: 55, rir: 3, muscle: "肩" },
    { name: "ケーブルフライ",       sets: 3, rep: "12〜15", weight: 20, rir: 2, muscle: "胸" },
    { name: "トライセップ PS",      sets: 3, rep: "10〜15", weight: 30, rir: 3, muscle: "三頭" },
  ];

  const ph = phases[phaseIdx];

  return (
    <div style={{ padding: "16px 16px 120px" }}>
      <h1 style={{ color: C.text, fontSize: 20, fontWeight: 800, margin: "0 0 16px" }}>
        トレーニングプラン
      </h1>

      <SectionLabel>メゾサイクル進捗</SectionLabel>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {phases.map((p, i) => (
            <button key={i} onClick={() => setPhaseIdx(i)} style={{
              flex: 1, padding: "8px 4px", borderRadius: 8, cursor: "pointer",
              background: phaseIdx === i ? p.color + "22" : C.surfaceHigh,
              border: `1.5px solid ${phaseIdx === i ? p.color : C.border}`,
              color: phaseIdx === i ? p.color : C.textMuted,
              fontSize: 11, fontWeight: 600,
            }}>
              {p.name}
              <span style={{ display: "block", fontSize: 10, opacity: 0.8 }}>W{p.done}/{p.weeks}</span>
            </button>
          ))}
        </div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ color: C.textMuted, fontSize: 12 }}>{ph.name}</span>
            <span style={{ color: ph.color, fontSize: 12, fontWeight: 600 }}>{ph.done}/{ph.weeks}週目</span>
          </div>
          <ProgressBar value={ph.done} max={ph.weeks} color={ph.color} height={8} />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          <Badge color={ph.color}>{ph.repRange} rep</Badge>
          <Badge color={C.textMuted}>RIR目標 {ph.rir}</Badge>
        </div>
      </Card>

      <SectionLabel>今日のメニュー — 上半身 A</SectionLabel>
      <Card style={{ background: C.blue + "08", border: `1px solid ${C.blue}2a`, padding: "4px 0" }}>
        {exercises.map((ex, i) => (
          <div key={i}>
            <div
              onClick={() => setExpanded(expanded === i ? null : i)}
              style={{
                display: "flex", alignItems: "center", padding: "12px 16px",
                borderBottom: expanded === i || i < exercises.length - 1 ? `1px solid ${C.border}` : "none",
                cursor: "pointer",
              }}
            >
              <div style={{ flex: 1 }}>
                <p style={{ color: C.text, fontSize: 14, fontWeight: 600, margin: "0 0 3px" }}>{ex.name}</p>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <Badge color={C.textMuted}>{ex.muscle}</Badge>
                  <span style={{ color: C.textMuted, fontSize: 12 }}>{ex.sets}セット × {ex.rep}</span>
                </div>
              </div>
              <div style={{ textAlign: "right", marginRight: 10 }}>
                <p style={{ color: C.blue, fontSize: 16, fontWeight: 700, margin: 0 }}>{ex.weight} kg</p>
                <p style={{ color: C.textMuted, fontSize: 10, margin: 0 }}>推奨重量</p>
              </div>
              {expanded === i
                ? <Icon.ChevronUp size={15} color={C.textMuted} />
                : <Icon.ChevronDown size={15} color={C.textMuted} />}
            </div>
            {expanded === i && (
              <div style={{
                padding: "12px 16px", background: C.surfaceHigh + "88",
                borderBottom: i < exercises.length - 1 ? `1px solid ${C.border}` : "none",
              }}>
                <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
                  {[
                    ["前回",     `${ex.weight} kg × ${parseInt(ex.rep)} rep`, C.text],
                    ["e1RM",    `${Math.round(ex.weight * (1 + parseInt(ex.rep) / 30))} kg`, C.text],
                    ["目標RIR", `${ex.rir}`, C.yellow],
                  ].map(([lbl, val, col]) => (
                    <div key={lbl}>
                      <p style={{ color: C.textMuted, fontSize: 11, margin: "0 0 3px" }}>{lbl}</p>
                      <p style={{ color: col, fontSize: 14, fontWeight: 700, margin: 0 }}>{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </Card>

      <button onClick={() => setScreen("home")} style={{
        width: "100%", marginTop: 4, padding: "14px 0", background: C.blue,
        color: "#fff", border: "none", borderRadius: 12,
        fontSize: 16, fontWeight: 700, cursor: "pointer",
      }}>
        セッション開始 →
      </button>
    </div>
  );
};

/* ─────────────────────────────────────────
   SCREEN 3: インサイト（分析）
───────────────────────────────────────── */
const InsightsScreen = () => {
  const muscles = [
    { name: "胸",   current: 12, target: 14, color: C.blue },
    { name: "背中", current: 16, target: 14, color: C.green },
    { name: "脚",   current: 10, target: 14, color: C.orange },
    { name: "肩",   current: 8,  target: 12, color: C.yellow },
    { name: "二頭", current: 9,  target: 10, color: C.purple },
    { name: "三頭", current: 7,  target: 10, color: C.red },
    { name: "体幹", current: 6,  target: 8,  color: C.textMuted },
  ];

  const fatigueScore = 72;
  const fatigueColor = fatigueScore >= 70 ? C.red : fatigueScore >= 50 ? C.yellow : C.green;
  const e1rmData   = [85, 87.5, 90, 90, 88, 87];
  const weekLabels = ["W1", "W2", "W3", "W4", "W5", "W6"];
  const eMax = 95, eMin = 80;

  return (
    <div style={{ padding: "16px 16px 120px" }}>
      <h1 style={{ color: C.text, fontSize: 20, fontWeight: 800, margin: "0 0 16px" }}>
        分析・インサイト
      </h1>

      <SectionLabel>疲労スコア（直近6週）</SectionLabel>
      <Card style={{
        background: C.red + "0e", border: `1px solid ${C.red}44`, marginBottom: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
          <svg width={60} height={60} viewBox="0 0 60 60">
            <circle cx={30} cy={30} r={25} fill="none" stroke={C.border} strokeWidth={5} />
            <circle cx={30} cy={30} r={25} fill="none" stroke={fatigueColor} strokeWidth={5}
              strokeDasharray={`${(fatigueScore / 100) * 157} 157`}
              strokeLinecap="round" transform="rotate(-90 30 30)"
            />
            <text x={30} y={35} textAnchor="middle" fill={fatigueColor} fontSize={14} fontWeight="800">
              {fatigueScore}
            </text>
          </svg>
          <div>
            <p style={{ color: fatigueColor, fontWeight: 700, margin: "0 0 2px", fontSize: 15 }}>
              ⚠️ ディロード推奨
            </p>
            <p style={{ color: C.textMuted, fontSize: 12, margin: 0 }}>蓄積疲労が高水準です</p>
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
          <p style={{ color: C.textMuted, fontSize: 12, margin: "0 0 6px" }}>検出シグナル:</p>
          {[
            "主要リフトのe1RMが2週連続低下",
            "6週連続でトレーニング中",
            "週間ボリュームが基準値の +24%",
          ].map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Icon.AlertTriangle size={12} color={C.red} />
              <span style={{ color: C.textMuted, fontSize: 12 }}>{s}</span>
            </div>
          ))}
          <button style={{
            width: "100%", marginTop: 10, padding: "10px 0",
            background: C.red + "22", color: C.red,
            border: `1px solid ${C.red}44`, borderRadius: 8,
            fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>
            ディロードプランを適用する →
          </button>
        </div>
      </Card>

      <SectionLabel>筋群別 週間ボリューム（セット数）</SectionLabel>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ color: C.textMuted, fontSize: 11 }}>現在 / 目標（分数的計量）</span>
          <div style={{ display: "flex", gap: 6 }}>
            <Badge color={C.green}>適正</Badge>
            <Badge color={C.red}>不足</Badge>
            <Badge color={C.orange}>超過</Badge>
          </div>
        </div>
        {muscles.map(({ name, current, target, color }) => {
          const ratio = current / target;
          const status =
            ratio >= 1.1  ? { label: "超過", color: C.orange }
            : ratio >= 0.85 ? { label: "適正", color: C.green }
            : { label: "不足", color: C.red };
          return (
            <div key={name} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: C.text, fontSize: 13, fontWeight: 600, width: 36 }}>{name}</span>
                <div style={{ flex: 1 }}>
                  <ProgressBar value={current} max={Math.max(target, current) + 3} color={color} height={10} />
                </div>
                <span style={{ color: C.textMuted, fontSize: 12, width: 36, textAlign: "right" }}>
                  {current}/{target}
                </span>
                <Badge color={status.color}>{status.label}</Badge>
              </div>
            </div>
          );
        })}
      </Card>

      <SectionLabel>ベンチプレス e1RM トレンド</SectionLabel>
      <Card>
        <div style={{ position: "relative", height: 130 }}>
          <svg width="100%" height="130" viewBox="0 0 320 130" preserveAspectRatio="none">
            <defs>
              <linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={C.blue} stopOpacity="0.25" />
                <stop offset="100%" stopColor={C.blue} stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0, 0.5, 1].map((t, i) => (
              <line key={i} x1={0} x2={320} y1={t * 110 + 10} y2={t * 110 + 10}
                stroke={C.border} strokeWidth={1} />
            ))}
            <path
              d={[
                `M 0,${110 - ((e1rmData[0] - eMin) / (eMax - eMin)) * 100 + 10}`,
                ...e1rmData.slice(1).map((v, i) =>
                  `L ${(i + 1) * 64},${110 - ((v - eMin) / (eMax - eMin)) * 100 + 10}`
                ),
                "L 320,130 L 0,130 Z",
              ].join(" ")}
              fill="url(#grad)"
            />
            <polyline
              points={e1rmData.map((v, i) =>
                `${i * 64},${110 - ((v - eMin) / (eMax - eMin)) * 100 + 10}`
              ).join(" ")}
              fill="none" stroke={C.blue} strokeWidth={2.5}
              strokeLinecap="round" strokeLinejoin="round"
            />
            {e1rmData.map((v, i) => {
              const x = i * 64;
              const y = 110 - ((v - eMin) / (eMax - eMin)) * 100 + 10;
              const isDown = i > 0 && v < e1rmData[i - 1];
              return (
                <g key={i}>
                  <circle cx={x} cy={y} r={4} fill={isDown ? C.red : C.blue} />
                  <text x={x} y={y - 8} textAnchor="middle"
                    fill={isDown ? C.red : C.text} fontSize={10} fontWeight="600">{v}</text>
                </g>
              );
            })}
          </svg>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          {weekLabels.map(w => (
            <span key={w} style={{ color: C.textMuted, fontSize: 11, flex: 1, textAlign: "center" }}>{w}</span>
          ))}
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 6, marginTop: 10,
          paddingTop: 10, borderTop: `1px solid ${C.border}`,
        }}>
          <Icon.TrendingDown size={14} color={C.red} />
          <span style={{ color: C.textMuted, fontSize: 12, lineHeight: 1.5 }}>
            直近2週でe1RMが低下。疲労蓄積のサインの可能性があります。
          </span>
        </div>
      </Card>
    </div>
  );
};

/* ─────────────────────────────────────────
   SCREEN 4: PR（既存 + トレンド追加）
───────────────────────────────────────── */
const PRScreen = () => {
  const prs = [
    { name: "デッドリフト",        e1rm: 155, weight: 140, reps: 6, trend: +5.0, muscle: "背中" },
    { name: "バックスクワット",     e1rm: 130, weight: 120, reps: 5, trend: +2.5, muscle: "脚" },
    { name: "ベンチプレス",         e1rm: 107, weight: 100, reps: 6, trend: -1.5, muscle: "胸" },
    { name: "バーベルロウ",         e1rm: 98,  weight: 90,  reps: 6, trend: +1.0, muscle: "背中" },
    { name: "オーバーヘッドプレス", e1rm: 72,  weight: 65,  reps: 6, trend: 0.0,  muscle: "肩" },
  ];

  return (
    <div style={{ padding: "16px 16px 120px" }}>
      <h1 style={{ color: C.text, fontSize: 20, fontWeight: 800, margin: "0 0 4px" }}>
        パーソナルレコード
      </h1>
      <p style={{ color: C.textMuted, fontSize: 12, marginBottom: 16 }}>
        e1RM = Epley式 weight × (1 + reps / 30)
      </p>
      {prs.map(({ name, e1rm, weight, reps, trend, muscle }) => (
        <Card key={name} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                <span style={{ color: C.text, fontSize: 14, fontWeight: 700 }}>{name}</span>
                <Badge color={C.blue}>{muscle}</Badge>
              </div>
              <span style={{ color: C.textMuted, fontSize: 12 }}>{weight} kg × {reps} rep</span>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ color: C.text, fontSize: 20, fontWeight: 800, margin: "0 0 3px" }}>
                {e1rm} <span style={{ fontSize: 13, fontWeight: 400 }}>kg</span>
              </p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                {trend > 0
                  ? <Icon.TrendingUp   size={13} color={C.green} />
                  : trend < 0
                  ? <Icon.TrendingDown size={13} color={C.red} />
                  : <Icon.Minus        size={13} color={C.textMuted} />}
                <span style={{
                  color: trend > 0 ? C.green : trend < 0 ? C.red : C.textMuted,
                  fontSize: 12, fontWeight: 600,
                }}>
                  {trend > 0 ? `+${trend}` : trend === 0 ? "±0" : trend} kg
                </span>
                <span style={{ color: C.textMuted, fontSize: 11 }}>/週</span>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────
   ROOT
───────────────────────────────────────── */
export default function App() {
  const [screen, setScreen] = useState("onboard");

  return (
    <div style={{
      background: C.bg, minHeight: "100vh",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif",
      color: C.text,
    }}>
      <div style={{ maxWidth: 448, margin: "0 auto", minHeight: "100vh", position: "relative" }}>

        {/* デモ用 画面切替タブ */}
        <div style={{
          position: "sticky", top: 0, zIndex: 200,
          background: C.surface, borderBottom: `1px solid ${C.border}`,
          padding: "8px 12px", display: "flex", gap: 6, overflowX: "auto",
        }}>
          <span style={{ color: C.textMuted, fontSize: 11, alignSelf: "center", flexShrink: 0 }}>
            画面切替:
          </span>
          {[
            { id: "onboard",  label: "①初回設定" },
            { id: "plan",     label: "②プラン" },
            { id: "home",     label: "③ログ" },
            { id: "insights", label: "④分析" },
            { id: "pr",       label: "⑤PR" },
          ].map(({ id, label }) => (
            <Pill key={id} active={screen === id} onClick={() => setScreen(id)}>
              {label}
            </Pill>
          ))}
        </div>

        {screen === "onboard"  && <OnboardScreen setScreen={setScreen} />}
        {screen === "plan"     && <PlanScreen    setScreen={setScreen} />}
        {screen === "home"     && <HomeScreen />}
        {screen === "insights" && <InsightsScreen />}
        {screen === "pr"       && <PRScreen />}

        {screen !== "onboard" && (
          <BottomNav screen={screen} setScreen={setScreen} />
        )}
      </div>
    </div>
  );
}
