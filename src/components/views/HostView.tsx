"use client";

import { useState } from "react";
import { useSnapshot, postJson, ActionButton, toast } from "@/components/client";
import { Card } from "@/components/Shell";
import { EVENTS, REGIONS } from "@/lib/game";

const PHASES: Record<string, string> = { SETUP: "準備中", RUNNING: "進行中", SETTLED: "已結算" };

export function HostView() {
  const { snap, mutate } = useSnapshot(2500);
  const [penalty, setPenalty] = useState<string>("EMBER");
  const [ranking, setRanking] = useState<{ id: number; name: string; netWorth: number; coins: number; propertyValue: number }[] | null>(null);

  if (!snap) return <p className="text-sm text-zinc-500">載入中…</p>;
  const active = new Set(snap.activeEvents);

  return (
    <div className="space-y-4">
      <Card title="遊戲階段">
        <div className="flex gap-2">
          {Object.entries(PHASES).map(([p, label]) => (
            <ActionButton key={p} label={label}
              className={snap.phase === p ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"}
              onAction={async () => { await postJson("/api/host/phase", { phase: p }); await mutate(); return `階段：${label}`; }} />
          ))}
        </div>
      </Card>

      <Card title="市場事件（觸發後自動套用市值倍率）">
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => {
            const ev = EVENTS[i];
            const on = active.has(i);
            return (
              <div key={i} className="rounded-xl border border-zinc-200 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold">{ev.name} {on && <span className="ml-1 text-xs text-emerald-600">● 進行中</span>}</div>
                    <div className="text-xs text-zinc-500">{ev.news}</div>
                  </div>
                  <ActionButton label={on ? "關閉" : "觸發"}
                    className={on ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-amber-600 text-white hover:bg-amber-500"}
                    onAction={async () => {
                      await postJson("/api/host/event", { index: i, on: !on, penaltyRegion: i === 4 ? penalty : undefined });
                      await mutate();
                      return `事件${i} ${on ? "已關閉" : "已觸發"}`;
                    }} />
                </div>
                {i === 4 && (
                  <div className="mt-2 text-xs text-zinc-500">
                    「前次漲最多區域 −15%」由你選定：
                    <select value={penalty} onChange={(e) => setPenalty(e.target.value)}
                      className="ml-2 rounded-md border border-zinc-300 px-2 py-1 text-sm">
                      {REGIONS.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
                    </select>
                    <span className="ml-2 text-zinc-400">（觸發前先選好；改選後需重新觸發）</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="結算">
        <ActionButton label="進行最終結算（鎖定並排名）" className="bg-zinc-900 text-white hover:bg-zinc-700"
          confirmText="確定結算？將鎖定為已結算狀態。"
          onAction={async () => { const r = await postJson("/api/host/settle", {}); setRanking(r.ranking); await mutate(); return "已結算"; }} />
        {ranking && (
          <ol className="mt-3 space-y-1">
            {ranking.map((t, i) => (
              <li key={t.id} className="flex justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm">
                <span><b className="mr-2 text-amber-600">{i + 1}</b>{t.name}</span>
                <span className="tabular-nums">總資產 <b>{t.netWorth}</b>（現金 {t.coins}／不動產 {t.propertyValue}）</span>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-2 text-xs text-zinc-400">總資產 = 現金光幣 + 不動產最終市值（不含動產）。</p>
      </Card>
    </div>
  );
}
