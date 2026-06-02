"use client";

import { useState } from "react";
import { useSnapshot, postJson, ActionButton, TeamSelect, toast } from "@/components/client";
import { Card } from "@/components/Shell";
import { Num } from "@/components/ui";
import { lotteryFee } from "@/lib/game";

export function LotteryView() {
  const { snap, mutate } = useSnapshot(2500);
  const [team, setTeam] = useState<number | "">("");

  if (!snap) return <p className="text-sm text-slate-400">載入中…</p>;
  const taken = new Map(snap.lottery.numbers.map((n) => [n.number, n.teamName]));
  const myCount = team === "" ? 0 : snap.lottery.numbers.filter((n) => n.teamId === team).length;
  const nextFee = lotteryFee(myCount);

  const register = async (number: number) => {
    if (team === "") return;
    try {
      const r = await postJson("/api/lottery/register", { teamId: team, number });
      await mutate();
      toast(`登記 ${number} 號（費用 ${r.fee}）`, "ok");
    } catch (e) {
      toast(e instanceof Error ? e.message : "失敗", "err");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card title="本期">
          <Num className="text-3xl font-black text-slate-100">第 {snap.lottery.period} 期</Num>
        </Card>
        <Card title="獎金池">
          <Num className="neon-emerald text-3xl font-black">{snap.lottery.pool}</Num>
        </Card>
        <Card title="開獎">
          <ActionButton label="開獎抽號" className="bg-rose-600 text-white shadow-rose-500/30 hover:bg-rose-500"
            confirmText="確定開獎？"
            onAction={async () => {
              const r = await postJson("/api/lottery/draw", {});
              await mutate();
              if (r.winnerTeamId) toast(`中獎號碼 ${r.number}！得主獲得 ${r.pool}`, "ok");
              else toast(`開出 ${r.number}，無人中獎，獎金池保留`, "err");
            }} />
        </Card>
      </div>

      <Card title="登記號碼">
        <div className="mb-3 flex items-center gap-3">
          <TeamSelect teams={snap.teams} value={team} onChange={setTeam} />
          {team !== "" && (
            <span className="text-sm text-slate-400">
              已持 {myCount} 個，下個號碼費用 <Num className="font-bold neon-gold">{nextFee}</Num>（光幣 <Num className="neon-gold">{snap.teams.find((t) => t.id === team)?.coins}</Num>）
            </span>
          )}
        </div>
        <div className="grid grid-cols-10 gap-1.5">
          {Array.from({ length: 50 }, (_, i) => i + 1).map((n) => {
            const owner = taken.get(n);
            return (
              <button key={n} disabled={team === "" || !!owner}
                onClick={() => register(n)} title={owner ?? ""}
                className={`num rounded-md py-2 text-sm font-bold transition ${
                  owner ? "cursor-not-allowed bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30"
                    : team === "" ? "bg-white/5 text-slate-600"
                    : "bg-white/10 text-slate-200 hover:bg-sky-500 hover:text-white"
                }`}>
                {n}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-slate-500">綠色 = 已被登記（滑過可看持有隊）。每隊第一個號碼免費，之後 50 × 2^(已持-1)。每次登記獎金池 +100，加購費也入池。</p>
      </Card>
    </div>
  );
}
