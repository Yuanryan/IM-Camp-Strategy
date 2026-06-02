"use client";

import { useState } from "react";
import { useSnapshot, postJson, ActionButton, TeamSelect, toast } from "@/components/client";
import { RewardButtons, giveReward } from "@/components/RewardPanel";
import { Card } from "@/components/Shell";
import { Num, EventBanner } from "@/components/ui";
import { MAP_REWARD_PRESETS } from "@/lib/game";

export function MapView() {
  const { snap, mutate } = useSnapshot(2500);
  const [team, setTeam] = useState<number | "">("");
  const [coins, setCoins] = useState(0);
  const [points, setPoints] = useState(0);
  const [note, setNote] = useState("");
  const [stake, setStake] = useState(100);

  if (!snap) return <p className="text-sm text-slate-400">載入中…</p>;
  const teams = snap.teams;
  const cur = teams.find((t) => t.id === team);

  return (
    <div className="space-y-4">
      <EventBanner events={snap.activeEvents} />

      <Card title="選擇小隊">
        <TeamSelect teams={teams} value={team} onChange={setTeam} />
        {cur && (
          <span className="ml-3 text-sm text-slate-400">
            光幣 <Num className="neon-gold">{cur.coins}</Num>　卡牌點數 <Num className="text-cyan-300">{cur.cardPoints}</Num>
          </span>
        )}
      </Card>

      <Card title="格子快捷（光幣 / 卡牌點數）">
        <RewardButtons teamId={team} presets={MAP_REWARD_PRESETS} onDone={mutate} />
        <p className="mt-2 text-xs text-slate-500">事件一加倍格請自行輸入兩倍金額；光靈折抵在交易所購買時輸入。</p>
      </Card>

      <Card title="自訂加減">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-slate-400"><div className="mb-1">光幣（可負）</div>
            <input type="number" value={coins} onChange={(e) => setCoins(Number(e.target.value) || 0)} className="fld w-28" /></label>
          <label className="text-xs text-slate-400"><div className="mb-1">卡牌點數（可負）</div>
            <input type="number" value={points} onChange={(e) => setPoints(Number(e.target.value) || 0)} className="fld w-28" /></label>
          <label className="flex-1 text-xs text-slate-400"><div className="mb-1">備註</div>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="例如：好運卡" className="fld w-full" /></label>
          <ActionButton label="套用" disabled={team === ""}
            onAction={async () => {
              if (team === "") return "請先選小隊";
              if (coins === 0 && points === 0) return "沒有變動";
              await giveReward({ teamId: team, coins, cardPoints: points, note: note || "自訂" });
              await mutate();
              const n = note || "自訂"; setCoins(0); setPoints(0); setNote("");
              return `${cur?.name}：${n}`;
            }} />
        </div>
      </Card>

      <Card title="命運投資輪盤">
        <div className="flex items-end gap-3">
          <label className="text-xs text-slate-400"><div className="mb-1">投入光幣（≤500）</div>
            <input type="number" value={stake} min={1} max={500}
              onChange={(e) => setStake(Number(e.target.value) || 0)} className="fld w-28" /></label>
          <ActionButton label="轉輪盤" className="bg-purple-600 text-white shadow-purple-500/30 hover:bg-purple-500"
            disabled={team === ""}
            onAction={async () => {
              if (team === "") return "請先選小隊";
              const r = await postJson("/api/map/wheel", { teamId: team, stake });
              await mutate();
              toast(`轉到 ×${r.mult}！淨${r.delta >= 0 ? "+" : ""}${r.delta}`, r.delta >= 0 ? "ok" : "err");
            }} />
        </div>
        <p className="mt-2 text-xs text-slate-500">倍率：x0 / x0.5 / x1 / x1.5 / x2 / x5（x5 機率低）。系統自動扣投入並依倍率發還。</p>
      </Card>
    </div>
  );
}
