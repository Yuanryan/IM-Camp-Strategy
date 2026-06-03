"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { fetcher, useSnapshot, TeamSelect, ActionButton } from "@/components/client";
import { RewardButtons, CustomGive } from "@/components/RewardPanel";
import { Card } from "@/components/Shell";
import { Num, EventBanner } from "@/components/ui";
import { MOBILE_REWARD_PRESETS } from "@/lib/game";

// 題庫 CRUD（流動關主可編輯）
async function sendQuestion(method: string, body: unknown) {
  const r = await fetch("/api/questions", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error ?? "操作失敗");
  return d;
}

type QData = {
  games: string[];
  questions: { id: number; gameName: string; prompt: string; answer: string | null; difficulty: string | null }[];
};

export function MobileView() {
  const { snap, mutate } = useSnapshot(4000);
  const [team, setTeam] = useState<number | "">("");
  const [tab, setTab] = useState<"ops" | "bank">("ops");

  if (!snap) return <p className="text-sm text-slate-400">載入中…</p>;

  return (
    <div className="space-y-4">
      {/* 分頁 */}
      <div className="flex gap-2">
        {([["ops", "關主操作"], ["bank", "題庫管理"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === key ? "bg-cyan-500 text-slate-950" : "chip"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "ops" ? (
        <>
          <EventBanner events={snap.activeEvents} />

          <Card title="發放獎勵（光幣 / 卡牌點數）">
            <TeamSelect teams={snap.teams} value={team} onChange={setTeam} />
            <div className="mt-3">
              <RewardButtons teamId={team} presets={MOBILE_REWARD_PRESETS} onDone={mutate} />
            </div>
            <div className="mt-3 border-t border-white/10 pt-3">
              <CustomGive teamId={team} onDone={mutate} />
            </div>
            <p className="mt-2 text-xs text-slate-500">骰子、情報牌、特殊骰、功能卡兌換券為實體發放，請隊輔記錄，不在系統登記。</p>
          </Card>

          <Timer />
          <Questions />
        </>
      ) : (
        <QuestionManager />
      )}
    </div>
  );
}

function Timer() {
  const [sec, setSec] = useState(0);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSec((s) => (s > 0 ? s - 1 : (setRunning(false), 0))), 1000);
    return () => clearInterval(id);
  }, [running]);
  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  return (
    <Card title="計時器">
      <div className="flex items-center gap-4">
        <Num className={`text-5xl font-black ${running && sec <= 10 ? "neon-rose" : "text-slate-100"}`}>{mm}:{ss}</Num>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setSec(60); setRunning(true); }} className="chip px-4 py-2 text-sm">1 分鐘</button>
          <button onClick={() => { setSec(180); setRunning(true); }} className="chip px-4 py-2 text-sm">3 分鐘</button>
          <button onClick={() => setRunning((r) => !r)} className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950">{running ? "暫停" : "繼續"}</button>
          <button onClick={() => { setSec(0); setRunning(false); }} className="chip px-4 py-2 text-sm">歸零</button>
        </div>
      </div>
    </Card>
  );
}

function Questions() {
  const { data } = useSWR<QData>("/api/questions", fetcher);
  const [game, setGame] = useState<string>("");
  const [idx, setIdx] = useState(0);
  const [show, setShow] = useState(false);

  if (!data) return <Card title="題庫"><p className="text-sm text-slate-400">載入中…</p></Card>;
  const pool = game ? data.questions.filter((q) => q.gameName === game) : [];
  const q = pool[idx];

  return (
    <Card title="題庫（抽題 / 看答案）">
      <div className="mb-3 flex flex-wrap gap-2">
        {data.games.map((g) => (
          <button key={g} onClick={() => { setGame(g); setIdx(0); setShow(false); }}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${game === g ? "bg-cyan-500 text-slate-950" : "chip"}`}>{g}</button>
        ))}
      </div>
      {game && (
        pool.length === 0 ? <p className="text-sm text-slate-400">此遊戲尚無題目（可在「題庫管理」分頁新增）</p> : (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-slate-500">第 {idx + 1} / {pool.length} 題 {q.difficulty && `・${q.difficulty}`}</div>
            <div className="my-2 text-xl font-bold">{q.prompt}</div>
            {show && q.answer && <div className="text-emerald-300">答案：{q.answer}</div>}
            <div className="mt-3 flex gap-2">
              <button onClick={() => { setIdx(Math.floor(Math.random() * pool.length)); setShow(false); }}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm text-white">抽一題</button>
              <button onClick={() => setShow((s) => !s)} className="chip px-4 py-2 text-sm">{show ? "隱藏答案" : "看答案"}</button>
              <button onClick={() => { setIdx((i) => (i + 1) % pool.length); setShow(false); }} className="chip px-4 py-2 text-sm">下一題</button>
            </div>
          </div>
        )
      )}
    </Card>
  );
}

type QRow = QData["questions"][number];

// 題庫管理：檢視 / 新增 / 編輯 / 刪除
function QuestionManager() {
  const { data, mutate } = useSWR<QData>("/api/questions", fetcher);
  const [game, setGame] = useState<string>("");
  const [filter, setFilter] = useState("");

  if (!data) return <Card title="題庫管理"><p className="text-sm text-slate-400">載入中…</p></Card>;
  const games = data.games;
  const activeGame = game || games[0] || "";
  const kw = filter.trim();
  const list = data.questions.filter(
    (q) => q.gameName === activeGame && (kw === "" || q.prompt.includes(kw) || (q.answer ?? "").includes(kw)),
  );

  return (
    <div className="space-y-4">
      <Card title="新增題目">
        <NewQuestionForm games={games} defaultGame={activeGame} onDone={mutate} />
      </Card>

      <Card title={`題庫管理（共 ${data.questions.length} 題）`}>
        <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 py-1.5">
          {games.map((g) => (
            <button key={g} onClick={() => setGame(g)}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition ${
                activeGame === g ? "bg-cyan-500 text-slate-950" : "chip"
              }`}>
              {g}
              <span className="ml-1.5 text-xs opacity-70">{data.questions.filter((q) => q.gameName === g).length}</span>
            </button>
          ))}
        </div>

        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="搜尋題目 / 答案"
          className="fld mb-3 w-full" />

        <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
          {list.length === 0 ? (
            <p className="text-sm text-slate-400">無符合題目</p>
          ) : (
            list.map((q) => <QuestionRow key={q.id} q={q} games={games} onDone={mutate} />)
          )}
        </div>
      </Card>
    </div>
  );
}

