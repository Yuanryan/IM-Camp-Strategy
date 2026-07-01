"use client";

import { useState } from "react";
import { TeamSelect } from "@/components/client";
import { REGIONS, REGION_UI } from "@/lib/game";

export const LEVEL_TAG = ["0級", "1級", "2級", "3級"];

// 快照不動產的精簡型別（不動產列表 / 功能卡目標選擇器共用）
export type PropView = {
  id: number; name: string; region: string; level: number;
  ownerTeamId: number | null; ownerName: string | null; basePrice: number;
  currentValue: number; investedValue: number;
};

// 點選式不動產選擇器：直接點視覺 tile 選取（選中高亮）。上方保留區域 + 持有隊輕量篩選。
export function PropertyGrid({
  label, base, value, onChange, teams, accent = "cyan",
}: {
  label: string;
  base: PropView[]; // 已套基底過濾（己方 / 他隊 / 已售出…）
  value: number | "";
  onChange: (id: number | "") => void;
  teams: { id: number; name: string }[];
  accent?: "cyan" | "rose"; // 來源用 cyan，目標用 rose，視覺區隔
}) {
  const [area, setArea] = useState<string>("ALL");
  const [owner, setOwner] = useState<number | "">("");
  const ownerTeams = teams.filter((t) => base.some((p) => p.ownerTeamId === t.id));
  const list = base.filter(
    (p) => (area === "ALL" || p.region === area) && (owner === "" || p.ownerTeamId === owner),
  );
  const ring = accent === "rose" ? "ring-rose-400/70 border-rose-400/50" : "ring-cyan-400/70 border-cyan-400/50";

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="mb-2 text-xs font-medium text-slate-300">{label}</div>
      {/* 篩選列 */}
      <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
        <button onClick={() => setArea("ALL")}
          className={`rounded-md px-2.5 py-1 text-xs transition ${area === "ALL" ? "bg-white/10 text-cyan-300 ring-1 ring-cyan-400/40" : "chip"}`}>全部</button>
        {REGIONS.map((r) => (
          <button key={r.code} onClick={() => setArea(r.code)}
            className={`rounded-md px-2.5 py-1 text-xs transition ${area === r.code ? `bg-white/10 ${REGION_UI[r.code].text} ring-1 ${REGION_UI[r.code].border}` : "chip"}`}>
            {r.name}
          </button>
        ))}
        <TeamSelect teams={ownerTeams} value={owner} onChange={setOwner} placeholder="所有小隊" />
      </div>
      {/* 視覺 tile 點選 */}
      {list.length === 0 ? (
        <p className="py-3 text-center text-xs text-slate-500">沒有符合的不動產</p>
      ) : (
        <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
          {list.map((p) => {
            const ui = REGION_UI[p.region as keyof typeof REGION_UI];
            const selected = value === p.id;
            return (
              <button key={p.id} onClick={() => onChange(selected ? "" : p.id)}
                className={`overflow-hidden rounded-lg border bg-white/5 text-left transition active:scale-[0.98] ${
                  selected ? `${ring} ring-2` : "border-white/10 hover:border-white/25"
                }`}>
                <div className={`h-0.5 w-full bg-gradient-to-r ${ui.panel}`} />
                <div className="p-2">
                  <div className="truncate text-sm font-bold">{p.name}</div>
                  <div className={`text-[10px] font-medium ${ui.text}`}>{REGIONS.find((r) => r.code === p.region)?.name}</div>
                  <div className="mt-1 flex items-center justify-between gap-1">
                    <span className="truncate text-[11px] text-slate-300">{p.ownerName ?? "未售出"}</span>
                    <span className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-bold ${ui.chipBg}`}>{LEVEL_TAG[p.level]}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
