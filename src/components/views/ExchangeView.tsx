"use client";

import { useState } from "react";
import { useSnapshot, postJson, ActionButton, TeamSelect } from "@/components/client";
import { Card, StickyTeam } from "@/components/Shell";
import { Num, PriceTag, LevelDots, EventBanner, TeamItemBadges, HudTabs, TurnCompleteBar } from "@/components/ui";
import { REGIONS, REGION_UI, EffectType, upgradeFee, applyShopPrice, stackEffects, roundTo10, type UndoRecipe } from "@/lib/game";
import { Building2, Sword, TrendingUp } from "lucide-react";

const LEVEL_TAG = ["0級", "1級", "2級", "3級"];

// 快照不動產的精簡型別（PropertyPicker / 功能卡分頁共用）
type PropView = {
  id: number; name: string; region: string; level: number;
  ownerTeamId: number | null; ownerName: string | null; basePrice: number;
  currentValue: number; investedValue: number;
};

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
  const [tab, setTab] = useState<"props" | "cards" | "market">("props");
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
      <HudTabs
        active={tab}
        onChange={setTab}
        tabs={[
          ["props", "不動產", <Building2 key="p" className="h-4 w-4" />],
          ["cards", "功能卡", <Sword key="c" className="h-4 w-4" />],
          ["market", "市場卡", <TrendingUp key="m" className="h-4 w-4" />],
        ] as const}
      />

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
      </StickyTeam>

      {tab === "cards" && <CardActions properties={snap.properties} teams={teams} actorTeam={team} act={act} />}
      {tab === "market" && <MarketCardActions properties={snap.properties} teams={teams} actorTeam={team} act={act} settings={snap.settings} />}

      {/* 不動產列表 */}
      {tab === "props" && (
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
            // 購買：用選定隊（買方）的折扣；升級：用持有隊的折扣（與後端一致）
            const buyBase = Math.max(0, p.currentValue - discount);
            const buyPrice = applyShopPrice(p.currentValue - discount, shopDeltaFor(team === "" ? null : team));
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
      )}

      {/* <LedgerCard /> */}

      {turnMode && onComplete && <TurnCompleteBar delta={turnDelta} onComplete={onComplete} />}
    </div>
  );
}

// ── 功能卡分頁 ──────────────────────────────────────────────
type ActFn = (fn: () => Promise<{ [k: string]: unknown }>, ok: string) => Promise<string | { message: string; undo?: UndoRecipe }>;