function NewQuestionForm({ games, defaultGame, onDone }: { games: string[]; defaultGame: string; onDone: () => void | Promise<unknown>; }) {
  const [gameName, setGameName] = useState(defaultGame);
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [difficulty, setDifficulty] = useState("");

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <label className="text-xs text-slate-400">
        <div className="mb-1">遊戲名稱</div>
        <input list="qm-games" value={gameName} onChange={(e) => setGameName(e.target.value)} placeholder="例如：冷知識" className="fld w-full" />
        <datalist id="qm-games">{games.map((g) => <option key={g} value={g} />)}</datalist>
      </label>
      <label className="text-xs text-slate-400">
        <div className="mb-1">難度（可空白）</div>
        <input value={difficulty} onChange={(e) => setDifficulty(e.target.value)} placeholder="例如：簡單 / 建議 10 秒" className="fld w-full" />
      </label>
      <label className="text-xs text-slate-400 sm:col-span-2">
        <div className="mb-1">題目</div>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2} className="fld w-full" />
      </label>
      <label className="text-xs text-slate-400 sm:col-span-2">
        <div className="mb-1">答案（可空白）</div>
        <input value={answer} onChange={(e) => setAnswer(e.target.value)} className="fld w-full" />
      </label>
      <div className="sm:col-span-2">
        <ActionButton label="新增題目" disabled={!gameName.trim() || !prompt.trim()}
          onAction={async () => {
            if (!gameName.trim() || !prompt.trim()) return "需填遊戲名稱與題目";
            await sendQuestion("POST", { gameName: gameName.trim(), prompt: prompt.trim(), answer, difficulty });
            setPrompt(""); setAnswer("");
            await onDone();
            return "已新增";
          }} />
      </div>
    </div>
  );
}

function QuestionRow({ q, games, onDone }: { q: QRow; games: string[]; onDone: () => void | Promise<unknown>; }) {
  const [editing, setEditing] = useState(false);
  const [gameName, setGameName] = useState(q.gameName);
  const [prompt, setPrompt] = useState(q.prompt);
  const [answer, setAnswer] = useState(q.answer ?? "");
  const [difficulty, setDifficulty] = useState(q.difficulty ?? "");

  const reset = () => {
    setGameName(q.gameName);
    setPrompt(q.prompt);
    setAnswer(q.answer ?? "");
    setDifficulty(q.difficulty ?? "");
  };

  // 檢視模式：唯讀，按「編輯」才展開
  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition-all hover:bg-white/10">
        <div className="min-w-0">
          <p className="break-words text-sm text-slate-100">{q.prompt}</p>
          {(q.answer || q.difficulty) && (
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
              {q.answer && <span>答案：<span className="text-emerald-300">{q.answer}</span></span>}
              {q.difficulty && <span>難度：{q.difficulty}</span>}
            </div>
          )}
        </div>
        <button onClick={() => setEditing(true)}
          className="chip shrink-0 px-3 py-2 text-xs hover:bg-white/20">編輯</button>
      </div>
    );
  }

  // 編輯模式
  return (
    <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/5 p-3 ring-1 ring-cyan-400/20">
      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2} className="fld w-full" />
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="答案（可空白）" className="fld w-full" />
        <input value={difficulty} onChange={(e) => setDifficulty(e.target.value)} placeholder="難度（可空白）" className="fld w-full" />
        <select value={gameName} onChange={(e) => setGameName(e.target.value)} className="fld w-full">
          {games.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <ActionButton label="儲存"
          onAction={async () => {
            if (!prompt.trim()) return "題目不可空白";
            await sendQuestion("PATCH", { id: q.id, gameName, prompt: prompt.trim(), answer, difficulty });
            await onDone();
            setEditing(false);
            return "已儲存";
          }} />
        <button onClick={() => { reset(); setEditing(false); }} className="chip px-4 py-2 text-sm">取消</button>
        <ActionButton label="刪除" className="ml-auto bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
          confirmText="確定刪除這題？"
          onAction={async () => {
            await sendQuestion("DELETE", { id: q.id });
            await onDone();
            return "已刪除";
          }} />
      </div>
    </div>
  );
}
