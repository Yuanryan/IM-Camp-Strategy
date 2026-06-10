"use client";

import { useState } from "react";
import { useSnapshot, postJson, ActionButton, TeamSelect, toast } from "@/components/client";
import { Card, StickyTeam } from "@/components/Shell";
import { Num, TeamItemBadges } from "@/components/ui";
import { lotteryFee, EffectType } from "@/lib/game";

export function LotteryView() {
  const { snap, mutate } = useSnapshot(2500);
  const [team, setTeam] = useState<number | "">("");
  const [pending, setPending] = useState<number | null>(null);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [highlight, setHighlight] = useState<number | null>(null);

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
      const msg = `已登記 ${number} 號（費用 ${r.fee}）`;
      setResult({ ok: true, msg });
      toast(msg, "ok");
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
            <ActionButton
              label="開獎"
              className="btn-rose px-5 py-3 text-base font-black"
              confirmText="確定開獎？"
              onAction={async () => {
                const r = await postJson("/api/lottery/draw", {});
                await mutate();
                if (r.winnerTeamId) toast(`中獎號碼 ${r.number}！得主獲得 ${r.finalPool}`, "ok");
                else toast(`開出 ${r.number}，無人中獎，獎金池保留`, "err");
              }}
            />
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
        <p className="mt-2 text-xs text-slate-500">金色＝你的號碼，綠色＝他隊已登記。每隊第一個號碼免費，之後 50 × 2^(已持-1)。每次登記獎金池 +100，加購費也入池。</p>

        {snap.lottery.numbers.length > 0 && (
          <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
            <div className="text-xs font-semibold text-slate-400">各隊持有號碼</div>
            {snap.teams
              .map((t) => ({
                team: t,
                nums: snap.lottery.numbers
                  .filter((n) => n.teamId === t.id)
                  .map((n) => n.number)
                  .sort((a, b) => a - b),
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
                      <span key={x} className="num rounded bg-white/10 px-1.5 py-0.5 text-xs font-bold text-slate-200 ring-1 ring-white/10">
                        {x}
                      </span>
                    ))}
                  </span>
                </div>
              ))}
          </div>
        )}
      </Card>
    </div>
  );
}
