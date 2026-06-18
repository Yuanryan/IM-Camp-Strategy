"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { fetcher, useSnapshot, TeamSelect, ActionButton } from "@/components/client";
import { RewardButtons, CustomGive } from "@/components/RewardPanel";
import { Card, StickyTeam } from "@/components/Shell";
import { Num, EventBanner, HudTabs, TeamItemBadges } from "@/components/ui";
import { QuestionBank, type QData } from "@/components/QuestionBank";
import { MOBILE_REWARD_PRESETS, MOBILE_GAMES, type MobileGame, EffectType } from "@/lib/game";
import { Gamepad2, BookOpen, Timer as TimerIcon, Pause, Play, RotateCcw, Swords, Users, Handshake, Clock, Trophy, Gift } from "lucide-react";

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
          ["ops", "關主操作", <Gamepad2 key="ops" className="h-4 w-4" />],
          ["bank", "題庫管理", <BookOpen key="bank" className="h-4 w-4" />],
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
          <Games />
          <Timer />

          <Card title="發放獎勵（光幣 / 卡牌點數）">
            <RewardButtons teamId={team} presets={MOBILE_REWARD_PRESETS} onDone={mutate} endpoint="/api/mobile/reward" />
            <div className="mt-3 border-t border-white/10 pt-3">
              <CustomGive teamId={team} onDone={mutate} endpoint="/api/mobile/reward" />
            </div>
            <p className="mt-2 text-xs text-slate-500">骰子、情報牌、特殊骰、功能卡兌換券為實體發放，請隊輔記錄，不在系統登記。</p>
          </Card>
        </>
      ) : (
        <QuestionManager />
      )}
    </div>
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

  const setTime = (newSec: number) => {
    const v = Math.max(0, Math.min(99 * 60 + 59, Math.floor(newSec)));
    setSec(v);
    setTotalSec(v);
  };
  const adjustTime = (amount: number) => setTime(sec + amount);
  // 暫停時可直接輸入：分 / 秒各一格，立即套用到 sec 與 totalSec（圓環滿格基準）
  const editMin = (m: number) => setTime((Number.isFinite(m) ? Math.max(0, m) : 0) * 60 + (sec % 60));
  const editSec = (s: number) => setTime(Math.floor(sec / 60) * 60 + (Number.isFinite(s) ? Math.min(59, Math.max(0, s)) : 0));

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
              {running ? (
                <Num className={`text-6xl md:text-7xl font-black font-mono tracking-widest ${
                  isDanger ? "text-rose-500 drop-shadow-[0_0_15px_rgba(225,29,72,0.8)] animate-pulse" :
                  "text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]"
                }`}>
                  {mm}:{ss}
                </Num>
              ) : (
                // 暫停時：分 / 秒可直接輸入
                <div className="flex items-center justify-center py-2 leading-none text-6xl md:text-7xl font-black font-mono tracking-widest text-slate-200">
                  <TimeField value={Math.floor(sec / 60)} max={99} align="right" label="分鐘" onCommit={editMin} />
                  <span className="px-0.5">:</span>
                  <TimeField value={sec % 60} max={59} align="left" label="秒數" onCommit={editSec} />
                </div>
              )}
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

// 計時器暫停時的「分 / 秒」輸入格：本地 draft 讓你能清空並連打兩位數，
// 失焦時再對齊回標準值；外部（±按鈕）改值時也會同步。
function TimeField({ value, max, align, label, onCommit }: {
  value: number; max: number; align: "left" | "right"; label: string; onCommit: (n: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  // 編輯中顯示原始 draft（不補零、不設 maxLength → 鍵入時 onChange 才能取最後兩位覆蓋）；
  // 失焦時補零成兩位數（如 00、05）
  const shown = draft !== null ? draft : String(value).padStart(2, "0");
  return (
    <input
      type="text" inputMode="numeric" pattern="[0-9]*" aria-label={label}
      value={shown}
      onFocus={() => setDraft("")}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "").slice(-2);
        setDraft(digits);
        onCommit(Math.min(max, digits === "" ? 0 : parseInt(digits, 10)));
      }}
      onBlur={() => setDraft(null)}
      className={`w-[2.2ch] bg-transparent leading-none outline-none focus:text-cyan-300 ${align === "right" ? "text-right" : "text-left"}`}
    />
  );
}

