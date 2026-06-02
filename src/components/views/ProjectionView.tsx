"use client";

import { useSnapshot } from "@/components/client";
import { EVENTS, REGIONS, type RegionCode } from "@/lib/game";

const LEVEL_TAG = ["0", "1", "2", "3"];
const MEDAL = ["🥇", "🥈", "🥉"];

// 各區主題色（投影地圖用）
const REGION_ACCENT: Record<RegionCode, string> = {
  AURORA: "from-amber-500/20 to-amber-500/5 border-amber-400/30",
  SPECTRA: "from-cyan-500/20 to-cyan-500/5 border-cyan-400/30",
  EMBER: "from-orange-600/20 to-orange-600/5 border-orange-500/30",
  HAVEN: "from-emerald-500/20 to-emerald-500/5 border-emerald-400/30",
};

export function ProjectionView() {
  const { snap, error } = useSnapshot(2000, "/api/public/snapshot");

  if (error) return <FullMsg text="連線錯誤，重試中…" />;
  if (!snap) return <FullMsg text="載入中…" />;

  const ranking = [...snap.teams].sort((a, b) => b.netWorth - a.netWorth);
  const maxWorth = Math.max(1, ...ranking.map((t) => t.netWorth));
  const phaseTag =
    snap.phase === "SETTLED" ? "已結算" : snap.phase === "RUNNING" ? "進行中" : "準備中";

  return (
    <div className="min-h-screen bg-[#0b0a14] bg-[radial-gradient(900px_500px_at_15%_-100px,rgba(124,58,237,0.25),transparent_60%),radial-gradient(900px_500px_at_100%_0%,rgba(56,189,248,0.18),transparent_55%)] p-6 text-zinc-100">
      {/* 標題列 */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 text-2xl shadow-lg shadow-fuchsia-500/30">
            🏮
          </span>
          <div>
            <h1 className="bg-gradient-to-r from-indigo-200 via-violet-200 to-fuchsia-200 bg-clip-text text-3xl font-black tracking-tight text-transparent">
              IM 大富翁：迷霧資本戰
            </h1>
            <div className="text-xs text-zinc-500">IM Monopoly · Misty Capital War</div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span
            className={`rounded-full px-3 py-1 font-semibold ring-1 ${
              snap.phase === "RUNNING"
                ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30"
                : snap.phase === "SETTLED"
                  ? "bg-amber-500/15 text-amber-300 ring-amber-400/30"
                  : "bg-zinc-500/15 text-zinc-300 ring-zinc-400/30"
            }`}
          >
            {phaseTag}
          </span>
          {snap.activeEvents.length > 0 && (
            <span className="rounded-full bg-fuchsia-500/15 px-3 py-1 font-semibold text-fuchsia-200 ring-1 ring-fuchsia-400/30">
              事件 {snap.activeEvents.join("、")} 進行中
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* 排行 */}
        <section className="col-span-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
          <h2 className="mb-3 text-lg font-bold text-amber-300">💰 資產排行</h2>
          <ol className="space-y-2">
            {ranking.map((t, i) => (
              <li
                key={t.id}
                className="relative overflow-hidden rounded-xl border border-white/5 bg-zinc-800/60 px-3 py-2"
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
                    <span className="text-2xl font-black tabular-nums">{t.netWorth}</span>
                    <span className="ml-1 text-[11px] text-zinc-400">
                      （現金 {t.coins}／不動產 {t.propertyValue}）
                    </span>
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* 大樂透 */}
        <section className="col-span-4 rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.06] p-4 backdrop-blur">
          <h2 className="mb-1 text-lg font-bold text-emerald-300">
            🎰 大樂透（第 {snap.lottery.period} 期）
          </h2>
          <div className="mb-3 text-4xl font-black tabular-nums text-emerald-300 drop-shadow-[0_0_12px_rgba(16,185,129,0.45)]">
            {snap.lottery.pool}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {snap.lottery.numbers.length === 0 && (
              <span className="text-sm text-zinc-500">尚無登記號碼</span>
            )}
            {snap.lottery.numbers.map((n) => (
              <span
                key={n.number}
                title={n.teamName}
                className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-900/50 text-sm font-bold tabular-nums ring-1 ring-emerald-400/20"
              >
                {n.number}
              </span>
            ))}
          </div>
        </section>

        {/* 各區獨佔 */}
        <section className="col-span-4 rounded-2xl border border-sky-400/15 bg-sky-500/[0.06] p-4 backdrop-blur">
          <h2 className="mb-3 text-lg font-bold text-sky-300">🏙️ 各區獨佔 / 過路費</h2>
          <ul className="space-y-2 text-sm">
            {snap.regions.map((r) => (
              <li
                key={r.code}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-zinc-800/50 px-3 py-2"
              >
                <span className="font-medium">{r.name}</span>
                <span>
                  {r.monopolyTeamName ? (
                    <>
                      <span className="font-semibold text-sky-300">{r.monopolyTeamName}</span>
                      <span className="ml-2 rounded-md bg-amber-500/15 px-2 py-0.5 text-amber-300">
                        過路費 {r.toll}
                      </span>
                    </>
                  ) : (
                    <span className="text-zinc-500">無獨佔</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* 不動產地圖 + 現價 */}
      <div className="mt-4 grid grid-cols-4 gap-4">
        {REGIONS.map((region) => (
          <section
            key={region.code}
            className={`rounded-2xl border bg-gradient-to-b p-3 backdrop-blur ${REGION_ACCENT[region.code]}`}
          >
            <h3 className="mb-2 flex items-baseline justify-between text-base font-bold">
              {region.name}
              <span className="text-[10px] font-normal text-zinc-400">{region.theme}</span>
            </h3>
            <ul className="space-y-1">
              {snap.properties
                .filter((p) => p.region === region.code)
                .map((p) => (
                  <li
                    key={p.id}
                    className={`flex items-center justify-between rounded-lg px-2 py-1 text-xs ${
                      p.ownerTeamId
                        ? "bg-black/25"
                        : "bg-black/10 text-zinc-500"
                    }`}
                  >
                    <span className="truncate">
                      {p.name}
                      {p.level > 0 && (
                        <span className="ml-1 rounded bg-amber-400/20 px-1 text-amber-300">
                          Lv{LEVEL_TAG[p.level]}
                        </span>
                      )}
                    </span>
                    <span className="ml-2 shrink-0 text-right tabular-nums">
                      <span className="font-bold">{p.currentValue}</span>
                      {p.ownerName && <span className="ml-1 text-sky-300">{p.ownerName}</span>}
                    </span>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>

      {snap.activeEvents.length > 0 && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-400 backdrop-blur">
          {snap.activeEvents.map((i) => EVENTS[i]?.name).filter(Boolean).join("　|　")}
        </div>
      )}
    </div>
  );
}

function FullMsg({ text }: { text: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0a14] text-2xl text-zinc-400">
      {text}
    </div>
  );
}
