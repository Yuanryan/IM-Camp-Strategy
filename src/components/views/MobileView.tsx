"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher, useSnapshot, TeamSelect, ActionButton, postJson } from "@/components/client";
import { Card, StickyTeam } from "@/components/Shell";
import { Num, EventBanner, HudTabs, TeamItemBadges, MonopolyBadges } from "@/components/ui";
import { QuestionBank, QuestionFilters, deriveFilters, type QData } from "@/components/QuestionBank";
import { useGameTimer, FloatingTimer } from "@/components/GameTimer";
import {
  MOBILE_GAMES, type MobileGame, type MobileDifficulty, type RewardKind,
  computeMobileReward, MOBILE_REWARD_RATES,
} from "@/lib/game";
import { Gamepad2, BookOpen, Play, RotateCcw, Swords, Users, Handshake, Clock, Trophy, Gift, Coins, Ticket, Dices, Plus, Minus, Flag } from "lucide-react";

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
              relevantTypes={[]}
            />
            <MonopolyBadges
              regions={snap.teams.find((t) => t.id === team)?.monopolyRegions ?? []}
              effects={["COIN_1_5X"]}
              settings={snap.settings}
            />
          </StickyTeam>
          <Games teams={snap.teams} team={team} mutate={mutate} />
        </>
      ) : (
        <QuestionManager />
      )}
    </div>
  );
}


// 對抗形式 → 徽章樣式 / 圖示 / 文案
const VERSUS_META: Record<MobileGame["versus"], { label: string; icon: React.ReactNode; cls: string }> = {
  "team-vs-host": { label: "小隊 vs 關主", icon: <Swords className="h-3.5 w-3.5" />, cls: "border-amber-400/40 bg-amber-500/15 text-amber-300" },
  "team-vs-team": { label: "小隊對抗", icon: <Users className="h-3.5 w-3.5" />, cls: "border-violet-400/40 bg-violet-500/15 text-violet-300" },
  "coop": { label: "全隊合作", icon: <Handshake className="h-3.5 w-3.5" />, cls: "border-emerald-400/40 bg-emerald-500/15 text-emerald-300" },
};

type Done = () => void | Promise<unknown>;
type TeamLite = { id: number; name: string };

// 遊戲選單分組順序（依對抗形式；標題用 VERSUS_META 的圖示 / 文案 / 配色）
const GAME_GROUP_ORDER: MobileGame["versus"][] = ["coop", "team-vs-team", "team-vs-host"];