// 對抗形式 → 徽章樣式 / 圖示 / 文案
const VERSUS_META: Record<MobileGame["versus"], { label: string; icon: React.ReactNode; cls: string }> = {
  "team-vs-host": { label: "小隊 vs 關主", icon: <Swords className="h-3.5 w-3.5" />, cls: "border-amber-400/40 bg-amber-500/15 text-amber-300" },
  "team-vs-team": { label: "小隊對抗", icon: <Users className="h-3.5 w-3.5" />, cls: "border-violet-400/40 bg-violet-500/15 text-violet-300" },
  "coop": { label: "全隊合作", icon: <Handshake className="h-3.5 w-3.5" />, cls: "border-emerald-400/40 bg-emerald-500/15 text-emerald-300" },
};

// 流動關卡：選遊戲 → 看規則 →（有題庫者）抽題
function Games() {
  const [name, setName] = useState<string>(MOBILE_GAMES[0]?.name ?? "");
  const game = MOBILE_GAMES.find((g) => g.name === name) ?? MOBILE_GAMES[0];

  return (
    <Card title={<div className="flex items-center gap-2"><Gamepad2 className="h-5 w-5 text-cyan-400" /> 流動關卡</div>}>
      <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 py-1.5">
        {MOBILE_GAMES.map((g) => (
          <button key={g.name} onClick={() => setName(g.name)}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition ${name === g.name ? "bg-cyan-500 text-slate-950" : "chip"}`}>
            {g.name}
          </button>
        ))}
      </div>

      {game && <GameRules game={game} />}
      {game?.hasBank && <div className="mt-4"><QuestionBank key={game.name} game={game.name} /></div>}
    </Card>
  );
}

// 規則卡：對抗徽章 + 時間 / 過關 / 獎勵 / 補充
function GameRules({ game }: { game: MobileGame }) {
  const v = VERSUS_META[game.versus];
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${v.cls}`}>
          {v.icon}{v.label}
        </span>
        {game.time && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">
            <Clock className="h-3.5 w-3.5" />{game.time}
          </span>
        )}
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-start gap-2">
          <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <span><span className="text-slate-400">過關 / 勝負：</span><span className="font-medium text-slate-100">{game.rule}</span></span>
        </div>
        {game.reward && (
          <div className="flex items-start gap-2">
            <Gift className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <span><span className="text-slate-400">獎勵：</span><span className="font-medium text-emerald-200">{game.reward}</span></span>
          </div>
        )}
        {game.note && <p className="pt-1 text-xs leading-relaxed text-slate-400">{game.note}</p>}
      </div>
    </div>
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
  const [options, setOptions] = useState("");

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
      <label className="text-xs text-slate-400 sm:col-span-2">
        <div className="mb-1">三選一干擾項（冷知識用，可空白；用 | 分隔兩個錯誤選項）</div>
        <input value={options} onChange={(e) => setOptions(e.target.value)} placeholder="例如：食指|無名指" className="fld w-full" />
      </label>
      <div className="sm:col-span-2">
        <ActionButton label="新增題目" disabled={!gameName.trim() || !prompt.trim()}
          onAction={async () => {
            if (!gameName.trim() || !prompt.trim()) return "需填遊戲名稱與題目";
            await sendQuestion("POST", { gameName: gameName.trim(), prompt: prompt.trim(), answer, difficulty, options });
            setPrompt(""); setAnswer(""); setOptions("");
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
  const [options, setOptions] = useState(q.options ?? "");

  const reset = () => {
    setGameName(q.gameName);
    setPrompt(q.prompt);
    setAnswer(q.answer ?? "");
    setDifficulty(q.difficulty ?? "");
    setOptions(q.options ?? "");
  };

  // 檢視模式：唯讀，按「編輯」才展開
  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition-all hover:bg-white/10">
        <div className="min-w-0">
          <p className="break-words text-sm text-slate-100">{q.prompt}</p>
          {(q.answer || q.difficulty || q.options) && (
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
              {q.answer && <span>答案：<span className="text-emerald-300">{q.answer}</span></span>}
              {q.difficulty && <span>難度：{q.difficulty}</span>}
              {q.options && <span>干擾項：{q.options.split("|").join("、")}</span>}
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
      <input value={options} onChange={(e) => setOptions(e.target.value)} placeholder="三選一干擾項（冷知識用，| 分隔，例如：食指|無名指）" className="fld mt-2 w-full" />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <ActionButton label="儲存"
          onAction={async () => {
            if (!prompt.trim()) return "題目不可空白";
            await sendQuestion("PATCH", { id: q.id, gameName, prompt: prompt.trim(), answer, difficulty, options });
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
