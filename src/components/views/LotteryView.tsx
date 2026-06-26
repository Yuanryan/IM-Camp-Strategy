"use client";

import { useState, useEffect, useRef } from "react";
import { useSnapshot, postJson, TeamSelect, toast, confirmDialog } from "@/components/client";
import { Card, StickyTeam } from "@/components/Shell";
import { Num, TeamItemBadges, TurnCompleteBar } from "@/components/ui";
import { lotteryFee, EffectType } from "@/lib/game";

type DrawResult = { number: number; winnerName: string | null; finalPool: number };

export function LotteryView({
  team: teamProp,
  setTeam: setTeamProp,
  turnMode = false,
  onComplete,
}: {
  team?: number | "";
  setTeam?: (id: number | "") => void;
  // 由地圖回合操作開啟時為 true：顯示「完成」鈕，累計本回合登記費用（負值）並回報。
  turnMode?: boolean;
  onComplete?: (delta: number) => void;
} = {}) {
  const { snap, mutate } = useSnapshot(2500);
  // 受控（由 MapView 共用 team）或自管（/lottery 獨立頁）
  const [teamInner, setTeamInner] = useState<number | "">("");
  const team = teamProp ?? teamInner;
  const setTeam = setTeamProp ?? setTeamInner;
  const [pending, setPending] = useState<number | null>(null);
  // 本回合累計金流（登記號碼的費用總和，為負）；按「完成」時回報給地圖階段 2。
  const [turnDelta, setTurnDelta] = useState(0);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [highlight, setHighlight] = useState<number | null>(null);

  // 開獎動畫：rolling=快速翻號中；revealed=定號 + 結果
  const [draw, setDraw] = useState<{
    phase: "rolling" | "revealed";
    rollNum: number;
    result: DrawResult | null;
  } | null>(null);
  const rollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // rolling 階段：每 70ms 翻一個隨機號碼，定號後清除
  useEffect(() => {
    if (draw?.phase === "rolling") {
      rollTimer.current = setInterval(() => {
        setDraw((d) => (d ? { ...d, rollNum: Math.floor(Math.random() * 50) + 1 } : d));
      }, 70);
      return () => {
        if (rollTimer.current) clearInterval(rollTimer.current);
      };
    }
  }, [draw?.phase]);

  const runDraw = async () => {
    if (draw) return;
    if (!(await confirmDialog("確定開獎？"))) return;
    setDraw({ phase: "rolling", rollNum: Math.floor(Math.random() * 50) + 1, result: null });
    try {
      const r = await postJson("/api/lottery/draw", {});
      const winnerName = r.winnerTeamId
        ? snap?.teams.find((t) => t.id === r.winnerTeamId)?.name ?? "得獎隊伍"
        : null;
      const res: DrawResult = { number: r.number, winnerName, finalPool: r.finalPool };
      // 讓滾動至少跑滿 ~2.1s 的戲劇張力，再定號
      window.setTimeout(() => {
        setDraw({ phase: "revealed", rollNum: res.number, result: res });
        mutate();
      }, 2100);
    } catch (e) {
      if (rollTimer.current) clearInterval(rollTimer.current);
      setDraw(null);
      toast(e instanceof Error ? e.message : "開獎失敗", "err");
    }
  };

  if (!snap) return <p className="text-sm text-slate-400">載入中…</p>;
  const taken = new Map(snap.lottery.numbers.map((n) => [n.number, n.teamName]));
  const ownerMap = new Map(snap.lottery.numbers.map((n) => [n.number, n.teamId]));
  const mine = new Set(team === "" ? [] : snap.lottery.numbers.filter((n) => n.teamId === team).map((n) => n.number));
  const myCount = mine.size;
  const nextFee = lotteryFee(myCount);

  const register = async (number: number) => {
    if (team === "" || pending !== null) return;
    setPending(number);
    try {
      const r = await postJson("/api/lottery/register", { teamId: team, number });
      await mutate();
      // 回合操作：登記費用是支出 → 累計為負值，待「完成」時併入地圖階段 2。
      if (turnMode) setTurnDelta((d) => d - (r.fee ?? 0));
      const msg = `已登記 ${number} 號（費用 ${r.fee}）`;
      setResult({ ok: true, msg });
      toast(msg, "ok", r.undo);
    } catch (e) {
      const m = e instanceof Error ? e.message : "登記失敗";
      setResult({ ok: false, msg: `${number} 號：${m}` });
      toast(m, "err");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats + draw in one hero strip */}
      <div className="overflow-hidden rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-400/8 to-transparent">
        <div className="h-0.5 w-full bg-gradient-to-r from-emerald-400/80 via-emerald-300/40 to-transparent" />
        <div className="flex items-center gap-0 divide-x divide-white/8">
          <div className="flex-1 px-4 py-4 text-center">
            <div className="mb-0.5 text-[10px] uppercase tracking-widest text-slate-500">本期</div>
            <Num className="text-2xl font-black text-slate-100">第 {snap.lottery.period} 期</Num>
          </div>
          <div className="flex-1 px-4 py-4 text-center">
            <div className="mb-0.5 text-[10px] uppercase tracking-widest text-slate-500">獎金池</div>
            <Num className="neon-emerald text-2xl font-black">{snap.lottery.pool}</Num>
          </div>
          <div className="px-4 py-4">
            <button
              onClick={runDraw}
              disabled={!!draw}
              className="btn-rose rounded-xl px-5 py-3 text-base font-black transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {draw ? "開獎中…" : "開獎"}
            </button>
          </div>
        </div>
      </div>

      <StickyTeam>
        <div className="flex flex-wrap items-center gap-3">
          <TeamSelect teams={snap.teams} value={team} onChange={setTeam} />
          {team !== "" ? (
            <span className="text-sm text-slate-400">
              已持 <Num className="font-bold text-slate-200">{myCount}</Num> 個・下個費用{" "}
              <Num className="neon-gold font-bold">{nextFee}</Num>・光幣{" "}
              <Num className="neon-gold font-bold">{snap.teams.find((t) => t.id === team)?.coins}</Num>
            </span>
          ) : (
            <span className="text-xs text-amber-300/80">⚠ 請先選擇登記小隊</span>
          )}
        </div>
        <TeamItemBadges
          items={team === "" ? [] : snap.teams.find((t) => t.id === team)?.items ?? []}
          relevantTypes={[EffectType.LOTTERY_BONUS, EffectType.JACKPOT_SHARE, EffectType.LOTTERY_INSURANCE]}
        />
      </StickyTeam>

      <Card title="登記號碼">
        {result && (
          <div className={`mb-3 rounded-lg px-3 py-2 text-sm font-medium ring-1 ${
            result.ok
              ? "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30"
              : "bg-rose-500/15 text-rose-200 ring-rose-400/30"
          }`}>
            {result.ok ? "✓ " : "✕ "}{result.msg}
          </div>
        )}
        <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
          {Array.from({ length: 50 }, (_, i) => i + 1).map((n) => {
            const owner = taken.get(n);
            const busy = pending === n;
            return (
              <button key={n}
                disabled={busy || (!owner && (team === "" || pending !== null))}
                onClick={() => {
                  if (owner) {
                    const id = ownerMap.get(n) ?? null;
                    setHighlight(id);
                    if (id != null) document.getElementById(`lt-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                  } else {
                    register(n);
                  }
                }}
                title={owner ?? ""}
                className={`num rounded-md py-2 text-sm font-bold transition active:scale-95 ${
                  busy ? "animate-pulse bg-sky-500 text-white ring-2 ring-sky-300"
                    : mine.has(n) ? "bg-amber-400/25 text-amber-200 ring-1 ring-amber-300/40 hover:ring-amber-300/70"
                    : owner ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30 hover:ring-emerald-400/70"
                    : team === "" ? "bg-white/5 text-slate-600"
                    : "bg-white/10 text-slate-200 hover:bg-sky-500 hover:text-white disabled:opacity-50"
                }`}>
                {busy ? "…" : n}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-slate-500">金色＝你的號碼，綠色＝他隊已登記。每隊第一個號碼免費，之後每個號碼指數成長。每次登記獎金池增加加購費用的兩倍。</p>

        {snap.lottery.numbers.length > 0 && (
          <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
            <div className="text-xs font-semibold text-slate-400">各隊持有號碼</div>
            {snap.teams
              .map((t) => ({
                team: t,
                nums: snap.lottery.numbers
                  .filter((n) => n.teamId === t.id)
                  .sort((a, b) => a.number - b.number),
              }))
              .filter((row) => row.nums.length > 0)
              .map(({ team: t, nums }) => (
                <div key={t.id} id={`lt-${t.id}`}
                  className={`flex flex-wrap items-center gap-1.5 rounded-lg px-2 py-1 transition-all ${
                    highlight === t.id ? "bg-cyan-400/10 ring-1 ring-cyan-400/50 shadow-[0_0_18px_rgba(34,211,238,0.3)]" : ""
                  }`}>
                  <span className="text-sm font-medium text-slate-200">{t.name}</span>
                  <span className="text-xs text-slate-500">（{nums.length}）</span>
                  <span className="flex flex-wrap gap-1">
                    {nums.map((x) => (
                      <span key={x.id} className="num rounded bg-white/10 px-1.5 py-0.5 text-xs font-bold text-slate-200 ring-1 ring-white/10">
                        {x.number}
                      </span>
                    ))}
                  </span>
                </div>
              ))}
          </div>
        )}
      </Card>

      {draw && (
        <DrawReveal
          draw={draw}
          onClose={() => setDraw(null)}
        />
      )}

      {turnMode && onComplete && <TurnCompleteBar delta={turnDelta} onComplete={onComplete} />}
    </div>
  );
}

// ── 開獎動畫覆蓋層 ──────────────────────────────────────────────
function DrawReveal({
  draw,
  onClose,
}: {
  draw: { phase: "rolling" | "revealed"; rollNum: number; result: DrawResult | null };
  onClose: () => void;
}) {
  const revealed = draw.phase === "revealed";
  const res = draw.result;
  const isWin = !!res?.winnerName;

  return (
    <div
      onClick={revealed ? onClose : undefined}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-sm"
      style={{ animation: "appFadeIn 0.2s ease-out both" }}
    >
      <div className="mb-6 text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300/80">
        {revealed ? "開獎結果" : "開獎中…"}
      </div>

      {/* 開獎球 */}
      <div
        key={revealed ? "land" : "roll"}
        className={`flex h-40 w-40 items-center justify-center rounded-full ${
          revealed ? "draw-land" : "draw-roll"
        }`}
        style={{
          background: revealed
            ? "radial-gradient(circle at 35% 30%, rgba(52,211,153,0.45) 0%, rgba(16,185,129,0.12) 100%)"
            : "radial-gradient(circle at 35% 30%, rgba(34,211,238,0.4) 0%, rgba(6,182,212,0.1) 100%)",
          border: revealed ? "3px solid rgba(52,211,153,0.7)" : "3px solid rgba(34,211,238,0.55)",
          boxShadow: revealed
            ? "0 0 50px rgba(52,211,153,0.55), inset 0 2px 0 rgba(255,255,255,0.18)"
            : "0 0 32px rgba(34,211,238,0.4), inset 0 2px 0 rgba(255,255,255,0.14)",
        }}
      >
        <Num
          className={`text-7xl font-black ${revealed ? "neon-emerald" : "text-cyan-200"}`}
        >
          {draw.rollNum}
        </Num>
      </div>

      {/* 結果文字 */}
      {revealed && res && (
        <div className="draw-result-in mt-8 flex flex-col items-center gap-2 px-6 text-center">
          {isWin ? (
            <>
              <div className="text-2xl font-black text-emerald-200">
                🎉 {res.winnerName} 中獎！
              </div>
              <div className="text-sm text-slate-300">
                獲得獎金{" "}
                <Num className="neon-gold text-lg font-black">{res.finalPool}</Num> 光幣
              </div>
            </>
          ) : (
            <>
              <div className="text-2xl font-black text-rose-200">無人中獎</div>
              <div className="text-sm text-slate-300">
                獎金池累積至{" "}
                <Num className="neon-emerald text-lg font-black">{res.finalPool}</Num> 光幣
              </div>
            </>
          )}
          <button
            onClick={onClose}
            className="chip mt-4 rounded-lg px-6 py-2 text-sm font-semibold"
          >
            關閉
          </button>
        </div>
      )}
    </div>
  );
}
