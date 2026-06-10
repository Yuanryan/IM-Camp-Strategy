"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { fetcher, useSnapshot, TeamSelect, ActionButton, postJson } from "@/components/client";
import { RewardButtons, CustomGive } from "@/components/RewardPanel";
import { Card, StickyTeam } from "@/components/Shell";
import { Num, EventBanner, HudTabs, TeamItemBadges } from "@/components/ui";
import { MOBILE_REWARD_PRESETS, ITEM_GRADE_COLORS, EffectType } from "@/lib/game";
import { Gamepad2, BookOpen, Timer as TimerIcon, Pause, Play, RotateCcw } from "lucide-react";

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
      <HudTabs
        active={tab}
        onChange={setTab}
        tabs={[
          ["ops", "關主操作", <Gamepad2 className="h-4 w-4" />],
          ["bank", "題庫管理", <BookOpen className="h-4 w-4" />],
        ] as const}
      />

      {tab === "ops" ? (
        <>
          <EventBanner events={snap.activeEvents} />

          <StickyTeam>
            <div className="flex flex-wrap items-center gap-3">
              <TeamSelect teams={snap.teams} value={team} onChange={setTeam} />
              {!team && <span className="text-xs text-amber-300/80">⚠ 請先選擇小隊</span>}
            </div>
            <TeamItemBadges
              items={snap.teams.find((t) => t.id === team)?.items ?? []}
              relevantTypes={[EffectType.GOOD_CARD_BONUS, EffectType.BAD_CARD_REDUCE, EffectType.WHEEL_ON_GOOD_CARD, EffectType.DOUBLE_OR_NOTHING, EffectType.REMINDER]}
            />
          </StickyTeam>
          <Questions />
          <Timer />

          <Card title="發放獎勵（光幣 / 卡牌點數）">
            <RewardButtons teamId={team} presets={MOBILE_REWARD_PRESETS} onDone={mutate} endpoint="/api/mobile/reward" />
            <div className="mt-3 border-t border-white/10 pt-3">
              <CustomGive teamId={team} onDone={mutate} endpoint="/api/mobile/reward" />
            </div>
            <p className="mt-2 text-xs text-slate-500">骰子、情報牌、特殊骰、功能卡兌換券為實體發放，請隊輔記錄，不在系統登記。</p>
          </Card>

          <GrantItemCard teamId={team} />
        </>
      ) : (
        <QuestionManager />
      )}
    </div>
  );
}


type AssetTemplate = { id: number; name: string; grade: string; effectType: string; effectValue: number; description: string };

