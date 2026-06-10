"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher, useSnapshot, postJson, ActionButton } from "@/components/client";
import { Card } from "@/components/Shell";
import { Num, AssetPicker } from "@/components/ui";
import { REGIONS, REGION_UI, EFFECT_TYPE_LABELS, ITEM_GRADE_COLORS } from "@/lib/game";
import type { Snapshot } from "@/lib/snapshot";

const STATION_LINKS = [
  ["主持人控台", "/host"],
  ["交易所", "/exchange"],
  ["地圖關主", "/map"],
  ["流動關主", "/mobile"],
  ["卡牌商店", "/shop"],
  ["大樂透", "/lottery"],
  ["投影", "/projection"],
];

export function AdminView() {
  const { snap, mutate } = useSnapshot(3000);
  if (!snap) return <p className="text-sm text-slate-400">載入中…</p>;

  return (
    <div className="space-y-4">
      <Card title="各關主頁面（可直接開啟檢視）">
        <div className="flex flex-wrap gap-2">
          {STATION_LINKS.map(([label, href]) => (
            <a key={href} href={href} target="_blank" className="chip px-3 py-1.5 text-sm hover:bg-white/20">{label} ↗</a>
          ))}
        </div>
      </Card>

      <TeamEditor snap={snap} onChange={mutate} />
      <PropertyEditor snap={snap} onChange={mutate} />
      <CardEditor />
      <ItemEditor snap={snap} />
      <LedgerCard />
    </div>
  );
}

function TeamEditor({ snap, onChange }: { snap: Snapshot; onChange: () => void }) {
  return (
    <Card title="小隊（賽前布置 / 平衡）">
      <div className="space-y-2">
        {snap.teams.map((t) => <TeamRow key={t.id} team={t} onChange={onChange} />)}
      </div>
    </Card>
  );
}

function TeamRow({ team, onChange }: { team: Snapshot["teams"][number]; onChange: () => void }) {
  const [name, setName] = useState(team.name);
  const [coins, setCoins] = useState(team.coins);
  const [points, setPoints] = useState(team.cardPoints);
  return (
    <div className="flex flex-wrap items-end gap-2 border-b border-white/10 pb-2">
      <input value={name} onChange={(e) => setName(e.target.value)} className="fld w-28" />
      <label className="text-xs text-slate-400">光幣<input type="number" inputMode="numeric" value={coins} onChange={(e) => setCoins(Number(e.target.value) || 0)} className="fld ml-1 w-24" /></label>
      <label className="text-xs text-slate-400">點數<input type="number" inputMode="numeric" value={points} onChange={(e) => setPoints(Number(e.target.value) || 0)} className="fld ml-1 w-20" /></label>
      <span className="text-xs text-slate-400">淨資產 <Num>{team.netWorth}</Num></span>
      <ActionButton label="儲存"
        onAction={async () => { await postJson("/api/admin/team", { teamId: team.id, name, coins, cardPoints: points }); onChange(); return "已儲存"; }} />
    </div>
  );
}

