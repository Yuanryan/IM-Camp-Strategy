"use client";

import { useSnapshot } from "@/components/client";
import { Num, PriceTag, LevelDots, EventBanner, AuctionBanner } from "@/components/ui";
import { REGIONS, REGION_UI } from "@/lib/game";

const MEDAL = ["🥇", "🥈", "🥉"];

export function ProjectionView() {
  const { snap, error } = useSnapshot(2000, "/api/public/snapshot");

  if (error) return <FullMsg text="連線錯誤，重試中…" />;
  if (!snap) return <FullMsg text="載入中…" />;

  const ranking = [...snap.teams].sort((a, b) => b.netWorth - a.netWorth);
  const maxWorth = Math.max(1, ...ranking.map((t) => t.netWorth));
  const phaseTag =
    snap.phase === "SETTLED" ? "已結算" : snap.phase === "RUNNING" ? "進行中" : "準備中";

  return (
    <div className="min-h-screen p-6">
      {/* 標題列 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-cyan-500 to-yellow-400 text-2xl shadow-lg shadow-cyan-500/40">
            🏮
          </span>
          <div>
            <h1 className="bg-gradient-to-r from-cyan-200 via-cyan-100 to-yellow-200 bg-clip-text text-3xl font-black tracking-tight text-transparent">
              IM 大富翁：迷霧資本戰
            </h1>
            <div className="text-xs text-slate-500">IM Monopoly · Misty Capital War</div>
          </div>
        </div>
        <span
          className={`rounded-full px-4 py-1.5 text-sm font-semibold ring-1 ${
            snap.phase === "RUNNING"
              ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30"
              : snap.phase === "SETTLED"
                ? "bg-amber-500/15 text-amber-300 ring-amber-400/30"
                : "bg-slate-500/15 text-slate-300 ring-slate-400/30"
          }`}
        >
          {phaseTag}
        </span>
      </div>

      {/* 事件呼吸橫幅 */}
      <div className="mb-4 space-y-3">
        <EventBanner events={snap.activeEvents} />
        <AuctionBanner auction={snap.auction} />
        {snap.auction.recentlySold.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
            <span className="font-semibold text-amber-300/80">近期成交：</span>
            {snap.auction.recentlySold.map((s, i) => (
              <span
                key={i}
                className="rounded-lg border border-white/5 bg-slate-800/40 px-2.5 py-1"
              >
                {s.title} → <span className="text-sky-300">{s.winnerTeamName}</span>
                <Num className="ml-1 text-amber-200">{s.finalPrice}</Num>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* 排行 */}
        <section className="glass col-span-4 rounded-2xl p-4">
          <h2 className="mb-3 text-lg font-bold text-amber-300">💰 資產排行</h2>
          <ol className="space-y-2">
            {ranking.map((t, i) => (
              <li
                key={t.id}
                className="relative overflow-hidden rounded-xl border border-white/5 bg-slate-800/40 px-3 py-2"
              >
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500/25 to-transparent"
                  style={{ width: `${(t.netWorth / maxWorth) * 100}%` }}
                />
                <div className="relative flex items-center justify-between">
                  <span className="font-semibold">
                    <span className="mr-2 inline-block w-6 text-center">
                      {MEDAL[i] ?? <span className="text-amber-400/80">{i + 1}</span>}
                    </span>
                    {t.name}
                  </span>
                  <span className="text-right">
                    <Num className="neon-gold text-2xl font-black">{t.netWorth}</Num>
                    <span className="ml-1 text-[11px] text-slate-400">
                      （現金 <Num>{t.coins}</Num>／不動產 <Num>{t.propertyValue}</Num>）
                    </span>
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* 大樂透 */}
        <section className="glass col-span-4 rounded-2xl border-emerald-400/20 p-4">
          <h2 className="mb-1 text-lg font-bold text-emerald-300">
            🎰 大樂透（第 {snap.lottery.period} 期）
          </h2>
          <div className="mb-3">
            <Num className="neon-emerald text-4xl font-black">{snap.lottery.pool}</Num>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {snap.lottery.numbers.length === 0 && (
              <span className="text-sm text-slate-500">尚無登記號碼</span>
            )}
            {snap.lottery.numbers.map((n) => (
              <span
                key={n.number}
                title={n.teamName}
                className="num grid h-9 w-9 place-items-center rounded-lg bg-emerald-900/40 text-sm font-bold ring-1 ring-emerald-400/25"
              >
                {n.number}
              </span>
            ))}
          </div>
        </section>

        {/* 各區獨佔 */}
        <section className="glass col-span-4 rounded-2xl border-sky-400/20 p-4">
          <h2 className="mb-3 text-lg font-bold text-sky-300">🏙️ 各區獨佔 / 過路費</h2>
          <ul className="space-y-2 text-sm">
            {snap.regions.map((r) => (
              <li
                key={r.code}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-800/40 px-3 py-2"
              >
                <span className={`font-medium ${REGION_UI[r.code].text}`}>{r.name}</span>
                <span>
                  {r.monopolyTeamName ? (
                    <>
                      <span className="font-semibold text-sky-300">{r.monopolyTeamName}</span>
                      <span className="ml-2 rounded-md bg-amber-500/15 px-2 py-0.5 text-amber-300">
                        過路費 <Num>{r.toll}</Num>
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-500">無獨佔</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* 不動產地圖 + 現價（▲▼ 漲跌） */}
      <div className="mt-4 grid grid-cols-4 gap-4">
        {REGIONS.map((region) => {
          const ui = REGION_UI[region.code];
          return (
            <section
              key={region.code}
              className={`rounded-2xl border bg-gradient-to-b p-3 backdrop-blur ${ui.panel}`}
            >
              <h3 className="mb-2 flex items-baseline justify-between text-base font-bold">
                <span className={ui.text}>{region.name}</span>
                <span className="text-[10px] font-normal text-slate-500">{region.theme}</span>
              </h3>
              <ul className="space-y-1">
                {snap.properties
                  .filter((p) => p.region === region.code)
                  .map((p) => (
                    <li
                      key={p.id}
                      className={`flex items-center justify-between rounded-lg px-2 py-1 text-xs ${
                        p.ownerTeamId ? "bg-black/30" : "bg-black/10 text-slate-500"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-1 truncate">
                        <span className="truncate">{p.name}</span>
                        {p.ownerTeamId != null && <LevelDots level={p.level} />}
                      </span>
                      <span className="ml-2 shrink-0 text-right">
                        <PriceTag current={p.currentValue} base={p.basePrice} />
                        {p.ownerName && <span className="ml-1 text-sky-300">{p.ownerName}</span>}
                      </span>
                    </li>
                  ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function FullMsg({ text }: { text: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center text-2xl text-slate-400">
      {text}
    </div>
  );
}