function GrantItemCard({ teamId }: { teamId: number | "" }) {
  const { data: assets } = useSWR<AssetTemplate[]>("/api/items", fetcher);
  const [assetId, setAssetId] = useState<number | "">("");
  const [hidden, setHidden] = useState(0);
  const [note, setNote] = useState("");

  return (
    <Card title="授予動產">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-slate-400">
          <div className="mb-1">動產</div>
          <select value={assetId} onChange={(e) => setAssetId(e.target.value ? Number(e.target.value) : "")} className="fld min-w-48">
            <option value="">選擇動產</option>
            {assets?.map((a) => (
              <option key={a.id} value={a.id}>[{a.grade}] {a.name}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-400">
          <div className="mb-1">秘密幣值</div>
          <input type="number" inputMode="numeric" value={hidden} onChange={(e) => setHidden(Number(e.target.value) || 0)} className="fld w-24" />
        </label>
        <label className="text-xs text-slate-400">
          <div className="mb-1">備註</div>
          <input value={note} onChange={(e) => setNote(e.target.value)} className="fld w-32" placeholder="例：挑戰獎勵" />
        </label>
        <ActionButton label="授予" className="btn-emerald"
          disabled={teamId === "" || assetId === ""}
          onAction={async () => {
            await postJson("/api/items/grant", { teamId, assetId, hiddenValue: hidden, note: note || undefined });
            setAssetId("");
            setHidden(0);
            setNote("");
            return "已授予動產";
          }} />
      </div>
      {assetId !== "" && assets && (
        <p className="mt-2 text-xs text-slate-400">
          <span className={`mr-1.5 rounded border px-1 py-0.5 text-[10px] font-bold ${ITEM_GRADE_COLORS[assets.find((a) => a.id === assetId)?.grade ?? ""] ?? ""}`}>
            {assets.find((a) => a.id === assetId)?.grade}
          </span>
          {assets.find((a) => a.id === assetId)?.description}
        </p>
      )}
    </Card>
  );
}

function Timer() {
  const [sec, setSec] = useState(0);
  const [totalSec, setTotalSec] = useState(0); 
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSec((s) => {
        if (s > 1) return s - 1;
        setRunning(false);
        return 0;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const adjustTime = (amount: number) => {
    const newSec = Math.max(0, sec + amount);
    setSec(newSec);
    setTotalSec(newSec);
  };

  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  const isDanger = running && sec <= 10 && sec > 0;

  // SVG 圓環計算邏輯
  const radius = 120;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = totalSec > 0 ? circumference - (sec / totalSec) * circumference : circumference;

  return (
    <Card title={<div className="flex items-center gap-2"><TimerIcon className="h-5 w-5 text-rose-400" /> 任務計時器</div>}>
      <div className="flex flex-col items-center gap-6 rounded-lg border border-white/5 bg-slate-950/50 p-6">
        
        {/* 圓環與時間顯示區 (Relative Container) */}
        <div className="relative flex items-center justify-center w-[280px] h-[280px] md:w-[320px] md:h-[320px]">
          
          {/* 背景軌道圓環 */}
          <svg className="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 240 240">
            <circle
              cx="120"
              cy="120"
              r={normalizedRadius}
              fill="transparent"
              strokeWidth={stroke}
              className="stroke-slate-800/50"
            />
            {/* 動態進度圓環 */}
            <circle
              cx="120"
              cy="120"
              r={normalizedRadius}
              fill="transparent"
              strokeWidth={stroke}
              strokeDasharray={circumference + " " + circumference}
              style={{ strokeDashoffset, transition: "stroke-dashoffset 1s linear" }}
              strokeLinecap="round"
              className={`transition-colors duration-300 ${
                isDanger 
                  ? "stroke-rose-500 drop-shadow-[0_0_8px_rgba(225,29,72,0.4)]" 
                  : "stroke-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.25)]"
              }`}
            />
          </svg>

          {/* 中央資訊區：使用絕對定位讓動畫不互相干擾 */}
          <div className="absolute inset-0 flex items-center justify-center">
            
            {/* 時間數字 (暫停時偏上，開始時滑到中央並放大) */}
            <div className={`absolute transition-all duration-500 ease-out ${
              running 
                ? "translate-y-0 scale-[1.15] md:scale-[1.2]" // 執行中：回到正中心並放大 15%~25%
                : "-translate-y-5 md:-translate-y-6 scale-100"  // 暫停時：稍微往上提給按鈕空間
            }`}>
              <Num className={`text-6xl md:text-7xl font-black font-mono tracking-widest ${
                isDanger ? "text-rose-500 drop-shadow-[0_0_15px_rgba(225,29,72,0.8)] animate-pulse" :
                running ? "text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]" :
                "text-slate-200"
              }`}>
                {mm}:{ss}
              </Num>
            </div>

            {/* 微調按鈕群 (暫停時顯示在時間下方，開始時往下降並淡出) */}
            <div className={`absolute flex gap-2 transition-all duration-500 ease-out ${
              running 
                ? "opacity-0 translate-y-16 md:translate-y-20 pointer-events-none scale-90" // 執行中：往下沉並隱藏
                : "opacity-100 translate-y-10 md:translate-y-12 scale-100"                   // 暫停時：顯示在正下方
            }`}>
              <button onClick={() => adjustTime(-30)} 
                className="flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/10 px-3 py-1.5 text-xs md:text-sm font-bold text-slate-300 transition-colors active:scale-95">
                -30s
              </button>
              <button onClick={() => adjustTime(30)} 
                className="flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/10 px-3 py-1.5 text-xs md:text-sm font-bold text-slate-300 transition-colors active:scale-95">
                +30s
              </button>
              <button onClick={() => adjustTime(60)} 
                className="flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/10 px-3 py-1.5 text-xs md:text-sm font-bold text-slate-300 transition-colors active:scale-95">
                +1m
              </button>
            </div>
          </div>
        </div>

        {/* 底部大按鈕操作區 (Play/Pause & Reset) */}
        <div className="flex w-full gap-3 mt-2 md:px-8">
          <button onClick={() => setRunning((r) => !r)} disabled={sec === 0}
            className={`group flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-4 md:py-5 text-base md:text-lg font-bold tracking-widest transition-all active:scale-[0.98] disabled:scale-100 disabled:opacity-40 ${
              running
                ? "border border-amber-500/50 bg-amber-500/20 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:bg-amber-500/30"
                : "border border-cyan-500/50 bg-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:bg-cyan-500/30 hover:shadow-[0_0_20px_rgba(34,211,238,0.5)]"
            }`}>
            {running ? <><Pause className="h-6 w-6" /></> : <><Play className="h-6 w-6" /></>}
          </button>
          
          <button onClick={() => { setSec(0); setTotalSec(0); setRunning(false); }}
            className="group flex flex-1 max-w-[120px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-4 md:py-5 text-sm md:text-base font-bold text-slate-400 transition-all hover:border-rose-500/30 hover:bg-rose-500/20 hover:text-rose-300 active:scale-[0.98]">
            <RotateCcw className="h-5 w-5 opacity-80 group-hover:opacity-100 transition-opacity" />
          </button>
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
                className="chip rounded-lg px-4 py-2 text-sm hover:bg-white/20">抽一題</button>
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