function PropertyEditor({ snap, onChange }: { snap: Snapshot; onChange: () => void }) {
  const [region, setRegion] = useState("AURORA");
  const props = snap.properties.filter((p) => p.region === region);
  return (
    <Card title="不動產（直接指定持有 / 等級）">
      <div className="mb-3 flex flex-wrap gap-2">
        {REGIONS.map((r) => (
          <button key={r.code} onClick={() => setRegion(r.code)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${region === r.code ? `bg-white/10 ${REGION_UI[r.code].text} ring-1 ${REGION_UI[r.code].border}` : "chip"}`}>{r.name}</button>
        ))}
      </div>
      <div className="space-y-1.5">
        {props.map((p) => <PropRow key={p.id} prop={p} teams={snap.teams} onChange={onChange} />)}
      </div>
    </Card>
  );
}

function PropRow({ prop, teams, onChange }: { prop: Snapshot["properties"][number]; teams: Snapshot["teams"]; onChange: () => void }) {
  const [owner, setOwner] = useState<string>(prop.ownerTeamId ? String(prop.ownerTeamId) : "");
  const [level, setLevel] = useState(prop.level);
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="w-28 font-medium">{prop.name}</span>
      <span className="w-16 text-xs text-slate-500">{prop.type}</span>
      <span className="w-16 text-xs text-slate-400">現價<Num>{prop.currentValue}</Num></span>
      <select value={owner} onChange={(e) => setOwner(e.target.value)} className="fld px-2 py-1">
        <option value="">未售出</option>
        {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      <select value={level} onChange={(e) => setLevel(Number(e.target.value))} className="fld px-2 py-1">
        {[0, 1, 2, 3].map((l) => <option key={l} value={l}>{l}級</option>)}
      </select>
      <ActionButton label="儲存" className="chip hover:bg-white/20"
        onAction={async () => { await postJson("/api/admin/property", { propertyId: prop.id, ownerTeamId: owner === "" ? null : Number(owner), level }); onChange(); return "已儲存"; }} />
    </div>
  );
}

function CardEditor() {
  const { data, mutate } = useSWR<{ type: string; cost: number; remaining: number; effect: string }[]>("/api/admin/card", fetcher);
  if (!data) return null;
  return (
    <Card title="功能卡（點數成本 / 庫存）">
      <div className="space-y-1.5">
        {data.map((c) => <CardRow key={c.type} card={c} onChange={mutate} />)}
      </div>
    </Card>
  );
}

function CardRow({ card, onChange }: { card: { type: string; cost: number; remaining: number }; onChange: () => void }) {
  const [cost, setCost] = useState(card.cost);
  const [remaining, setRemaining] = useState(card.remaining);
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="w-28 font-medium">{card.type}</span>
      <label className="text-xs text-slate-400">點數<input type="number" inputMode="numeric" value={cost} onChange={(e) => setCost(Number(e.target.value) || 0)} className="fld ml-1 w-20" /></label>
      <label className="text-xs text-slate-400">庫存<input type="number" inputMode="numeric" value={remaining} onChange={(e) => setRemaining(Number(e.target.value) || 0)} className="fld ml-1 w-20" /></label>
      <ActionButton label="儲存" className="chip hover:bg-white/20"
        onAction={async () => { await postJson("/api/admin/card", { type: card.type, cost, remaining }); onChange(); return "已儲存"; }} />
    </div>
  );
}

type AssetTemplate = { id: number; name: string; grade: string; effectType: string; effectValue: number; description: string };
type AdminItem = { id: number; teamId: number; teamName: string; assetId: number; assetName: string; grade: string; effectType: string; effectValue: number; description: string; hiddenValue: number; active: boolean; note: string | null; obtainedAt: string };

function ItemEditor({ snap }: { snap: Snapshot }) {
  const { data: assets, isLoading: aLoading } = useSWR<AssetTemplate[]>("/api/items", fetcher);
  const { data: items, mutate } = useSWR<AdminItem[]>("/api/admin/items", fetcher);

  const [gTeam, setGTeam]   = useState<number | "">("");
  const [gAsset, setGAsset] = useState<number | "">("");
  const [gHidden, setGHidden] = useState(0);
  const [gNote, setGNote]   = useState("");

  const [xItem, setXItem]   = useState<number | "">("");
  const [xTeam, setXTeam]   = useState<number | "">("");

  return (
    <Card title="動產管理">
      {/* 授予 */}
      <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="mb-2 text-xs font-semibold text-slate-300">授予動產給小隊</div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-slate-400">
            <div className="mb-1">小隊</div>
            <select value={gTeam} onChange={(e) => setGTeam(e.target.value ? Number(e.target.value) : "")} className="fld min-w-28">
              <option value="">選擇小隊</option>
              {snap.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <label className="min-w-0 flex-1 text-xs text-slate-400">
            <div className="mb-1">動產</div>
            <AssetPicker assets={assets ?? []} value={gAsset} onChange={setGAsset} />
          </label>
          <label className="text-xs text-slate-400">
            <div className="mb-1">秘密幣值</div>
            <input type="number" inputMode="numeric" value={gHidden} onChange={(e) => setGHidden(Number(e.target.value) || 0)} className="fld w-24" />
          </label>
          <label className="text-xs text-slate-400">
            <div className="mb-1">備註</div>
            <input value={gNote} onChange={(e) => setGNote(e.target.value)} className="fld w-36" placeholder="例：光源點獎勵" />
          </label>
          <ActionButton label="授予" className="btn-emerald"
            disabled={gTeam === "" || gAsset === ""}
            onAction={async () => {
              await postJson("/api/items/grant", { teamId: gTeam, assetId: gAsset, hiddenValue: gHidden, note: gNote || undefined });
              mutate();
              return "已授予";
            }} />
        </div>
        {gAsset !== "" && assets && (
          <p className="mt-2 text-xs text-slate-400">
            {assets.find((a) => a.id === gAsset)?.description}
          </p>
        )}
      </div>

      {/* 過戶（admin） */}
      <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="mb-2 text-xs font-semibold text-slate-300">動產過戶（Admin）</div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-slate-400">
            <div className="mb-1">動產 ID</div>
            <input type="number" inputMode="numeric" value={xItem} onChange={(e) => setXItem(e.target.value ? Number(e.target.value) : "")} className="fld w-20" placeholder="ID" />
          </label>
          <label className="text-xs text-slate-400">
            <div className="mb-1">目標小隊</div>
            <select value={xTeam} onChange={(e) => setXTeam(e.target.value ? Number(e.target.value) : "")} className="fld min-w-28">
              <option value="">選擇小隊</option>
              {snap.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <ActionButton label="過戶" className="chip hover:bg-white/20"
            disabled={xItem === "" || xTeam === ""}
            onAction={async () => {
              await postJson("/api/items/transfer", { itemId: xItem, toTeamId: xTeam });
              mutate();
              return "已過戶";
            }} />
        </div>
      </div>

      {/* 動產一覽（含秘密幣值） */}
      <div className="text-xs font-semibold text-slate-300 mb-2">所有動產（含秘密幣值）</div>
      {!items ? (
        <p className="text-xs text-slate-500">載入中…</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-slate-500">尚未授予任何動產</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((item) => (
            <div key={item.id} className={`flex flex-wrap items-center gap-2 rounded-lg border px-2 py-1.5 text-sm ${item.active ? "" : "opacity-40"} ${ITEM_GRADE_COLORS[item.grade] ?? ""}`}>
              <span className="font-bold text-[11px] w-4">#{item.id}</span>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold border ${ITEM_GRADE_COLORS[item.grade] ?? "chip"}`}>{item.grade}</span>
              <span className="font-semibold w-28 truncate">{item.assetName}</span>
              <span className="text-xs text-slate-400 w-24 truncate">{item.teamName}</span>
              <span className="text-xs text-slate-400">{EFFECT_TYPE_LABELS[item.effectType as keyof typeof EFFECT_TYPE_LABELS] ?? item.effectType}</span>
              <span className={`text-xs font-mono ${item.effectValue >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {item.effectType === "COINS_PER_ROUND" ? `+${item.effectValue}光幣/輪` : `${item.effectValue >= 0 ? "+" : ""}${(item.effectValue * 100).toFixed(0)}%`}
              </span>
              <span className="text-amber-300 text-xs font-mono">幣值:{item.hiddenValue}</span>
              {item.note && <span className="text-xs text-slate-500 italic">{item.note}</span>}
              {item.active && (
                <ActionButton label="失效" className="btn-rose ml-auto"
                  confirmText={`確定讓「${item.assetName}」失效？`}
                  onAction={async () => {
                    await postJson("/api/items/deactivate", { itemId: item.id });
                    mutate();
                    return "已失效";
                  }} />
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function LedgerCard() {
  const { data, mutate } = useSWR<{ id: number; teamName: string | null; kind: string; delta: number; note: string | null; byToken: string | null; reversed: boolean }[]>("/api/ledger", fetcher, { refreshInterval: 5000 });
  return (
    <Card title="總帳 / 沖銷（最近 60 筆）">
      <ul className="divide-y divide-white/10 text-sm">
        {data?.map((r) => (
          <li key={r.id} className="flex items-center justify-between py-1.5">
            <span className={r.reversed ? "text-slate-500 line-through" : ""}>
              #{r.id} {r.teamName ?? "—"}　{r.note}
              {r.delta !== 0 && <b className={r.delta > 0 ? "text-emerald-400" : "text-rose-400"}> {r.delta > 0 ? "+" : ""}{r.delta}</b>}
              <span className="ml-1 text-xs text-slate-500">{r.byToken}</span>
            </span>
            {!r.reversed && r.delta !== 0 && (
              <ActionButton label="沖銷" className="btn-rose"
                confirmText={`沖銷 #${r.id}？`}
                onAction={async () => { await postJson("/api/ledger/reverse", { ledgerId: r.id }); mutate(); return "已沖銷"; }} />
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
