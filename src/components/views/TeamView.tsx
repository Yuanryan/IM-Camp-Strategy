"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher, useSnapshot } from "@/components/client";
import { Card } from "@/components/Shell";
import { Num, PriceTag, LevelDots, EventBanner, HudTabs } from "@/components/ui";
import { TradeView } from "@/components/views/TradeView";
import { Wallet, ArrowLeftRight } from "lucide-react";

const LEVEL_TAG = ["已購", "1級", "2級", "3級"];

export function TeamView({ teamId }: { teamId: number }) {
  const { snap, error } = useSnapshot(3000);
  const { data: trades } = useSWR<{ incoming: unknown[] }>("/api/trade", fetcher, { refreshInterval: 3000 });
  const [tab, setTab] = useState<"assets" | "trade">("assets");
  const incoming = trades?.incoming?.length ?? 0;

  if (error) return <p className="text-sm text-slate-400">連線錯誤，重試中…</p>;
  if (!snap) return <p className="text-sm text-slate-400">載入中…</p>;

  const me = snap.teams.find((t) => t.id === teamId);
  const myProps = snap.properties.filter((p) => p.ownerTeamId === teamId);
  const myNumbers = snap.lottery.numbers.filter((n) => n.teamId === teamId);

  if (!me) return <p className="text-sm text-slate-400">找不到隊伍資料</p>;

  const tradeLabel = (
    <span className="flex items-center gap-1.5">
      交易
      {incoming > 0 && (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white shadow-[0_0_8px_rgba(244,63,94,0.6)]">
          {incoming}
        </span>
      )}
    </span>
  );

  return (
    <div className="space-y-4">
      <HudTabs
        active={tab}
        onChange={setTab}
        tabs={[
          ["assets", "我的資產", <Wallet className="h-4 w-4" />],
          ["trade", tradeLabel, <ArrowLeftRight className="h-4 w-4" />],
        ] as const}
      />

      {tab === "trade" ? (
        <TradeView teamId={teamId} />
      ) : (
      <>
      <EventBanner events={snap.activeEvents} />

      {/* 光幣 — 最大最亮 */}
      <Card>
        <div className="text-xs text-slate-400">光幣餘額</div>
        <Num className="neon-gold text-6xl font-black">{me.coins}</Num>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <div className="text-xs text-slate-400">卡牌點數</div>
          <Num className="text-3xl font-black text-cyan-300">{me.cardPoints}</Num>
        </Card>
        <Card>
          <div className="text-xs text-slate-400">目前總資產</div>
          <Num className="text-3xl font-black text-slate-100">{me.netWorth}</Num>
          <div className="text-[11px] text-slate-500">含不動產現值，不含動產</div>
        </Card>
      </div>

      <Card title={`持有不動產（${myProps.length}）`}>
        {myProps.length === 0 ? (
          <p className="text-sm text-slate-400">尚無不動產</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {myProps.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <span className="flex items-center gap-2">
                  {p.name}
                  <LevelDots level={p.level} />
                  <span className="text-xs text-slate-500">{p.regionName}・{p.type}</span>
                </span>
                <span className="text-right">
                  <span className="chip mr-2 px-2 py-0.5 text-xs">{LEVEL_TAG[p.level]}</span>
                  <PriceTag current={p.currentValue} base={p.basePrice} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title={`大樂透號碼（第 ${snap.lottery.period} 期）`}>
        {myNumbers.length === 0 ? (
          <p className="text-sm text-slate-400">尚未登記號碼</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {myNumbers.map((n) => (
              <span key={n.number} className="num rounded-lg bg-emerald-500/15 px-2.5 py-1 text-sm font-bold text-emerald-300 ring-1 ring-emerald-400/25">
                {n.number}
              </span>
            ))}
          </div>
        )}
      </Card>
      </>
      )}
    </div>
  );
}
