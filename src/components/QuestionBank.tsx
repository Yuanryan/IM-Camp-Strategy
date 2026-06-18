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

// ⚠ 切換遊戲時須重置篩選 / 進度：呼叫端請傳 key={game} 讓元件重新掛載，
// 避免在 effect 內 setState 造成連鎖渲染（見 react-hooks/set-state-in-effect）。
export function QuestionBank({ game }: { game: string }) {
  const { data } = useSWR<QData>("/api/questions", fetcher);
  const [level, setLevel] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [idx, setIdx] = useState(0);
  const [show, setShow] = useState(false);

  if (!data) return <p className="text-sm text-slate-400">載入中…</p>;

  const gamePool = data.questions.filter((q) => q.gameName === game);
  // 此遊戲實際存在的難度 / 類型，動態決定要不要顯示篩選列
  const levels = LEVELS.filter((lv) => gamePool.some((q) => q.difficulty?.includes(lv)));
  const types = [...new Set(gamePool.map((q) => typeOf(q.difficulty)).filter((t): t is string => !!t))];

  const pool = gamePool.filter(
    (q) =>
      (level === "" || q.difficulty?.includes(level)) &&
      (type === "" || typeOf(q.difficulty) === type),
  );
  const q = pool[idx];
  const opts = q?.options ? shuffleStable([q.answer ?? "", ...q.options.split("|")], q.id) : null;

  return (
    <div>
      {(types.length > 0 || levels.length > 0) && (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          {levels.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-500">難度</span>
              <FilterChip label="全部" active={level === ""} onClick={() => { setLevel(""); setIdx(0); setShow(false); }} />
              {levels.map((lv) => (
                <FilterChip key={lv} label={lv} active={level === lv} onClick={() => { setLevel(lv); setIdx(0); setShow(false); }} />
              ))}
            </div>
          )}
          {types.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-500">類型</span>
              <FilterChip label="全部" active={type === ""} onClick={() => { setType(""); setIdx(0); setShow(false); }} />
              {types.map((t) => (
                <FilterChip key={t} label={t} active={type === t} onClick={() => { setType(t); setIdx(0); setShow(false); }} />
              ))}
            </div>
          )}
        </div>
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
            <div className="mt-3 flex gap-2">
              <button onClick={() => { setIdx(Math.floor(Math.random() * pool.length)); setShow(false); }}
                className="chip rounded-lg px-4 py-2 text-sm hover:bg-white/20">抽一題</button>
              {/* 只有「有正解可揭曉」（含干擾項或填寫答案）的題目才顯示看答案 */}
              {(opts || q.answer) && (
                <button onClick={() => setShow((s) => !s)} className="chip px-4 py-2 text-sm">{show ? (opts ? "隱藏正解" : "隱藏答案") : (opts ? "公布答案" : "看答案")}</button>
              )}
              <button onClick={() => { setIdx((i) => (i + 1) % pool.length); setShow(false); }} className="chip px-4 py-2 text-sm">下一題</button>
            </div>
          </div>
      )}
    </div>
  );
}
