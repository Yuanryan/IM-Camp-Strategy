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

      <LoginLinksCard />
      <TeamEditor snap={snap} onChange={mutate} />
      <PropertyEditor snap={snap} onChange={mutate} />
      <CardEditor />
      <ItemEditor snap={snap} />
      <LedgerCard />
    </div>
  );
}

type TokenRow = {
  id: number;
  role: string;
  roleLabel: string;
  label: string;
  url: string;
  qr: string;
};

// 登入連結 / QR：列出所有角色與小隊的一鍵登入連結與 QR code。
// 現場若臨時要在新裝置登入某站別 / 某隊，可在此直接掃描或複製連結。
function LoginLinksCard() {
  const { data } = useSWR<{ tokens: TokenRow[] }>("/api/admin/tokens", fetcher);
  const [copied, setCopied] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [showQr, setShowQr] = useState(true);

  const copy = async (row: TokenRow) => {
    try {
      await navigator.clipboard.writeText(row.url);
      setCopied(row.id);
      setTimeout(() => setCopied((c) => (c === row.id ? null : c)), 1500);
    } catch {
      // clipboard 被擋（非 https / 權限）時忽略；使用者仍可手動選取連結
    }
  };

  // 一次複製整份清單：每列「角色 label<TAB>url」，方便貼到試算表或文件分發。
  const copyAll = async () => {
    if (!data) return;
    const text = data.tokens
      .map((r) => `${r.roleLabel} ${r.label}\t${r.url}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1500);
    } catch {
      // clipboard 被擋時忽略
    }
  };

  return (
    <Card
      title={
        <span className="flex items-center justify-between gap-2">
          <span>登入連結 / QR（各站別・各小隊）</span>
          <span className="flex gap-1.5">
            <button
              onClick={copyAll}
              disabled={!data}
              className={`rounded-lg px-2 py-1 text-xs transition disabled:opacity-40 ${
                copiedAll
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "chip hover:bg-white/20"
              }`}
            >
              {copiedAll ? "已複製全部" : "複製全部"}
            </button>
            <button
              onClick={() => setShowQr((s) => !s)}
              className="chip px-2 py-1 text-xs hover:bg-white/20"
            >
              {showQr ? "隱藏 QR" : "顯示 QR"}
            </button>
          </span>
        </span>
      }
    >
      <p className="mb-3 text-xs text-amber-300/80">
        ⚠️ 這些連結可直接以該身分登入（含其他關主 / 各隊），請勿外流或投影給玩家。
      </p>
      {!data ? (
        <p className="text-sm text-slate-400">載入中…</p>
      ) : (
        <div className="space-y-4">
          <TokenSection
            heading="關主 / 站別"
            rows={data.tokens.filter((r) => r.role !== "TEAM")}
            showQr={showQr}
            copied={copied}
            onCopy={copy}
          />
          <TokenSection
            heading="小隊"
            rows={data.tokens.filter((r) => r.role === "TEAM")}
            showQr={showQr}
            copied={copied}
            onCopy={copy}
          />
        </div>
      )}
    </Card>
  );
}

// 一個分組（關主 / 小隊）：標題 + 該組的 token 卡片格。組內無資料則整段不顯示。
function TokenSection({
  heading,
  rows,
  showQr,
  copied,
  onCopy,
}: {
  heading: string;
  rows: TokenRow[];
  showQr: boolean;
  copied: number | null;
  onCopy: (row: TokenRow) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
        {heading}
        <span className="ml-1.5 font-normal text-slate-600">（{rows.length}）</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {rows.map((row) => (
          <TokenTile key={row.id} row={row} showQr={showQr} copied={copied} onCopy={onCopy} />
        ))}
      </div>
    </div>
  );
}

// 單一 token 卡片：身分標籤 + QR + 開啟 / 複製。
function TokenTile({
  row,
  showQr,
  copied,
  onCopy,
}: {
  row: TokenRow;
  showQr: boolean;
  copied: number | null;
  onCopy: (row: TokenRow) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-2.5">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-slate-500">
          {row.roleLabel}
        </div>
        <div className="truncate text-sm font-semibold text-slate-100">{row.label}</div>
      </div>
      {showQr && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={row.qr}
          alt={`${row.label} 登入 QR`}
          className="aspect-square w-full rounded-lg bg-white p-1"
        />
      )}
      <div className="mt-auto flex gap-1.5">
        <a
          href={row.url}
          target="_blank"
          rel="noreferrer"
          className="chip flex-1 px-2 py-1 text-center text-xs hover:bg-white/20"
        >
          開啟 ↗
        </a>
        <button
          onClick={() => onCopy(row)}
          className={`flex-1 rounded-lg px-2 py-1 text-xs transition ${
            copied === row.id
              ? "bg-emerald-500/20 text-emerald-300"
              : "chip hover:bg-white/20"
          }`}
        >
          {copied === row.id ? "已複製" : "複製"}
        </button>
      </div>
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
