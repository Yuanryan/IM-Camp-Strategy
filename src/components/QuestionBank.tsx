"use client";

// 題庫抽題面板（共用）：流動關卡（MobileView）與好運 / 厄運卡（LuckDraw）共用。
// 依 gameName 抽題 / 看答案，含類型 / 難度篩選；無正解的題目（如比手畫腳）不顯示看答案。
import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/components/client";

export type QData = {
  games: string[];
  questions: { id: number; gameName: string; prompt: string; answer: string | null; difficulty: string | null; options: string | null }[];
};

export const LEVELS = ["簡單", "中等", "困難"] as const;
// 口型題的 difficulty 形如「歌名・困難」，取「・」前為類型
export const typeOf = (d: string | null) => (d && d.includes("・") ? d.split("・")[0] : null);
// 穩定洗牌：同一 id 產生相同順序（避免每次 render 跳動）
export function shuffleStable<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed * 9301 + 49297;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`rounded-md px-3 py-1 text-xs font-medium transition ${active ? "bg-cyan-500 text-slate-950" : "chip"}`}>
      {label}
    </button>
  );
}

// 某遊戲在題庫中實際存在的難度 / 類型（決定是否顯示篩選列；空陣列＝不顯示）
export function deriveFilters(questions: QData["questions"], game: string): { levels: string[]; types: string[] } {
  const gamePool = questions.filter((q) => q.gameName === game);
  const levels = LEVELS.filter((lv) => gamePool.some((q) => q.difficulty?.includes(lv)));
  const types = [...new Set(gamePool.map((q) => typeOf(q.difficulty)).filter((t): t is string => !!t))];
  return { levels, types };
}

// 純呈現的篩選列（難度 + 類型）。受控：值與 setter 由呼叫端持有，說明 / 進行中可共用同一份選擇。
export function QuestionFilters({
  levels, types, level, type, onLevel, onType, className = "",
}: {
  levels: string[]; types: string[];
  level: string; type: string;
  onLevel: (v: string) => void; onType: (v: string) => void;
  className?: string;
}) {
  if (levels.length === 0 && types.length === 0) return null;
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {levels.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-500">難度</span>
          <FilterChip label="全部" active={level === ""} onClick={() => onLevel("")} />
          {levels.map((lv) => (
            <FilterChip key={lv} label={lv} active={level === lv} onClick={() => onLevel(lv)} />
          ))}
        </div>
      )}
      {types.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-500">類型</span>
          <FilterChip label="全部" active={type === ""} onClick={() => onType("")} />
          {types.map((t) => (
            <FilterChip key={t} label={t} active={type === t} onClick={() => onType(t)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ⚠ 切換遊戲時須重置篩選 / 進度：呼叫端請傳 key={game} 讓元件重新掛載，
// 避免在 effect 內 setState 造成連鎖渲染（見 react-hooks/set-state-in-effect）。
// onCorrect（選用）：流動關卡用，按「✓ 答對」時累加答對數並自動跳下一題；好運 / 厄運卡不傳，不顯示該鈕。
// 受控篩選（選用）：傳入 type/level（+ 對應 setter）改為受控；不傳則用內建 state（好運 / 厄運卡）。
// showFilters：是否在面板內顯示篩選列（流動關卡在「說明」已選好，進行中設 false）。
export function QuestionBank({
  game, onCorrect, showFilters = true,
  type: typeProp, level: levelProp, onType: onTypeProp, onLevel: onLevelProp,
}: {
  game: string;
  onCorrect?: () => void;
  showFilters?: boolean;
  type?: string; level?: string;
  onType?: (v: string) => void; onLevel?: (v: string) => void;
}) {
  const { data } = useSWR<QData>("/api/questions", fetcher);
  const [levelState, setLevelState] = useState<string>("");
  const [typeState, setTypeState] = useState<string>("");
  const [idx, setIdx] = useState(0);
  const [show, setShow] = useState(false);

  // 受控優先；未受控則用內建 state
  const level = levelProp ?? levelState;
  const type = typeProp ?? typeState;
  const setLevel = (v: string) => { (onLevelProp ?? setLevelState)(v); setIdx(0); setShow(false); };
  const setType = (v: string) => { (onTypeProp ?? setTypeState)(v); setIdx(0); setShow(false); };

  if (!data) return <p className="text-sm text-slate-400">載入中…</p>;

  const gamePool = data.questions.filter((q) => q.gameName === game);
  const { levels, types } = deriveFilters(data.questions, game);

  const pool = gamePool.filter(
    (q) =>
      (level === "" || q.difficulty?.includes(level)) &&
      (type === "" || typeOf(q.difficulty) === type),
  );
  const q = pool[idx];
  const opts = q?.options ? shuffleStable([q.answer ?? "", ...q.options.split("|")], q.id) : null;

  return (
    <div>
      {showFilters && (
        <QuestionFilters
          className="mb-3" levels={levels} types={types}
          level={level} type={type} onLevel={setLevel} onType={setType}
        />
      )}

      {pool.length === 0 ? <p className="text-sm text-slate-400">此條件下尚無題目（可調整篩選或在「題庫管理」分頁新增）</p> : (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-slate-500">第 {idx + 1} / {pool.length} 題 {q.difficulty && `・${q.difficulty}`}</div>
            <div className="my-2 text-xl font-bold">{q.prompt}</div>
            {opts ? (
              <div className="mt-2 space-y-1.5">
                {opts.map((o, i) => {
                  const correct = o === q.answer;
                  return (
                    <div key={i}
                      className={`rounded-lg border px-3 py-2 text-sm ${
                        show && correct ? "border-emerald-400 bg-emerald-500/15 text-emerald-200 font-semibold" : "border-white/10 bg-white/5"
                      }`}>
                      <span className="mr-2 text-slate-400">{"ABC"[i]}</span>{o}
                      {show && correct && <span className="ml-2">✓</span>}
                    </div>
                  );
                })}
              </div>
            ) : (
              show && q.answer && <div className="text-emerald-300">答案：{q.answer}</div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {/* 流動關卡：答對 → 計入答對數並跳下一題 */}
              {onCorrect && (
                <button onClick={() => { onCorrect(); setIdx(Math.floor(Math.random() * pool.length)); setShow(false); }}
                  className="btn-emerald rounded-lg px-4 py-2 text-sm font-bold">✓ 答對</button>
              )}
              <button onClick={() => { setIdx(Math.floor(Math.random() * pool.length)); setShow(false); }}
                className="btn-rose rounded-lg px-4 py-2 text-sm hover:bg-white/20">跳過</button>
              {/* 只有「有正解可揭曉」（含干擾項或填寫答案）的題目才顯示看答案 */}
              {(opts || q.answer) && (
                <button onClick={() => setShow((s) => !s)} className="chip px-4 py-2 text-sm">{show ? (opts ? "隱藏正解" : "隱藏答案") : (opts ? "公布答案" : "看答案")}</button>
              )}
            </div>
          </div>
      )}
    </div>
  );
}
