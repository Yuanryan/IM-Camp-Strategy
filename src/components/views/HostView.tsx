"use client";

import { useState } from "react";
import { useSnapshot, postJson, ActionButton } from "@/components/client";
import { Card } from "@/components/Shell";
import { Num } from "@/components/ui";
import { EVENTS, REGIONS } from "@/lib/game";

const PHASES: Record<string, string> = { SETUP: "準備中", RUNNING: "進行中", SETTLED: "已結算" };

export function HostView() {
  const { snap, mutate } = useSnapshot(2500);
  const [penalty, setPenalty] = useState<string>("EMBER");
  const [ranking, setRanking] = useState<{ id: number; name: string; netWorth: number; coins: number; propertyValue: number }[] | null>(null);

  if (!snap) return <p className="text-sm text-slate-400">載入中…</p>;
  const active = new Set(snap.activeEvents);

  return (
    <div className="space-y-4">
      <Card title="遊戲階段">
        <div className="flex gap-2">
          {Object.entries(PHASES).map(([p, label]) => (
            <ActionButton
              key={p}
              label={label}
              className={`flex-1 py-3 text-base font-bold ${
                snap.phase === p
                  ? "bg-cyan-500 text-slate-950 shadow-[0_0_14px_rgba(34,211,238,0.4)]"
                  : "chip"
              }`}
              onAction={async () => {
                await postJson("/api/host/phase", { phase: p });
                await mutate();
                return `階段：${label}`;
              }}
            />
          ))}
        </div>
      </Card>

      <Card title="市場事件（觸發後自動套用市值倍率）">
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => {
            const ev = EVENTS[i];
            const on = active.has(i);
            return (
              <div
                key={i}
                className={`rounded-xl border p-4 transition ${
                  on
                    ? "border-cyan-400/40 bg-cyan-400/10 shadow-[0_0_16px_rgba(34,211,238,0.08)]"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 font-bold">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${on ? "bg-cyan-400 text-slate-950" : "bg-white/10 text-slate-400"}`}>
                        {i}
                      </span>
                      {ev.name.replace(/^事件[一二三四]：/, "")}
                      {on && (
                        <span className="shrink-0 rounded-md bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300 ring-1 ring-emerald-400/25">
                          進行中
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">{ev.news}</div>
                  </div>
                  <ActionButton
                    label={on ? "關閉" : "觸發"}
                    className={
                      on
                        ? "shrink-0 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                        : "shrink-0 bg-amber-500 px-5 text-white hover:bg-amber-400"
                    }
                    onAction={async () => {
                      await postJson("/api/host/event", {
                        index: i,
                        on: !on,
                        penaltyRegion: i === 4 ? penalty : undefined,
                      });
                      await mutate();
                      return `事件${i} ${on ? "已關閉" : "已觸發"}`;
                    }}
                  />
                </div>
                {i === 4 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-white/8 bg-white/5 px-3 py-2 text-xs text-slate-400">
                    <span>「前次漲最多區域 −15%」：</span>
                    <select
                      value={penalty}
                      onChange={(e) => setPenalty(e.target.value)}
                      className="fld px-2 py-1 text-xs"
                    >
                      {REGIONS.map((r) => (
                        <option key={r.code} value={r.code}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    <span className="text-slate-500">觸發前先選好</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="結算">
        <ActionButton label="進行最終結算（鎖定並排名）" className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"
          confirmText="確定結算？將鎖定為已結算狀態。"
          onAction={async () => { const r = await postJson("/api/host/settle", {}); setRanking(r.ranking); await mutate(); return "已結算"; }} />
        {ranking && (
          <ol className="mt-3 space-y-1">
            {ranking.map((t, i) => (
              <li key={t.id} className="flex justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
                <span><b className="mr-2 text-amber-400">{i + 1}</b>{t.name}</span>
                <span>總資產 <Num className="neon-gold font-bold">{t.netWorth}</Num>（現金 <Num>{t.coins}</Num>／不動產 <Num>{t.propertyValue}</Num>）</span>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-2 text-xs text-slate-500">總資產 = 現金光幣 + 不動產最終市值（不含動產）。</p>
      </Card>
    </div>
  );
}
