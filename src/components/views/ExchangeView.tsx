"use client";

import { useState } from "react";
import { useSnapshot, postJson, ActionButton, TeamSelect } from "@/components/client";
import { Card, StickyTeam } from "@/components/Shell";
import { Num, PriceTag, LevelDots, EventBanner } from "@/components/ui";
import { REGIONS, REGION_UI, upgradeFee, type UndoRecipe } from "@/lib/game";

const LEVEL_TAG = ["已購", "1級", "2級", "3級"];

export function ExchangeView() {
  const { snap, mutate } = useSnapshot(2500);
  const [team, setTeam] = useState<number | "">("");
  const [discount, setDiscount] = useState(0);
  const [price, setPrice] = useState(0);
  const [region, setRegion] = useState<string>("AURORA");

  if (!snap) return <p className="text-sm text-slate-400">載入中…</p>;
  const teams = snap.teams;
  const props = snap.properties.filter((p) => p.region === region);

  const act = async (fn: () => Promise<{ [k: string]: unknown }>, ok: string) => {
    const r = await fn();
    await mutate();
    if (r.error) return String(r.error);
    return { message: ok, undo: r.undo as UndoRecipe | undefined };
  };

  return (
    <div className="space-y-4">
      <EventBanner events={snap.activeEvents} />

      <StickyTeam>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end sm:gap-3">
          <div className="col-span-2 sm:col-auto">
            <div className="mb-1 text-xs text-slate-400">作用小隊（購買 / 過戶目標）</div>
            <TeamSelect teams={teams} value={team} onChange={setTeam} />
          </div>
          <label className="text-xs text-slate-400">
            <div className="mb-1">折抵（光靈）</div>
            <input type="number" inputMode="numeric" value={discount} min={0}
              onChange={(e) => setDiscount(Number(e.target.value) || 0)} className="fld w-full sm:w-28" />
          </label>
          <label className="text-xs text-slate-400">
            <div className="mb-1">過戶價金</div>
            <input type="number" inputMode="numeric" value={price} min={0}
              onChange={(e) => setPrice(Number(e.target.value) || 0)} className="fld w-full sm:w-28" />
          </label>
        </div>
        <p className="mt-2 text-xs">
          {team === "" ? (
            <span className="text-amber-300/90">⚠ 尚未選擇作用小隊 — 購買 / 過戶前請先選隊</span>
          ) : (
            <span className="text-slate-300">
              目前作用：<b className="text-cyan-300">{teams.find((t) => t.id === team)?.name}</b>
              （光幣 <Num className="neon-gold">{teams.find((t) => t.id === team)?.coins}</Num>）
            </span>
          )}
        </p>
      </StickyTeam>

      {/* 不動產列表 */}
      <Card>
        <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 py-1.5">
          {REGIONS.map((r) => (
            <button key={r.code} onClick={() => setRegion(r.code)}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition ${
                region === r.code ? `bg-white/10 ${REGION_UI[r.code].text} ring-1 ${REGION_UI[r.code].border}` : "chip"
              }`}>
              {r.name}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {props.map((p) => {
            const fee = upgradeFee(p.basePrice, p.level);
            const buyPrice = Math.max(0, p.basePrice - discount);
            const ui = REGION_UI[region as keyof typeof REGION_UI];
            return (
              <div key={p.id} className={`overflow-hidden rounded-xl border border-white/10 bg-white/5`}>
                {/* Region accent bar */}
                <div className={`h-0.5 w-full bg-gradient-to-r ${ui.panel}`} />
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-bold">{p.name}</div>
                      <div className={`text-xs font-medium ${ui.text}`}>{p.type}</div>
                    </div>
                    <div className="shrink-0 text-right leading-tight">
                      <PriceTag current={p.currentValue} base={p.basePrice} />
                      <div className="text-[11px] text-slate-500">初始 <Num>{p.basePrice}</Num></div>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-1.5 text-sm">
                    {p.ownerName ? (
                      <>
                        <span className="truncate text-slate-300">{p.ownerName}</span>
                        <LevelDots level={p.level} />
                        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${ui.chipBg}`}>{LEVEL_TAG[p.level]}</span>
                      </>
                    ) : (
                      <span className="text-slate-500">未售出</span>
                    )}
                  </div>

                  <div className="mt-3 flex flex-col gap-2">
                    {!p.ownerTeamId && (
                      <ActionButton label={`購買  ${buyPrice}`} className="w-full btn-emerald"
                        disabled={team === ""}
                        onAction={() => team === "" ? Promise.resolve("請先選小隊") :
                          act(() => postJson("/api/exchange/buy", { propertyId: p.id, teamId: team, discount }), `已購買 ${p.name}`)} />
                    )}
                    {p.ownerTeamId && fee != null && (
                      <ActionButton label={`升級  ${Math.max(0, fee - discount)}`} className="w-full btn-amber"
                        onAction={() => act(() => postJson("/api/exchange/upgrade", { propertyId: p.id, discount }), `已升級 ${p.name}`)} />
                    )}
                    {p.ownerTeamId && (
                      <ActionButton label="過戶" className="w-full chip"
                        disabled={team === ""}
                        onAction={() => team === "" ? Promise.resolve("請先選目標隊") :
                          act(() => postJson("/api/exchange/transfer", { propertyId: p.id, toTeamId: team, price }), `已過戶 ${p.name}`)} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <LedgerCard />
    </div>
  );
}

function LedgerCard() {
  const [rows, setRows] = useState<{ id: number; teamName: string | null; kind: string; delta: number; note: string | null; reversed: boolean }[]>([]);
  const load = async () => setRows(await fetch("/api/ledger").then((r) => r.json()));
  return (
    <Card title="最近紀錄 / 沖銷">
      <button onClick={load} className="chip mb-2 px-3 py-1.5 text-sm">載入最近紀錄</button>
      <ul className="divide-y divide-white/10 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between py-1.5">
            <span className={r.reversed ? "text-slate-500 line-through" : ""}>
              #{r.id} {r.teamName ?? "—"}　{r.note}
              {r.delta !== 0 && <b className={r.delta > 0 ? "text-emerald-400" : "text-rose-400"}> {r.delta > 0 ? "+" : ""}{r.delta}</b>}
            </span>
            {!r.reversed && r.delta !== 0 && (
              <ActionButton label="沖銷" className="btn-rose"
                confirmText={`確定沖銷 #${r.id}？`}
                onAction={async () => { await postJson("/api/ledger/reverse", { ledgerId: r.id }); await load(); return "已沖銷"; }} />
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