// 流動關卡：選遊戲 → 看規則 →（有題庫者）抽題 → 表現制發獎
function Games({ teams, team, mutate }: { teams: TeamLite[]; team: number | ""; mutate: Done }) {
  const [name, setName] = useState<string>(MOBILE_GAMES[0]?.name ?? "");
  const game = MOBILE_GAMES.find((g) => g.name === name) ?? MOBILE_GAMES[0];

  return (
    <Card title={<div className="flex items-center gap-2"><Gamepad2 className="h-5 w-5 text-cyan-400" /> 流動關卡</div>}>
      {/* 依對抗形式分組：每組一個彩色小標題 + 換行排列的遊戲 chip（不再橫向捲動） */}
      <div className="mb-4 space-y-3">
        {GAME_GROUP_ORDER.map((versus) => {
          const groupGames = MOBILE_GAMES.filter((g) => g.versus === versus);
          if (groupGames.length === 0) return null;
          const meta = VERSUS_META[versus];
          return (
            <div key={versus}>
              <div className={`mb-1.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.cls}`}>
                {meta.icon}{meta.label}
              </div>
              <div className="flex flex-wrap gap-2">
                {groupGames.map((g) => (
                  <button key={g.name} onClick={() => setName(g.name)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition ${name === g.name ? "bg-cyan-500 text-slate-950" : "chip"}`}>
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* key={game.name}：切換遊戲時重置答對數 / 難度 / 幣別等所有關卡狀態 */}
      {game && <GameSession key={game.name} game={game} teams={teams} team={team} mutate={mutate} />}
    </Card>
  );
}

type Phase = "brief" | "play" | "settle";

// 單一關卡：說明 → 進行中 → 計分 三階段。計時器與答對數綁在關卡生命週期內。
function GameSession({ game, teams, team, mutate }: { game: MobileGame; teams: TeamLite[]; team: number | ""; mutate: Done }) {
  const [phase, setPhase] = useState<Phase>("brief");
  const [count, setCount] = useState(0);
  const [expanded, setExpanded] = useState(false); // 進行中：把角落膠囊展開成大圓環
  // 題庫篩選（說明階段選好，帶入進行中）；題目本身在進行中才抽 / 顯示
  const [type, setType] = useState("");
  const [level, setLevel] = useState("");
  // 時間到 → 自動進入計分（在計時器事件回呼中觸發，非 effect 同步 setState）
  const timer = useGameTimer(game.seconds ?? 0, () => setPhase("settle"));

  const toPlay = () => { timer.start(); setPhase("play"); };
  const toSettle = () => { timer.pause(); setPhase("settle"); };
  const replay = () => { setCount(0); setExpanded(false); timer.setTime(game.seconds ?? 0); setPhase("brief"); };

  // ── 說明：規則 + 題型選擇（不抽題）+ 浮動計時器（可預先設定）+ 開始 ──
  if (phase === "brief") {
    return (
      <div className="space-y-4">
        <GameRules game={game} />
        {game.hasBank && (
          <BriefFilters game={game.name} type={type} level={level} onType={setType} onLevel={setLevel} />
        )}
        <button onClick={toPlay}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/50 bg-cyan-500/20 py-4 text-lg font-bold tracking-widest text-cyan-300 transition hover:bg-cyan-500/30 active:scale-[0.99]">
          <Play className="h-5 w-5" /> 開始遊戲
        </button>
        <FloatingTimer timer={timer} expanded={expanded} setExpanded={setExpanded} />
      </div>
    );
  }

  // ── 計分：表現制 / 勝負發獎（無題庫、無計時器）──
  if (phase === "settle") {
    return (
      <div className="space-y-4">
        <SettleHeader game={game} count={count} />
        <RewardCalculator game={game} teams={teams} team={team} count={count} setCount={setCount} mutate={mutate} onDoneReplay={replay} />
        <button onClick={replay} className="chip w-full py-2.5 text-sm hover:bg-white/15">
          <RotateCcw className="mr-1.5 inline h-4 w-4" /> 重新開始
        </button>
      </div>
    );
  }

  // ── 進行中：抽題（用說明選好的題型）+ 答對計數 + 浮動計時器（時間到自動計分）──
  return (
    <div className="space-y-4">
      {/* 進行中精簡列：對抗徽章 + 即時答對數 */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-3">
        <span className="text-sm font-semibold text-cyan-200">{game.name}・進行中</span>
        {game.rewardConfig.mode === "per-question" && (
          <span className="text-sm text-slate-300">答對 <Num className="text-xl font-black text-emerald-300">{count}</Num> 題</span>
        )}
      </div>

      {game.hasBank && (
        <QuestionBank
          game={game.name}
          onCorrect={game.rewardConfig.mode === "per-question" ? () => setCount((c) => c + 1) : undefined}
          showFilters={false} type={type} level={level} onType={setType} onLevel={setLevel}
        />
      )}
      {!game.hasBank && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          <p className="mb-1 font-medium text-slate-100">{game.rule}</p>
          {game.note && <p className="text-xs leading-relaxed text-slate-400">{game.note}</p>}
        </div>
      )}

      <button onClick={toSettle}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/50 bg-amber-500/20 py-4 text-lg font-bold tracking-widest text-amber-300 transition hover:bg-amber-500/30 active:scale-[0.99]">
        <Flag className="h-5 w-5" /> 結束・計分
      </button>

      <FloatingTimer timer={timer} expanded={expanded} setExpanded={setExpanded} />
    </div>
  );
}

// 說明階段的題型選擇：抓題庫只為列出「實際存在的難度 / 類型」chips，不顯示任何題目。
function BriefFilters({
  game, type, level, onType, onLevel,
}: {
  game: string; type: string; level: string; onType: (v: string) => void; onLevel: (v: string) => void;
}) {
  const { data } = useSWR<QData>("/api/questions", fetcher);
  if (!data) return <p className="text-sm text-slate-400">載入題型…</p>;
  const { levels, types } = deriveFilters(data.questions, game);
  if (levels.length === 0 && types.length === 0) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="mb-2 text-xs font-semibold text-slate-400">選擇題型</div>
      <QuestionFilters levels={levels} types={types} level={level} type={type} onLevel={onLevel} onType={onType} />
    </div>
  );
}

// 計分頁首：提示本關成績
function SettleHeader({ game, count }: { game: MobileGame; count: number }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
      <span className="text-sm font-semibold text-slate-200">{game.name}・計分</span>
      {game.rewardConfig.mode === "per-question" && <span className="text-sm text-slate-400">本關答對 <span className="font-black text-emerald-300">{count}</span> 題</span>}
    </div>
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
            <span><span className="text-slate-400">額外獎勵：</span><span className="font-medium text-emerald-200">{game.reward}</span></span>
          </div>
        )}
        {game.note && <p className="pt-1 text-xs leading-relaxed text-slate-400">{game.note}</p>}
      </div>
    </div>
  );
}

// 骰子提示（實體發放，不寫 DB）：顯示「發 N 顆骰子」
function DiceHint({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-400/40 bg-purple-500/15 px-3 py-1 text-sm font-bold text-purple-200">
      <Dices className="h-4 w-4" /> 發 {n} 顆骰子
    </span>
  );
}

// 表現制發獎：依答對題數 × 難度算光幣 / 點數（擇一），骰子為實體提示。
// win-lose 模式：team-vs-host（憤怒企業）單隊勝 / 敗；team-vs-team（海帶拳 / 口型 / 跳跳Tempo）選勝方 / 敗方一次發雙方。
function RewardCalculator({
  game, teams, team, count, setCount, mutate, onDoneReplay,
}: {
  game: MobileGame; teams: TeamLite[]; team: number | ""; count: number; setCount: (n: number) => void; mutate: Done;
  onDoneReplay?: () => void; // 發放成功後回到「說明」階段（重置該關）
}) {
  const cfg = game.rewardConfig;
  const [diff, setDiff] = useState<MobileDifficulty>(
    cfg.mode === "per-question" ? cfg.difficulties[0] : "中等",
  );
  const [kind, setKind] = useState<RewardKind>("coins");

  // 共用送出：發光幣或點數，note 帶遊戲 / 難度 / 題數，成功後回到說明階段
  const give = async (coins: number, cardPoints: number, note: string, diceForNote: number) => {
    if (team === "") return "請先選小隊";
    if (coins === 0 && cardPoints === 0) return "獎勵為 0，無需發放";
    const r = await postJson("/api/mobile/reward", { teamId: team, coins, cardPoints, note });
    await mutate();
    const diceMsg = diceForNote > 0 ? `，另發 ${diceForNote} 顆骰子（實體）` : "";
    const dblMsg = r.doubled !== null && r.doubled !== undefined ? `（${r.doubled ? "雙倍！" : "歸零…"}）` : "";
    onDoneReplay?.();
    return { message: `${note}${dblMsg}${diceMsg}`, undo: r.undo };
  };

  // ── 勝 / 敗模式 ──
  if (cfg.mode === "win-lose") {
    // 小隊對抗：選勝方 / 敗方，一次發雙方
    if (game.versus === "team-vs-team") {
      return <WinLoseVersus game={game} cfg={cfg} teams={teams} defaultWinner={team} mutate={mutate} onDoneReplay={onDoneReplay} />;
    }
    // vs 關主：單隊勝 / 敗
    return (
      <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-cyan-200">發放獎勵</span>
          {team === "" && <span className="text-xs text-amber-300/80">⚠ 請先選小隊</span>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ActionButton
            label={<span className="flex items-center justify-center gap-1.5"><Trophy className="h-4 w-4" />勝　+{cfg.winCoins} 光幣{cfg.winDice > 0 ? ` ＋${cfg.winDice} 骰` : ""}</span>}
            className="btn-emerald"
            disabled={team === ""}
            onAction={() => give(cfg.winCoins, 0, `${game.name}（勝）+${cfg.winCoins} 光幣`, cfg.winDice)}
          />
          <ActionButton
            label={<span className="flex items-center justify-center gap-1.5">敗　+{cfg.loseCoins} 光幣</span>}
            className="chip"
            disabled={team === ""}
            onAction={() => give(cfg.loseCoins, 0, `${game.name}（敗）+${cfg.loseCoins} 光幣`, 0)}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">骰子為實體發放，請隊輔發給小隊。</p>
      </div>
    );
  }

  // ── 表現制（per-question）模式 ──
  const { amount, dice } = computeMobileReward(diff, count, kind);
  const rate = MOBILE_REWARD_RATES[diff];
  const perQ = kind === "coins" ? rate.coinsPerQ : rate.pointsPerQ;
  const unit = kind === "coins" ? "光幣" : "點數";

  return (
    <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-cyan-200">發放獎勵</span>
        {team === "" && <span className="text-xs text-amber-300/80">⚠ 請先選小隊</span>}
      </div>

      {/* 難度（單一難度時不顯示） */}
      {cfg.difficulties.length > 1 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-500">難度</span>
          {cfg.difficulties.map((d) => (
            <button key={d} onClick={() => setDiff(d)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${diff === d ? "bg-cyan-500 text-slate-950" : "chip"}`}>
              {d}
            </button>
          ))}
          <span className="ml-1 text-[11px] text-slate-500">每題 {rate.coinsPerQ} 光幣 / {rate.pointsPerQ} 點・每 10 題 {rate.dicePer10} 骰</span>
        </div>
      )}

      {/* 答對題數 stepper（與題庫「✓ 答對」共用） */}
      <div className="mb-3 flex items-center gap-3">
        <span className="text-xs text-slate-500">答對題數</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setCount(Math.max(0, count - 1))}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-200 hover:bg-white/15 active:scale-95">
            <Minus className="h-4 w-4" />
          </button>
          <Num className="w-12 text-center text-2xl font-black tabular-nums text-cyan-300">{count}</Num>
          <button onClick={() => setCount(count + 1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-200 hover:bg-white/15 active:scale-95">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {count > 0 && (
          <button onClick={() => setCount(0)} className="text-xs text-slate-500 underline hover:text-slate-300">歸零</button>
        )}
      </div>

      {/* 幣別切換（擇一） */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        <button onClick={() => setKind("coins")}
          className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
            kind === "coins" ? "border-amber-400/50 bg-amber-500/20 text-amber-200" : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
          }`}>
          <Coins className="h-4 w-4" /> 光幣
        </button>
        <button onClick={() => setKind("cardPoints")}
          className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
            kind === "cardPoints" ? "border-violet-400/50 bg-violet-500/20 text-violet-200" : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
          }`}>
          <Ticket className="h-4 w-4" /> 卡牌點數
        </button>
      </div>

      {/* 即時試算 */}
      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-slate-950/40 p-3">
        <div className="text-sm text-slate-400">
          {count} 題 × {perQ} = <Num className="text-2xl font-black text-cyan-300">{amount}</Num> <span className="text-slate-300">{unit}</span>
        </div>
        <DiceHint n={dice} />
      </div>

      <ActionButton
        label={`發放 ${amount} ${unit}`}
        className="w-full btn-emerald"
        disabled={team === "" || amount === 0}
        onAction={() => {
          const coins = kind === "coins" ? amount : 0;
          const pts = kind === "cardPoints" ? amount : 0;
          return give(coins, pts, `${game.name}・${diff} 答對 ${count} 題 +${amount} ${unit}`, dice);
        }}
      />
    </div>
  );
}

