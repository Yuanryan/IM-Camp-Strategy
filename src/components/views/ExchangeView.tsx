"use client";

import { useState } from "react";
import { useSnapshot, postJson, ActionButton, TeamSelect } from "@/components/client";
import { Card, StickyTeam } from "@/components/Shell";
import { Num, PriceTag, LevelDots, EventBanner, TeamItemBadges, MonopolyBadges, TurnCompleteBar } from "@/components/ui";
import { LEVEL_TAG, type PropView } from "@/components/views/PropertyGrid";
import { REGIONS, REGION_UI, EffectType, upgradeFee, applyShopPrice, stackEffects, roundTo10, type UndoRecipe } from "@/lib/game";

// 按鈕價格標籤：有動產折扣時，原價刪除線顯示在右側
function PriceLabel({ prefix, final, base }: { prefix: string; final: number; base: number }) {
  if (final === base) return <>{prefix}  {final}</>;
  return (
    <>
      {prefix}  {final}
      <s className="ml-1.5 opacity-60">{base}</s>
    </>
  );
}

export function ExchangeView({
  team: teamProp,
  setTeam: setTeamProp,
  region: regionProp,
  setRegion: setRegionProp,
  turnMode = false,
  onComplete,
}: {
  team?: number | "";
  setTeam?: (id: number | "") => void;
  region?: string;
  setRegion?: (r: string) => void;
  // 地圖回合操作：顯示「完成」鈕，累計本回合購買 / 升級支出（負值）並回報。
  turnMode?: boolean;
  onComplete?: (delta: number) => void;
} = {}) {
  const { snap, mutate } = useSnapshot(2500);
  // 受控（由 MapView 共用 team）或自管（/exchange 獨立頁）
  const [teamInner, setTeamInner] = useState<number | "">("");
  const team = teamProp ?? teamInner;
  const setTeam = setTeamProp ?? setTeamInner;
  const [discount, setDiscount] = useState(0);
  // 本回合累計購買 / 升級支出（負值）；按「完成」時併入地圖階段 2。
  const [turnDelta, setTurnDelta] = useState(0);
  // 受控（由 MapView / 真實地圖預選區域）或自管
  const [regionInner, setRegionInner] = useState<string>("AURORA");
  const region = regionProp ?? regionInner;
  const setRegion = setRegionProp ?? setRegionInner;

  if (!snap) return <p className="text-sm text-slate-400">載入中…</p>;
  const teams = snap.teams;
  const cur = teams.find((t) => t.id === team);
  const props = snap.properties.filter((p) => p.region === region);

  // 某隊的 SHOP_PRICE 折扣 delta（與 service.buyProperty / upgradeProperty 一致）
  const shopDeltaFor = (teamId: number | null | undefined) => {
    if (teamId == null) return 0;
    const items = teams.find((t) => t.id === teamId)?.items ?? [];
    return stackEffects(
      items.filter((i) => i.effectType === EffectType.SHOP_PRICE).map((i) => i.effectValue),
    );
  };

  // spent：本次操作對作用隊的支出（>0），回合操作時累計為負；功能卡等不傳則不計。
  const act = async (fn: () => Promise<{ [k: string]: unknown }>, ok: string, spent?: number) => {
    const r = await fn();
    await mutate();
    if (r.error) return String(r.error);
    if (turnMode && spent) setTurnDelta((d) => d - spent);
    return { message: ok, undo: r.undo as UndoRecipe | undefined };
  };

  return (
    <div className="space-y-4">
      <EventBanner events={snap.activeEvents} />

      <StickyTeam>
        <div className="flex flex-wrap items-center gap-3">
          <TeamSelect teams={teams} value={team} onChange={setTeam} />
          {cur ? (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-400">
                光幣 <Num className="neon-gold font-bold">{cur.coins}</Num>
              </span>
            </div>
          ) : (
            <span className="text-xs text-amber-300/80">⚠ 請先選擇小隊</span>
          )}
        </div>
        <TeamItemBadges
          items={cur?.items ?? []}
          relevantTypes={[EffectType.SHOP_PRICE, EffectType.PROPERTY_VALUE]}
        />
        <MonopolyBadges
          regions={cur?.monopolyRegions ?? []}
          effects={["UPGRADE_BOOST"]}
          settings={snap.settings}
        />
      </StickyTeam>

      {/* 不動產列表 */}
      <Card>
        <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 py-1.5">
          {REGIONS.map((r) => (
            <button key={r.code} onClick={() => setRegion(r.code)}
              disabled={turnMode && r.code !== region}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition ${
                region === r.code ? `bg-white/10 ${REGION_UI[r.code].text} ring-1 ${REGION_UI[r.code].border}` : "chip"
              } disabled:opacity-30 disabled:cursor-not-allowed`}>
              {r.name}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {props.map((p) => {
            // 採用受事件影響的現價（currentValue），與後端 buyProperty / upgradeProperty 一致
            const fee = upgradeFee(p.currentValue, p.level);
            // 購買計價：未開發地用 currentValue；已開發地（賣回後保留 level）用 investedValue，與後端 buyProperty 一致。
            const buyMarket = p.level > 0 ? roundTo10(p.investedValue) : p.currentValue;
            // 購買：用選定隊（買方）的折扣；升級：用持有隊的折扣（與後端一致）
            const buyBase = Math.max(0, buyMarket - discount);
            const buyPrice = applyShopPrice(buyMarket - discount, shopDeltaFor(team === "" ? null : team));
            const upgradeBase = fee != null ? Math.max(0, fee - discount) : null;
            const upgradePrice = fee != null ? applyShopPrice(fee - discount, shopDeltaFor(p.ownerTeamId)) : null;
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
                      {p.ownerTeamId != null || p.level > 0 ? (
                        // 有主＝持有現值/賣回值；無主但已開發（賣回保留 level）＝承接買價，兩者皆為 investedValue。
                        <>
                          <PriceTag current={roundTo10(p.investedValue)} base={p.basePrice} />
                          <div className="text-[11px] text-slate-500">{p.ownerTeamId != null ? "持有現值・賣回值" : "承接價（含開發）"}</div>
                        </>
                      ) : (
                        <>
                          <PriceTag current={p.currentValue} base={p.basePrice} />
                          <div className="text-[11px] text-slate-500">初始 <Num>{p.basePrice}</Num></div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-1.5 text-sm">
                    {p.ownerName ? (
                      <>
                        <span className="truncate text-slate-300">{p.ownerName}</span>
                        <LevelDots level={p.level} />
                        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${ui.chipBg}`}>{LEVEL_TAG[p.level]}</span>
                      </>
                    ) : p.level > 0 ? (
                      // 無主但已開發（賣回保留等級）：標「未售出」並顯示保留的等級，讓關主看出承接的是幾級房。
                      <>
                        <span className="text-slate-500">未售出</span>
                        <LevelDots level={p.level} />
                        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${ui.chipBg}`}>{LEVEL_TAG[p.level]}</span>
                      </>
                    ) : (
                      <span className="text-slate-500">未售出</span>
                    )}
                  </div>

                  <div className="mt-3 flex flex-col gap-2">
                    {!p.ownerTeamId && (
                      <ActionButton
                        label={<PriceLabel prefix="購買" final={buyPrice} base={buyBase} />}
                        className="w-full btn-emerald"
                        disabled={team === ""}
                        onAction={() => team === "" ? Promise.resolve("請先選小隊") :
                          act(() => postJson("/api/exchange/buy", { propertyId: p.id, teamId: team, discount }), `已購買 ${p.name}`, buyPrice)} />
                    )}
                    {p.ownerTeamId === team && fee != null && upgradePrice != null && upgradeBase != null && (
                      <ActionButton
                        label={<PriceLabel prefix="升級" final={upgradePrice} base={upgradeBase} />}
                        className="w-full btn-amber"
                        onAction={() => act(() => postJson("/api/exchange/upgrade", { propertyId: p.id, discount }), `已升級 ${p.name}`, upgradePrice)} />
                    )}
                    {p.ownerTeamId === team && fee == null && (
                      <ActionButton label="已升至最高級" className="w-full chip" disabled
                        onAction={() => Promise.resolve()} />
                    )}
                    {p.ownerTeamId != null && p.ownerTeamId !== team && (
                      <ActionButton label="已售出" className="w-full chip" disabled
                        onAction={() => Promise.resolve()} />
                    )}
                    {p.ownerTeamId === team && (
                      <ActionButton
                        label={<>賣回交易所（+<Num>{roundTo10(p.investedValue)}</Num>）</>}
                        className="w-full btn-rose"
                        confirmText={`確定賣回 ${p.name}？\n賣價：${roundTo10(p.investedValue)} 光幣（投入本金現值）`}
                        onAction={() => act(() => postJson("/api/exchange/card", { action: "sellProperty", propertyId: p.id }), `已賣回 ${p.name}`)} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* <LedgerCard /> */}

      {turnMode && onComplete && <TurnCompleteBar delta={turnDelta} onComplete={onComplete} />}
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
