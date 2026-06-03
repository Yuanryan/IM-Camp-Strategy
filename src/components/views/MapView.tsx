"use client";

import { useState } from "react";
import { useSnapshot, postJson, ActionButton, TeamSelect } from "@/components/client";
import { RewardButtons, giveReward } from "@/components/RewardPanel";
import { LotteryView } from "@/components/views/LotteryView";
import { WheelView } from "@/components/views/WheelView";
import { LuckDraw } from "@/components/views/LuckDraw";
import { Card } from "@/components/Shell";
import { Num, EventBanner } from "@/components/ui";
import { MAP_REWARD_PRESETS, REGIONS, REGION_UI } from "@/lib/game";

export function MapView() {
  const { snap, mutate } = useSnapshot(2500);
  const [team, setTeam] = useState<number | "">("");
  const [coins, setCoins] = useState(0);
  const [points, setPoints] = useState(0);
  const [note, setNote] = useState("");
  const [tollRegion, setTollRegion] = useState("AURORA");
  const [tab, setTab] = useState<"map" | "lottery" | "wheel">("map");

  if (!snap) return <p className="text-sm text-slate-400">載入中…</p>;
  const teams = snap.teams;
  const cur = teams.find((t) => t.id === team);
  const event1 = snap.activeEvents.includes(1);

  return (
    <div className="space-y-4">
      {/* 分頁：地圖關主 / 大樂透 */}
      <div className="flex gap-2">
        {([["map", "地圖關主"], ["lottery", "大樂透"], ["wheel", "命運輪盤"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === key ? "bg-cyan-500 text-slate-950" : "chip"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "lottery" ? (
        <LotteryView />
      ) : tab === "wheel" ? (
        <WheelView teams={teams} team={team} setTeam={setTeam} cur={cur} onDone={mutate} />
      ) : (
      <>
      <EventBanner events={snap.activeEvents} />

      {/* 選擇小隊 — 所有格子操作共用 */}
      <Card title="選擇小隊">
        <TeamSelect teams={teams} value={team} onChange={setTeam} />
        {cur && (
          <span className="ml-3 text-sm text-slate-400">
            光幣 <Num className="neon-gold">{cur.coins}</Num>　卡牌點數 <Num className="text-cyan-300">{cur.cardPoints}</Num>
          </span>
        )}
      </Card>

      {/* 光源點 / 迷霧區 — 抽卡格 */}
      <Card title="光源點 / 迷霧區（抽卡格獎懲）">
        <div className="mb-3 space-y-1.5 text-sm text-slate-300">
          <p>
            <b className="text-amber-300">光源點</b>：請小隊抽<b>好運卡</b>並執行效果。
          </p>
          <p>
            <b className="text-rose-300">迷霧區</b>：請小隊抽<b>迷霧卡</b>並執行懲罰。
          </p>
        </div>
        {event1 && (
          <div className="breathe mb-3 rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-200">
            事件一進行中：抽卡獎勵 / 扣錢自動 ×2
          </div>
        )}

        <LuckDraw team={team} curName={cur?.name} event1={event1} onDone={mutate} />

        <div className="mt-4 border-t border-white/10 pt-3">
          <div className="mb-2 text-xs font-semibold text-slate-400">其他快速加減</div>
          <RewardButtons teamId={team} presets={MAP_REWARD_PRESETS} onDone={mutate} />
        </div>
      </Card>

      {/* 資本據點 */}
      <Card title="資本據點">
        <p className="mb-3 text-sm text-slate-300">
          告知小隊可<b>購買 / 升級</b>該區資產（須到<b>交易所</b>登記）；並確認是否需付<b>過路費</b>
          —— 該區有獨佔隊伍才需付，於下方收取。
        </p>
        <div className="mb-1 text-xs font-semibold text-slate-400">收過路費（選付款隊踩到的區域）</div>
        <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 py-1.5">
          {REGIONS.map((r) => (
            <button key={r.code} onClick={() => setTollRegion(r.code)}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition ${
                tollRegion === r.code ? `bg-white/10 ${REGION_UI[r.code].text} ring-1 ${REGION_UI[r.code].border}` : "chip"
              }`}>
              {r.name}
            </button>
          ))}
        </div>
        <ActionButton label="向選定小隊收過路費" className="bg-sky-600 text-white hover:bg-sky-500"
          disabled={team === ""}
          onAction={async () => {
            if (team === "") return "請先選付款小隊";
            const prop = snap.properties.find((p) => p.region === tollRegion);
            if (!prop) return "該區尚無資本據點";
            const r = await postJson("/api/exchange/toll", { propertyId: prop.id, payerTeamId: team });
            await mutate();
            return `${cur?.name} 已付過路費 ${r.toll}`;
          }} />
        <p className="mt-2 text-xs text-slate-500">系統依該區獨佔隊伍現值自動計算（×10%、四捨五入至 50）。踩到自己獨佔區或該區無獨佔則免收。</p>
      </Card>

      {/* 自訂加減 — 通用工具（事件加倍 / 特殊情況） */}
      <Card title="自訂加減（事件加倍 / 特殊情況）">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-slate-400"><div className="mb-1">光幣（可負）</div>
            <input type="number" inputMode="numeric" value={coins} onChange={(e) => setCoins(Number(e.target.value) || 0)} className="fld w-28" /></label>
          <label className="text-xs text-slate-400"><div className="mb-1">卡牌點數（可負）</div>
            <input type="number" inputMode="numeric" value={points} onChange={(e) => setPoints(Number(e.target.value) || 0)} className="fld w-28" /></label>
          <label className="flex-1 text-xs text-slate-400"><div className="mb-1">備註</div>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="例如：好運卡效果" className="fld w-full" /></label>
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
      </>
      )}
    </div>
  );
}
