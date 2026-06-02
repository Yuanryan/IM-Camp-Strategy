"use client";

import { useState } from "react";
import { useSnapshot, postJson, ActionButton, TeamSelect } from "@/components/client";
import { Card } from "@/components/Shell";
import { Num, PriceTag, LevelDots, EventBanner } from "@/components/ui";
import { REGIONS, REGION_UI, upgradeFee } from "@/lib/game";

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
    return r.error ? String(r.error) : ok;
  };

  return (
    <div className="space-y-4">
      <EventBanner events={snap.activeEvents} />

      {/* 作用對象 */}
      <Card title="作用對象（購買 / 過戶目標隊、過路費付款隊）">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <div className="mb-1 text-xs text-slate-400">小隊</div>
            <TeamSelect teams={teams} value={team} onChange={setTeam} />
          </div>
          <label className="text-xs text-slate-400">
            <div className="mb-1">購買/升級折抵（光靈）</div>
            <input type="number" value={discount} min={0}
              onChange={(e) => setDiscount(Number(e.target.value) || 0)} className="fld w-28" />
          </label>
          <label className="text-xs text-slate-400">
            <div className="mb-1">過戶價金（買方付賣方）</div>
            <input type="number" value={price} min={0}
              onChange={(e) => setPrice(Number(e.target.value) || 0)} className="fld w-28" />
          </label>
        </div>
        {team !== "" && (
          <p className="mt-2 text-xs text-slate-400">
            目前作用：{teams.find((t) => t.id === team)?.name}（光幣 <Num className="neon-gold">{teams.find((t) => t.id === team)?.coins}</Num>）
          </p>
        )}
      </Card>

      {/* 不動產列表 */}
      <Card>
        <div className="mb-3 flex flex-wrap gap-2">
          {REGIONS.map((r) => (
            <button key={r.code} onClick={() => setRegion(r.code)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                region === r.code ? `bg-white/10 ${REGION_UI[r.code].text} ring-1 ${REGION_UI[r.code].border}` : "chip"
              }`}>
              {r.name}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr>
                <th className="py-1">不動產</th><th>類型</th><th>初始價</th><th>現價</th>
                <th>持有 / 等級</th><th className="text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {props.map((p) => {
                const fee = upgradeFee(p.basePrice, p.level);
                const buyPrice = Math.max(0, p.basePrice - discount);
                return (
                  <tr key={p.id}>
                    <td className="py-2 font-medium">{p.name}</td>
                    <td className="text-slate-400">{p.type}</td>
                    <td><Num className="text-slate-400">{p.basePrice}</Num></td>
                    <td><PriceTag current={p.currentValue} base={p.basePrice} /></td>
                    <td>
                      {p.ownerName ? (
                        <span className="flex items-center gap-1.5">{p.ownerName}<LevelDots level={p.level} /><span className="chip px-1.5 text-xs">{LEVEL_TAG[p.level]}</span></span>
                      ) : (
                        <span className="text-slate-500">未售出</span>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        {!p.ownerTeamId && (
                          <ActionButton label={`購買 ${buyPrice}`} className="bg-emerald-600 text-white hover:bg-emerald-500"
                            disabled={team === ""}
                            onAction={() => team === "" ? Promise.resolve("請先選小隊") :
                              act(() => postJson("/api/exchange/buy", { propertyId: p.id, teamId: team, discount }), `已購買 ${p.name}`)} />
                        )}
                        {p.ownerTeamId && fee != null && (
                          <ActionButton label={`升級 ${Math.max(0, fee - discount)}`} className="bg-amber-500 text-white hover:bg-amber-400"
                            onAction={() => act(() => postJson("/api/exchange/upgrade", { propertyId: p.id, discount }), `已升級 ${p.name}`)} />
                        )}
                        {p.ownerTeamId && (
                          <ActionButton label="過戶" className="chip hover:bg-white/20"
                            disabled={team === ""}
                            onAction={() => team === "" ? Promise.resolve("請先選目標隊") :
                              act(() => postJson("/api/exchange/transfer", { propertyId: p.id, toTeamId: team, price }), `已過戶 ${p.name}`)} />
                        )}
                        {p.ownerTeamId && (
                          <ActionButton label="收過路費" className="bg-sky-600 text-white hover:bg-sky-500"
                            disabled={team === ""}
                            onAction={() => team === "" ? Promise.resolve("請先選付款隊") :
                              act(() => postJson("/api/exchange/toll", { propertyId: p.id, payerTeamId: team }), "已收過路費")} />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          收過路費：選好「付款隊」後，點該隊踩到的資本據點，系統會依該區獨佔隊伍與現值自動算金額。
        </p>
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
              <ActionButton label="沖銷" className="bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                confirmText={`確定沖銷 #${r.id}？`}
                onAction={async () => { await postJson("/api/ledger/reverse", { ledgerId: r.id }); await load(); return "已沖銷"; }} />
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
