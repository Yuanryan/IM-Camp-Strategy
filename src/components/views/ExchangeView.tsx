"use client";

import { useState } from "react";
import { useSnapshot, postJson, ActionButton, TeamSelect } from "@/components/client";
import { Card } from "@/components/Shell";
import { REGIONS, upgradeFee } from "@/lib/game";

const LEVEL_TAG = ["已購", "1級", "2級", "3級"];

export function ExchangeView() {
  const { snap, mutate } = useSnapshot(2500);
  const [team, setTeam] = useState<number | "">("");
  const [discount, setDiscount] = useState(0);
  const [price, setPrice] = useState(0);
  const [region, setRegion] = useState<string>("AURORA");

  if (!snap) return <p className="text-sm text-zinc-500">載入中…</p>;
  const teams = snap.teams;
  const props = snap.properties.filter((p) => p.region === region);

  const act = async (fn: () => Promise<{ [k: string]: unknown }>, ok: string) => {
    const r = await fn();
    await mutate();
    return r.error ? String(r.error) : ok;
  };

  return (
    <div className="space-y-4">
      {/* 作用對象 */}
      <Card title="作用對象（購買 / 過戶目標隊、過路費付款隊）">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <div className="mb-1 text-xs text-zinc-400">小隊</div>
            <TeamSelect teams={teams} value={team} onChange={setTeam} />
          </div>
          <label className="text-xs text-zinc-400">
            <div className="mb-1">購買/升級折抵（光靈）</div>
            <input type="number" value={discount} min={0}
              onChange={(e) => setDiscount(Number(e.target.value) || 0)}
              className="w-28 rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
          </label>
          <label className="text-xs text-zinc-400">
            <div className="mb-1">過戶價金（買方付賣方）</div>
            <input type="number" value={price} min={0}
              onChange={(e) => setPrice(Number(e.target.value) || 0)}
              className="w-28 rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
          </label>
        </div>
        {team !== "" && (
          <p className="mt-2 text-xs text-zinc-500">
            目前作用：{teams.find((t) => t.id === team)?.name}（光幣 {teams.find((t) => t.id === team)?.coins}）
          </p>
        )}
      </Card>

      {/* 不動產列表 */}
      <Card>
        <div className="mb-3 flex gap-2">
          {REGIONS.map((r) => (
            <button key={r.code} onClick={() => setRegion(r.code)}
              className={`rounded-lg px-3 py-1.5 text-sm ${region === r.code ? "bg-zinc-900 text-white" : "bg-zinc-100"}`}>
              {r.name}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-zinc-400">
              <tr>
                <th className="py-1">不動產</th><th>類型</th><th>初始價</th><th>現價</th>
                <th>持有 / 等級</th><th className="text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {props.map((p) => {
                const fee = upgradeFee(p.basePrice, p.level);
                const buyPrice = Math.max(0, p.basePrice - discount);
                return (
                  <tr key={p.id}>
                    <td className="py-2 font-medium">{p.name}</td>
                    <td className="text-zinc-500">{p.type}</td>
                    <td className="tabular-nums">{p.basePrice}</td>
                    <td className="font-semibold tabular-nums">{p.currentValue}</td>
                    <td>
                      {p.ownerName ? (
                        <span>{p.ownerName}<span className="ml-1 rounded bg-zinc-100 px-1.5 text-xs">{LEVEL_TAG[p.level]}</span></span>
                      ) : (
                        <span className="text-zinc-400">未售出</span>
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
                          <ActionButton label={`升級 ${Math.max(0, fee - discount)}`} className="bg-amber-600 text-white hover:bg-amber-500"
                            onAction={() => act(() => postJson("/api/exchange/upgrade", { propertyId: p.id, discount }), `已升級 ${p.name}`)} />
                        )}
                        {p.ownerTeamId && (
                          <ActionButton label="過戶" className="bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
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
        <p className="mt-2 text-xs text-zinc-400">
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
      <button onClick={load} className="mb-2 rounded-lg bg-zinc-100 px-3 py-1.5 text-sm">載入最近紀錄</button>
      <ul className="divide-y divide-zinc-100 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between py-1.5">
            <span className={r.reversed ? "text-zinc-400 line-through" : ""}>
              #{r.id} {r.teamName ?? "—"}　{r.note}
              {r.delta !== 0 && <b className={r.delta > 0 ? "text-emerald-600" : "text-red-600"}>{r.delta > 0 ? "+" : ""}{r.delta}</b>}
            </span>
            {!r.reversed && r.delta !== 0 && (
              <ActionButton label="沖銷" className="bg-red-100 text-red-700 hover:bg-red-200"
                confirmText={`確定沖銷 #${r.id}？`}
                onAction={async () => { await postJson("/api/ledger/reverse", { ledgerId: r.id }); await load(); return "已沖銷"; }} />
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
