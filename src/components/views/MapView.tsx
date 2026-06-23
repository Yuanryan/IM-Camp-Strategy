"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { useSnapshot, postJson, ActionButton, TeamSelect, fetcher } from "@/components/client";
import { RewardButtons } from "@/components/RewardPanel";
import { LotteryView } from "@/components/views/LotteryView";
import { WheelView } from "@/components/views/WheelView";
import { LuckDraw } from "@/components/views/LuckDraw";
import { ExchangeView } from "@/components/views/ExchangeView";
import { ShopView } from "@/components/views/ShopView";
import { RealMapView } from "@/components/views/RealMapView";
import { ScrollLock } from "@/components/ui/scroll-lock";
import { Card, StickyTeam } from "@/components/Shell";
import { Num, EventBanner, HudTabs, TeamItemBadges, FloatingDesc } from "@/components/ui";
import { MAP_REWARD_PRESETS, REGIONS, REGION_UI, EffectType, ITEM_GRADE_COLORS, stackEffects, applyToll, type UndoRecipe } from "@/lib/game";
import { Map, CircleDollarSign, LoaderPinwheel, Building2, Store, Gamepad2 } from "lucide-react";

export function MapView() {
  const { snap, mutate } = useSnapshot(2500);
  useSWR("/api/shop", fetcher);
  useSWR("/api/shop/item", fetcher);
  const [team, setTeam] = useState<number | "">("");
  const [coins, setCoins] = useState(0);
  const [points, setPoints] = useState(0);
  const [tollRegion, setTollRegion] = useState("AURORA");
  // 交易所預選區域（由真實地圖落在不動產格時自動帶入）
  const [region, setRegion] = useState("AURORA");
  const [tab, setTab] = useState<"realmap" | "map" | "lottery" | "wheel" | "exchange" | "shop">("realmap");
  const [openItemId, setOpenItemId] = useState<number | null>(null);
  const [hoverItemId, setHoverItemId] = useState<number | null>(null);
  // 點擊版本數秒後自動消失
  useEffect(() => {
    if (openItemId === null) return;
    const t = setTimeout(() => setOpenItemId(null), 2000);
    return () => clearTimeout(t);
  }, [openItemId]);

  // 若目前選取的收費區不可付（無獨佔，或付款隊自己就是獨佔），自動跳到第一個可付區
  const tollRegionRi = snap?.regions.find((x) => x.code === tollRegion);
  const tollRegionPayable =
    !!tollRegionRi?.monopolyTeamName && !(team !== "" && tollRegionRi.monopolyTeamId === team);
  useEffect(() => {
    if (!snap || tollRegionPayable) return;
    const firstPayable = REGIONS.find((r) => {
      const ri = snap.regions.find((x) => x.code === r.code);
      return !!ri?.monopolyTeamName && !(team !== "" && ri.monopolyTeamId === team);
    });
    if (firstPayable) setTollRegion(firstPayable.code);
  }, [snap, tollRegion, team, tollRegionPayable]);

  if (!snap) return <p className="text-sm text-slate-400">載入中…</p>;
  const teams = snap.teams;
  const cur = teams.find((t) => t.id === team);
  const event1 = snap.activeEvents.includes(1);
  // 有任一區可收過路費（有獨佔且付款隊不是該區獨佔）才需付費；否則整張卡顯示「不需過路費」
  const anyMonopoly = REGIONS.some(
    (r) => !!snap.regions.find((x) => x.code === r.code)?.monopolyTeamName,
  );
  const anyPayable = REGIONS.some((r) => {
    const ri = snap.regions.find((x) => x.code === r.code);
    return !!ri?.monopolyTeamName && !(team !== "" && ri.monopolyTeamId === team);
  });

  // 操作卡鎖定：尚未選小隊即可（回合結算已移至「遊戲地圖」擲骰前進時自動執行）。
  const cardsLocked = team === "";

  return (
    <div className="space-y-4">
      {/* ── Tab bar ──────────────────────────────────────────── */}
      <HudTabs
        active={tab}
        onChange={setTab}
        tabs={[
          ["realmap", "遊戲地圖", <Gamepad2 key="r" className="h-4 w-4" />],
          ["map", "地圖中控站", <Map key="m" className="h-4 w-4" />],
          ["exchange", "交易所", <Building2 key="e" className="h-4 w-4" />],
          ["shop", "神秘商店", <Store key="s" className="h-4 w-4" />],
          ["lottery", "大樂透", <CircleDollarSign key="l" className="h-4 w-4" />],
          ["wheel", "命運輪盤", <LoaderPinwheel key="w" className="h-4 w-4" />],
        ] as const}
      />

      {tab === "realmap" ? (
        <>
        {/* 遊戲地圖分頁固定一個視窗高、本就不需捲動 → 鎖死整份文件捲動，
            避免 iPad/Safari 橡皮筋過捲把工具列叫回（看似退出全螢幕）。*/}
        <ScrollLock />
        <RealMapView
          team={team}
          setTeam={setTeam}
          onLand={({ tab: nextTab, region: nextRegion }) => {
            if (nextRegion) setRegion(nextRegion);
            setTab(nextTab);
          }}
        />
        </>
      ) : tab === "lottery" ? (
        <LotteryView team={team} setTeam={setTeam} />
      ) : tab === "wheel" ? (
        <WheelView teams={teams} team={team} setTeam={setTeam} cur={cur} onDone={mutate} />
      ) : tab === "exchange" ? (
        <ExchangeView team={team} setTeam={setTeam} region={region} setRegion={setRegion} />
      ) : tab === "shop" ? (
        <ShopView team={team} setTeam={setTeam} />
      ) : (
        <>
          <EventBanner events={snap.activeEvents} />

          {/* ── Sticky team strip ────────────────────────────── */}
          <StickyTeam>
            <div className="flex flex-wrap items-center gap-3">
              <TeamSelect teams={teams} value={team} onChange={setTeam} />
              {cur ? (
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-slate-400">
                    光幣 <Num className="neon-gold font-bold">{cur.coins}</Num>
                  </span>
                  <span className="text-slate-400">
                    點數 <Num className="font-bold text-cyan-300">{cur.cardPoints}</Num>
                  </span>
                </div>
              ) : (
                <span className="text-xs text-amber-300/80">⚠ 請先選擇小隊</span>
              )}
              {event1 && (
                <span className="breathe rounded-md border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-xs font-semibold text-amber-200">
                  事件一：抽卡加倍
                </span>
              )}
            </div>
            <TeamItemBadges
              items={cur?.items ?? []}
              relevantTypes={[EffectType.GOOD_CARD_BONUS, EffectType.BAD_CARD_REDUCE, EffectType.WHEEL_ON_GOOD_CARD, EffectType.TOLL_PAID, EffectType.PIRACY, EffectType.MOVEMENT, EffectType.REMINDER]}
            />
          </StickyTeam>

          {/* 未選小隊時鎖定以下操作卡 */}
          {team === "" && (
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 py-3 text-center text-sm font-semibold text-amber-300">
              ⚠ 請先於上方選擇小隊
            </div>
          )}
          <div className={`space-y-4 rounded-2xl p-1 ${cardsLocked ? "pointer-events-none select-none opacity-50" : ""}`}>

          {/* ── 光源點 / 迷霧區 ──────────────────────────────── */}
          <Card title="光源點 / 迷霧區">
            <div className="mb-1 text-xs text-slate-400">
              好運卡完成任務可獲得光幣；厄運卡扣錢或執行懲罰任務。
            </div>
            <LuckDraw team={team} curName={cur?.name} event1={event1} items={cur?.items ?? []} onDone={mutate} />
          </Card>

          {/* ── 資本據點 / 過路費 ─────────────────────────────── */}
          <Card title="資本據點 / 過路費">
            <p className="mb-3 text-sm text-slate-300">
              告知小隊可<b>購買 / 升級</b>（須到交易所登記）。踩到有獨佔的區域需在此向付款隊收取過路費。
            </p>

            {/* Region grid with live monopoly info */}
            <div className="mb-3 grid grid-cols-2 gap-2">
              {REGIONS.map((r) => {
                const ri = snap.regions.find((x) => x.code === r.code);
                const ui = REGION_UI[r.code];
                const selected = tollRegion === r.code;
                const hasMonopoly = !!ri?.monopolyTeamName;
                // 付款隊本身就是該區獨佔 → 免過路費，不可選
                const isOwnMonopoly = team !== "" && ri?.monopolyTeamId === team;
                const payable = hasMonopoly && !isOwnMonopoly;
                const baseToll = ri?.toll ?? 0;

                // 獨佔隊的 TOLL_INCOME 提高過路費；付款隊的 TOLL_PAID 降低過路費。
                // 顯示僅列出獨佔隊的 TOLL_INCOME 道具。
                const monopolyItems = snap.teams.find((t) => t.id === ri?.monopolyTeamId)?.items ?? [];
                const incomeItems = monopolyItems.filter((i) => i.effectType === EffectType.TOLL_INCOME);
                const tollIncomeDelta = stackEffects(incomeItems.map((i) => i.effectValue));
                const tollPaidDelta = stackEffects(
                  (cur?.items ?? [])
                    .filter((i) => i.effectType === EffectType.TOLL_PAID)
                    .map((i) => i.effectValue),
                );
                const payDelta = team !== "" ? tollPaidDelta : 0;
                const toll = hasMonopoly
                  ? applyToll(baseToll, tollIncomeDelta, payDelta)
                  : baseToll;
                const tollChanged = toll !== baseToll;

                return (
                  <button
                    key={r.code}
                    onClick={() => setTollRegion(r.code)}
                    disabled={!payable}
                    className={`rounded-xl border p-3 text-left transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${
                      selected
                        ? `${ui.border} bg-white/8 ring-1 ${ui.border}`
                        : "border-white/8 bg-white/3 hover:bg-white/8"
                    }`}
                  >
                    <div className={`mb-1 text-xs font-bold tracking-wide ${ui.text}`}>
                      {r.name}
                    </div>
                    {hasMonopoly ? (
                      <>
                        <div className="truncate text-sm font-semibold text-slate-100">
                          {ri!.monopolyTeamName}
                        </div>
                        <div className="text-xs text-slate-400">
                          需付{" "}
                          <Num className={`font-bold ${tollChanged ? (toll > baseToll ? "text-rose-400" : "text-emerald-400") : "text-slate-200"}`}>{toll}</Num>
                          {tollChanged && <s className="ml-1.5 opacity-60">{baseToll}</s>}
                           
                        </div>
                        {incomeItems.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {incomeItems.map((i) => (
                              <span
                                key={i.id}
                                className="relative inline-block"
                                onMouseEnter={() => setHoverItemId(i.id)}
                                onMouseLeave={() => setHoverItemId((cur) => (cur === i.id ? null : cur))}
                              >
                                <span
                                  role="button"
                                  onClick={(e) => {
                                    e.stopPropagation(); // 不要連帶選取該區
                                    setOpenItemId((cur) => (cur === i.id ? null : i.id));
                                  }}
                                  className={`inline-block cursor-pointer rounded border px-1 py-0.5 text-[10px] font-medium ${ITEM_GRADE_COLORS[i.grade] ?? "chip"}`}
                                >
                                  {i.name} <span className="text-rose-400">+{(i.effectValue * 100).toFixed(0)}%</span>
                                </span>
                                {(openItemId === i.id || hoverItemId === i.id) && (
                                  <FloatingDesc>{i.description}</FloatingDesc>
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-xs text-slate-500">目前無獨佔</div>
                    )}
                  </button>
                );
              })}
            </div>

            {anyPayable ? (
              <ActionButton
                label="支付過路費"
                className="w-full bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                disabled={team === ""}
                onAction={async () => {
                  if (team === "") return "請先選付款小隊";
                  const prop = snap.properties.find((p) => p.region === tollRegion);
                  if (!prop) return "該區尚無資本據點";
                  const r = await postJson("/api/exchange/toll", {
                    propertyId: prop.id,
                    payerTeamId: team,
                  });
                  await mutate();
                  return {
                    message: `${cur?.name} 付款 ${r.toll}`,
                    undo: r.undo as UndoRecipe | undefined,
                  };
                }}
              />
            ) : (
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 py-3 text-center text-sm font-semibold text-emerald-300">
                {anyMonopoly && team !== ""
                  ? "此區域由該隊獨佔・不需過路費"
                  : "目前無獨佔區域・不需過路費"}
              </div>
            )}

          </Card>

          {/* ── 快速加減 ──────────────────────────────────────── */}
          <Card title="快速加減">
            <RewardButtons teamId={team} presets={MAP_REWARD_PRESETS} onDone={mutate} />
            <div className="mt-3 border-t border-white/10 pt-3">
              <div className="mb-2 text-xs font-semibold text-slate-400">自訂（可正可負）</div>
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-xs text-slate-400">
                  <div className="mb-1">光幣</div>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={coins}
                    onChange={(e) => setCoins(Number(e.target.value) || 0)}
                    className="fld w-24"
                  />
                </label>
                <label className="text-xs text-slate-400">
                  <div className="mb-1">卡牌點數</div>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={points}
                    onChange={(e) => setPoints(Number(e.target.value) || 0)}
                    className="fld w-24"
                  />
                </label>
                <ActionButton
                  label="套用"
                  disabled={team === ""}
                  onAction={async () => {
                    if (team === "") return "請先選小隊";
                    if (coins === 0 && points === 0) return "沒有變動";
                    const r = await postJson("/api/balance", {
                      teamId: team,
                      coins,
                      cardPoints: points,
                    });
                    await mutate();
                    setCoins(0);
                    setPoints(0);
                    return { message: `${cur?.name}：自訂`, undo: r.undo as UndoRecipe | undefined };
                  }}
                />
              </div>
            </div>
          </Card>

          </div>
        </>
      )}
    </div>
  );
}