type WinLoseCfg = Extract<MobileGame["rewardConfig"], { mode: "win-lose" }>;

// 小隊對抗結算：選勝方 / 敗方，一鍵發雙方獎勵（合併 undo，一次撤銷可還原兩隊）。
function WinLoseVersus({
  game, cfg, teams, defaultWinner, mutate, onDoneReplay,
}: {
  game: MobileGame; cfg: WinLoseCfg; teams: TeamLite[];
  defaultWinner: number | ""; mutate: Done; onDoneReplay?: () => void;
}) {
  const [winner, setWinner] = useState<number | "">(defaultWinner);
  const [loser, setLoser] = useState<number | "">("");
  const nameOf = (id: number | "") => teams.find((t) => t.id === id)?.name ?? "";

  const settle = async () => {
    if (winner === "" || loser === "") return "請選擇勝方與敗方";
    if (winner === loser) return "勝方與敗方不能是同一隊";
    // 兩筆發放分開送（後端各自處理動產效果 / undo），再把 ledgerIds 合併成單一 undo
    const rw = await postJson("/api/mobile/reward", {
      teamId: winner, coins: cfg.winCoins, cardPoints: 0,
      note: `${game.name}（勝）+${cfg.winCoins} 光幣`,
    });
    const rl = await postJson("/api/mobile/reward", {
      teamId: loser, coins: cfg.loseCoins, cardPoints: 0,
      note: `${game.name}（敗）+${cfg.loseCoins} 光幣`,
    });
    await mutate();
    const ledgerIds = [...(rw.undo?.ledgerIds ?? []), ...(rl.undo?.ledgerIds ?? [])];
    const undo = ledgerIds.length ? { label: `${game.name} 勝負發獎`, ledgerIds } : undefined;
    const diceMsg = cfg.winDice > 0 ? `，勝方另發 ${cfg.winDice} 顆骰子（實體）` : "";
    onDoneReplay?.();
    return {
      message: `${nameOf(winner)} +${cfg.winCoins}（勝）／${nameOf(loser)} +${cfg.loseCoins}（敗）${diceMsg}`,
      undo,
    };
  };

  return (
    <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4">
      <div className="mb-3 text-sm font-semibold text-cyan-200">發放獎勵</div>
      <div className="space-y-2">
        <label className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-2.5">
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-300">勝方</span>
          <TeamSelect teams={teams} value={winner} onChange={setWinner} placeholder="選擇勝方" />
          <span className="ml-auto text-sm font-semibold text-emerald-200">+{cfg.winCoins} 光幣{cfg.winDice > 0 ? ` ＋${cfg.winDice} 骰子` : ""}</span>
        </label>
        <label className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-2.5">
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-300">敗方</span>
          <TeamSelect teams={teams} value={loser} onChange={setLoser} placeholder="選擇敗方" />
          <span className="ml-auto text-sm font-semibold text-slate-300">+{cfg.loseCoins} 光幣</span>
        </label>
      </div>

      <div className="mt-3">
        <ActionButton
          label="發放雙方獎勵"
          className="w-full btn-emerald"
          disabled={winner === "" || loser === "" || winner === loser}
          onAction={settle}
        />
      </div>
      <p className="mt-2 text-xs text-slate-500">骰子為實體發放，請隊輔發給勝方小隊。</p>
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