// 點選式不動產選擇器：直接點視覺 tile 選取（選中高亮）。上方保留區域 + 持有隊輕量篩選。
function PropertyGrid({
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

type CardKind = "seizeLand" | "swapLand" | "swapHouse" | "demolish" | "monster";
const CARD_META: { key: CardKind; name: string; desc: string; needsActor: boolean; pickers: "single" | "dual" }[] = [
  { key: "seizeLand", name: "購地卡", desc: "強制收購對手一塊地（對手獲初始價 8 折補償，產權含等級轉給作用隊）", needsActor: true, pickers: "single" },
  { key: "swapLand", name: "換地卡", desc: "互換自己與對手的土地", needsActor: true, pickers: "dual" },
  { key: "swapHouse", name: "換屋卡", desc: "兩棟房屋互換升級級別（產權不變）", needsActor: true, pickers: "dual" },
  { key: "demolish", name: "拆屋卡", desc: "降低對手一棟房屋等級一級", needsActor: false, pickers: "single" },
  { key: "monster", name: "怪獸卡", desc: "摧毀對手一棟房屋，降回未購買", needsActor: false, pickers: "single" },
];

function CardActions({
  properties, teams, actorTeam, act,
}: {
  properties: PropView[];
  teams: { id: number; name: string; coins: number; items?: { effectType: string }[] }[];
  actorTeam: number | "";
  act: ActFn;
}) {
  const [card, setCard] = useState<CardKind | "">("");
  const [src, setSrc] = useState<number | "">(""); // 來源（作用隊自己的地）
  const [tgt, setTgt] = useState<number | "">(""); // 目標（對手的地）
  const meta = CARD_META.find((m) => m.key === card);

  const reset = () => { setSrc(""); setTgt(""); };

  const actorTeamObj = teams.find((t) => t.id === actorTeam);
  const actorName = actorTeamObj?.name;
  // 詛咒・封卡（CARD_BLOCK）：出卡隊持有生效中的封卡詛咒道具 → 前端封鎖出卡。
  const actorBlocked = (actorTeamObj?.items ?? []).some((i) => i.effectType === EffectType.CARD_BLOCK);
  // 基底過濾
  const owned = properties.filter((p) => p.ownerTeamId != null);
  const mine = actorTeam === "" ? [] : owned.filter((p) => p.ownerTeamId === actorTeam);
  const others = actorTeam === "" ? owned : owned.filter((p) => p.ownerTeamId !== actorTeam);

  const tgtProp = properties.find((p) => p.id === tgt);
  const compensation = tgtProp ? roundTo10(tgtProp.basePrice * 0.8) : 0;

  const run = async () => {
    if (!card) return "請先選卡片";
    if (actorBlocked) return "此隊中了詛咒，無法對其他隊伍出功能卡";
    if (meta?.needsActor && actorTeam === "") return "請先在上方選作用小隊（出卡隊）";
    if (card === "seizeLand") {
      if (tgt === "") return "請選要收購的對手土地";
      return act(() => postJson("/api/exchange/card", { action: "seizeLand", propertyId: tgt, toTeamId: actorTeam }), "已執行購地卡").then((r) => { reset(); return r; });
    }
    if (card === "swapLand" || card === "swapHouse") {
      if (src === "" || tgt === "") return "請選來源與目標兩塊地";
      return act(() => postJson("/api/exchange/card", { action: card, propertyAId: src, propertyBId: tgt }), card === "swapLand" ? "已執行換地卡" : "已執行換屋卡").then((r) => { reset(); return r; });
    }
    // demolish / monster（byTeamId 為出卡隊，用於通知訊息顯示攻擊者；可不選）
    if (tgt === "") return "請選目標房屋";
    return act(() => postJson("/api/exchange/card", { action: card, propertyId: tgt, ...(actorTeam !== "" ? { byTeamId: actorTeam } : {}) }), card === "demolish" ? "已執行拆屋卡" : "已執行怪獸卡").then((r) => { reset(); return r; });
  };

  return (
    <Card title="功能卡效果（不動產相關）">
      <p className="mb-3 text-xs text-amber-300/80">⚠ 關主收到卡牌後再執行</p>

      {actorBlocked && (
        <div className="mb-3 rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-2 text-sm text-fuchsia-200">
          ☠ <b className="text-fuchsia-100">{actorName ?? "此隊"}</b> 中了詛咒，無法對其他隊伍出功能卡。完成解咒任務後即可解除。
        </div>
      )}

      {/* 選卡 */}
      <div className="mb-4 flex flex-wrap gap-2">
        {CARD_META.map((m) => (
          <button key={m.key} onClick={() => { setCard(m.key); reset(); }}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              card === m.key ? "bg-white/10 text-cyan-300 ring-1 ring-cyan-400/40" : "chip"
            }`}>
            {m.name}
          </button>
        ))}
      </div>

      {!meta ? (
        <p className="text-sm text-slate-400">請選擇一張功能卡。</p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-300">{meta.desc}</p>


          {/* 來源（雙選卡才需要：出卡隊自己的地） */}
          {meta.pickers === "dual" && (
            <PropertyGrid label={`來源（${actorName ?? "出卡隊"}）`} accent="cyan"
              base={mine} value={src} onChange={setSrc} teams={teams} />
          )}

          {/* 目標（對手的地） */}
          <PropertyGrid accent="rose"
            label={meta.key === "seizeLand" ? "目標：要收購的對手土地" : "目標：對手持有的土地"}
            base={others} value={tgt} onChange={setTgt} teams={teams} />

          {/* 購地卡補償試算 */}
          {meta.key === "seizeLand" && tgtProp && (
            <p className="text-xs text-slate-400">
              補償給 <b className="text-cyan-300">{tgtProp.ownerName}</b>：初始價 <Num>{tgtProp.basePrice}</Num> × 80% ＝ <Num className="neon-gold">{compensation}</Num> 光幣
            </p>
          )}

          <ActionButton label={actorBlocked ? "詛咒中・無法出卡" : `執行 ${meta.name}`} className="btn-emerald"
            disabled={actorBlocked}
            onAction={run} />
        </div>
      )}
    </Card>
  );
}

// ── 市場卡分頁 ──────────────────────────────────────────────
type MarketKind = "red" | "black" | "haunt" | "landgod";
const MARKET_CARD_META: {
  key: MarketKind;
  name: string;
  desc: string;
  picker: "region" | "property";
  multKey: "cardRegionUpMult" | "cardRegionDownMult" | "cardBuildingUpMult" | "cardBuildingDownMult";
  multLabel: string;
  accent: "rose" | "cyan";
}[] = [
  { key: "red",     name: "紅卡",   desc: "整區不動產現值上漲",       picker: "region",   multKey: "cardRegionUpMult",    multLabel: "漲幅",   accent: "rose" },
  { key: "black",   name: "黑卡",   desc: "整區不動產現值下跌",       picker: "region",   multKey: "cardRegionDownMult",  multLabel: "跌幅",   accent: "cyan" },
  { key: "landgod", name: "土地公卡", desc: "單棟不動產現值上漲",    picker: "property", multKey: "cardBuildingUpMult",  multLabel: "漲幅",   accent: "rose" },
  { key: "haunt",   name: "鬧鬼卡", desc: "單棟不動產現值下跌",       picker: "property", multKey: "cardBuildingDownMult", multLabel: "跌幅",   accent: "cyan" },
];

function MarketCardActions({
  properties, teams, actorTeam, act, settings,
}: {
  properties: PropView[];
  teams: { id: number; name: string; coins: number; items?: { effectType: string }[] }[];
  actorTeam: number | "";
  act: ActFn;
  settings: {
    cardRegionUpMult: number;
    cardRegionDownMult: number;
    cardBuildingUpMult: number;
    cardBuildingDownMult: number;
  };
}) {
  const [card, setCard] = useState<MarketKind | "">("");
  const [selRegion, setSelRegion] = useState<string>("AURORA");
  const [selProp, setSelProp] = useState<number | "">(""); // 目標不動產
  const meta = MARKET_CARD_META.find((m) => m.key === card);

  const reset = () => { setSelRegion("AURORA"); setSelProp(""); };

  const run = async () => {
    if (!card || !meta) return "請先選卡片";
    if (meta.picker === "region") {
      return act(
        () => postJson("/api/exchange/card", {
          action: card,
          region: selRegion,
          ...(actorTeam !== "" ? { byTeamId: actorTeam } : {}),
        }),
        `已執行 ${meta.name}（${REGIONS.find((r) => r.code === selRegion)?.name ?? selRegion}）`,
      ).then((r) => { reset(); return r; });
    }
    // picker === "property"
    if (selProp === "") return "請先選目標不動產";
    const pname = properties.find((p) => p.id === selProp)?.name ?? "";
    return act(
      () => postJson("/api/exchange/card", {
        action: card,
        propertyId: selProp,
        ...(actorTeam !== "" ? { byTeamId: actorTeam } : {}),
      }),
      `已執行 ${meta.name}（${pname}）`,
    ).then((r) => { reset(); return r; });
  };

  const allOwned = properties.filter((p) => p.ownerTeamId != null);

  return (
    <Card title="市場卡效果">
      <p className="mb-3 text-xs text-amber-300/80">⚠ 關主收到卡牌後再執行</p>

      {/* 選卡 */}
      <div className="mb-4 flex flex-wrap gap-2">
        {MARKET_CARD_META.map((m) => (
          <button key={m.key} onClick={() => { setCard(m.key); reset(); }}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              card === m.key ? "bg-white/10 text-cyan-300 ring-1 ring-cyan-400/40" : "chip"
            }`}>
            {m.name}
          </button>
        ))}
      </div>

      {!meta ? (
        <p className="text-sm text-slate-400">請選擇一張市場卡。</p>
      ) : (
        <div className="space-y-3">
          {/* 說明 + 效果幅度 */}
          <div className="flex flex-wrap items-baseline gap-3">
            <p className="text-sm text-slate-300">{meta.desc}</p>
            <span className="shrink-0 rounded-md bg-white/10 px-2.5 py-1 text-xs font-bold text-cyan-300">
              {meta.multLabel}：×{settings[meta.multKey].toFixed(2)}
            </span>
          </div>

          {/* 區域選擇（紅卡 / 黑卡） */}
          {meta.picker === "region" && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="mb-2 text-xs font-medium text-slate-300">選擇目標區域</div>
              <div className="flex flex-wrap gap-2">
                {REGIONS.map((r) => {
                  const ui = REGION_UI[r.code as keyof typeof REGION_UI];
                  const sel = selRegion === r.code;
                  return (
                    <button key={r.code} onClick={() => setSelRegion(r.code)}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                        sel ? `bg-white/10 ${ui.text} ring-1 ${ui.border}` : "chip"
                      }`}>
                      {r.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 不動產選擇（鬧鬼卡 / 土地公卡） */}
          {meta.picker === "property" && (
            <PropertyGrid
              label="選擇目標不動產"
              accent={meta.accent}
              base={allOwned}
              value={selProp}
              onChange={setSelProp}
              teams={teams}
            />
          )}

          <ActionButton label={`執行 ${meta.name}`} className="btn-emerald" onAction={run} />
        </div>
      )}
    </Card>
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
