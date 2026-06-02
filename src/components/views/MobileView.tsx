"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { fetcher, useSnapshot, TeamSelect } from "@/components/client";
import { RewardButtons } from "@/components/RewardPanel";
import { Card } from "@/components/Shell";
import { Num, EventBanner } from "@/components/ui";
import { MOBILE_REWARD_PRESETS } from "@/lib/game";

type QData = {
  games: string[];
  questions: { id: number; gameName: string; prompt: string; answer: string | null; difficulty: string | null }[];
};

export function MobileView() {
  const { snap, mutate } = useSnapshot(4000);
  const [team, setTeam] = useState<number | "">("");

  if (!snap) return <p className="text-sm text-slate-400">載入中…</p>;

  return (
    <div className="space-y-4">
      <EventBanner events={snap.activeEvents} />

      <Card title="發放獎勵（光幣 / 卡牌點數）">
        <TeamSelect teams={snap.teams} value={team} onChange={setTeam} />
        <div className="mt-3">
          <RewardButtons teamId={team} presets={MOBILE_REWARD_PRESETS} onDone={mutate} />
        </div>
        <p className="mt-2 text-xs text-slate-500">骰子、情報牌、特殊骰、功能卡兌換券為實體發放，請隊輔記錄，不在系統登記。</p>
      </Card>

      <Timer />
      <Questions />
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
          <button onClick={() => { setSec(60); setRunning(true); }} className="chip px-3 py-1.5 text-sm">1 分鐘</button>
          <button onClick={() => { setSec(180); setRunning(true); }} className="chip px-3 py-1.5 text-sm">3 分鐘</button>
          <button onClick={() => setRunning((r) => !r)} className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white">{running ? "暫停" : "繼續"}</button>
          <button onClick={() => { setSec(0); setRunning(false); }} className="chip px-3 py-1.5 text-sm">歸零</button>
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
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${game === g ? "bg-indigo-500 text-white" : "chip"}`}>{g}</button>
        ))}
      </div>
      {game && (
        pool.length === 0 ? <p className="text-sm text-slate-400">此遊戲尚無題目（可在 Admin 新增）</p> : (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-slate-500">第 {idx + 1} / {pool.length} 題 {q.difficulty && `・${q.difficulty}`}</div>
            <div className="my-2 text-xl font-bold">{q.prompt}</div>
            {show && q.answer && <div className="text-emerald-300">答案：{q.answer}</div>}
            <div className="mt-3 flex gap-2">
              <button onClick={() => { setIdx(Math.floor(Math.random() * pool.length)); setShow(false); }}
                className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm text-white">抽一題</button>
              <button onClick={() => setShow((s) => !s)} className="chip px-3 py-1.5 text-sm">{show ? "隱藏答案" : "看答案"}</button>
              <button onClick={() => { setIdx((i) => (i + 1) % pool.length); setShow(false); }} className="chip px-3 py-1.5 text-sm">下一題</button>
            </div>
          </div>
        )
      )}
    </Card>
  );
}
