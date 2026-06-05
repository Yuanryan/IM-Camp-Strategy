"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher, useSnapshot } from "@/components/client";
import { Card } from "@/components/Shell";
import { Num, PriceTag, LevelDots, EventBanner, BottomNav } from "@/components/ui";
import { TradeView } from "@/components/views/TradeView";
import { InstructionsView } from "@/components/views/InstructionsView";
import { Wallet, ArrowLeftRight, Trophy, BookOpen } from "lucide-react";
import { REGIONS, REGION_UI } from "@/lib/game";

const LEVEL_TAG = ["已購", "1級", "2級", "3級"];

export function TeamView({ teamId }: { teamId: number }) {
  const { snap, error } = useSnapshot(3000);
  const { data: trades } = useSWR<{ incoming: unknown[] }>("/api/trade", fetcher, {
    refreshInterval: 3000,
  });
  const [tab, setTab] = useState<"assets" | "trade" | "guide">("assets");
  const incoming = trades?.incoming?.length ?? 0;

  if (error) return <p className="p-4 text-sm text-slate-400">連線錯誤，重試中…</p>;
  if (!snap) return <p className="p-4 text-sm text-slate-400">載入中…</p>;

  const me = snap.teams.find((t) => t.id === teamId);
  const myProps = snap.properties.filter((p) => p.ownerTeamId === teamId);
  const myNumbers = snap.lottery.numbers.filter((n) => n.teamId === teamId);

  if (!me) return <p className="p-4 text-sm text-slate-400">找不到隊伍資料</p>;

  // Rank by netWorth (1-indexed)
  const rank =
    [...snap.teams].sort((a, b) => b.netWorth - a.netWorth).findIndex((t) => t.id === teamId) + 1;
  const total = snap.teams.length;

  // Group owned properties by region (skip empty regions)
  const propsByRegion = REGIONS.map((r) => ({
    ...r,
    props: myProps.filter((p) => p.region === r.code),
  })).filter((r) => r.props.length > 0);

  // Which regions does my team monopolize?
  const myMonopolies = new Set(
    snap.regions.filter((r) => r.monopolyTeamId === teamId).map((r) => r.code),
  );

  const tradeLabel = (
    <span className="flex items-center gap-1">
      交易
      {incoming > 0 && (
        <span className="grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-[0_0_6px_rgba(244,63,94,0.6)]">
          {incoming}
        </span>
      )}
    </span>
  );

  if (tab === "guide") {
    return <InstructionsView onBack={() => setTab("assets")} />;
  }

  return (
    <div className="space-y-4 pb-24">
      {tab === "trade" ? (
        <TradeView teamId={teamId} />
      ) : (
        <>
          <EventBanner events={snap.activeEvents} />

          {/* ── Hero: Coins + Rank ─────────────────────────────── */}
          <div className="slide-up relative overflow-hidden rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-400/8 to-slate-900/40 shadow-lg shadow-amber-400/5">
            {/* Accent line */}
            <div className="h-0.5 w-full bg-gradient-to-r from-amber-400/90 via-yellow-300/50 to-transparent" />

            <div className="flex items-start justify-between p-5 pb-4">
              <div>
                <div className="mb-2 text-[11px] uppercase tracking-widest text-slate-400">
                  光幣餘額
                </div>
                <Num className="neon-gold text-7xl font-black leading-none">{me.coins}</Num>
              </div>

              {/* Rank badge */}
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-center min-w-[4.5rem]">
                <div className="mb-1 flex items-center justify-center gap-1 text-[10px] text-slate-400">
                  <Trophy className="h-3 w-3" />
                  <span>排名</span>
                </div>
                <Num
                  className={`text-2xl font-black leading-none ${
                    rank === 1
                      ? "neon-gold"
                      : rank === 2
                        ? "text-slate-200"
                        : rank === 3
                          ? "text-amber-600"
                          : "text-slate-500"
                  }`}
                >
                  {rank}
                </Num>
                <div className="mt-0.5 text-[10px] text-slate-500">/ {total}</div>
              </div>
            </div>

            {/* Secondary stats */}
            <div className="flex items-center gap-0 border-t border-white/8 divide-x divide-white/8">
              <div className="flex-1 px-5 py-3">
                <div className="text-[10px] text-slate-500">卡牌點數</div>
                <Num className="text-xl font-bold text-cyan-300">{me.cardPoints}</Num>
              </div>
              <div className="flex-1 px-5 py-3">
                <div className="text-[10px] text-slate-500">預估總資產</div>
                <Num className="text-xl font-bold text-slate-200">{me.netWorth}</Num>
              </div>
              <div className="flex-1 px-5 py-3">
                <div className="text-[10px] text-slate-500">持有不動產</div>
                <Num className="text-xl font-bold text-slate-300">{myProps.length}</Num>
              </div>
            </div>
          </div>

          {/* ── Properties grouped by region ───────────────────── */}
          <Card title={`持有不動產（${myProps.length}）`}>
            {propsByRegion.length === 0 ? (
              <p className="text-sm text-slate-400">尚無不動產，快去地圖踩資本據點！</p>
            ) : (
              <div className="space-y-3">
                {propsByRegion.map(({ code, name, props }, regionIdx) => {
                  const ui = REGION_UI[code];
                  const regionInfo = snap.regions.find((r) => r.code === code);
                  const hasMyMonopoly = myMonopolies.has(code);
                  const hasOtherMonopoly =
                    regionInfo?.monopolyTeamId != null && !hasMyMonopoly;

                  return (
                    <div key={code}>
                      {/* Region header */}
                      <div className={`mb-2 flex flex-wrap items-center gap-2 ${ui.text}`}>
                        <span className={`h-2 w-2 rounded-full ${ui.dot}`} />
                        <span className="text-xs font-bold tracking-wide">{name}</span>
                        <span className="text-[10px] text-slate-600">×{props.length}</span>
                        {hasMyMonopoly && (
                          <span className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/25">
                            獨佔中
                          </span>
                        )}
                        {hasOtherMonopoly && (
                          <span className="text-[10px] text-rose-400">
                            過路費 {regionInfo?.toll}
                          </span>
                        )}
                      </div>

                      {/* Property rows */}
                      <ul
                        className={`space-y-1 ${
                          regionIdx < propsByRegion.length - 1
                            ? "mb-3.5 pb-3.5 border-b border-white/5"
                            : ""
                        }`}
                      >
                        {props.map((p) => (
                          <li
                            key={p.id}
                            className="flex items-center justify-between rounded-lg bg-white/3 px-3 py-2.5 text-sm"
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="truncate font-medium">{p.name}</span>
                              <LevelDots level={p.level} />
                            </span>
                            <span className="ml-2 flex shrink-0 items-center gap-2">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${ui.chipBg}`}
                              >
                                {LEVEL_TAG[p.level]}
                              </span>
                              <PriceTag current={p.currentValue} base={p.basePrice} />
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* ── Lottery ────────────────────────────────────────── */}
          <Card title={`大樂透號碼（第 ${snap.lottery.period} 期）`}>
            {myNumbers.length === 0 ? (
              <p className="text-sm text-slate-400">尚未登記號碼</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {myNumbers.map((n) => (
                  <span key={n.number} className="lottery-ball">
                    {n.number}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-3 text-xs text-slate-500">
              目前獎金池：
              <Num className="font-bold text-emerald-300">{snap.lottery.pool}</Num> 光幣
            </div>
          </Card>
        </>
      )}

      {/* ── Fixed bottom navigation ───────────────────────────── */}
      <BottomNav
        active={tab}
        onChange={setTab}
        tabs={[
          ["assets", "我的資產", <Wallet key="w" className="h-5 w-5" />],
          ["trade", tradeLabel, <ArrowLeftRight key="t" className="h-5 w-5" />],
          ["guide", "說明書", <BookOpen key="g" className="h-5 w-5" />],
        ] as const}
      />
    </div>
  );
}
