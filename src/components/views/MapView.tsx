"use client";

import { useState } from "react";
import { useSnapshot, postJson, ActionButton, TeamSelect } from "@/components/client";
import { RewardButtons } from "@/components/RewardPanel";
import { LotteryView } from "@/components/views/LotteryView";
import { WheelView } from "@/components/views/WheelView";
import { LuckDraw } from "@/components/views/LuckDraw";
import { Card, StickyTeam } from "@/components/Shell";
import { Num, EventBanner, HudTabs, TeamItemBadges } from "@/components/ui";
import { MAP_REWARD_PRESETS, REGIONS, REGION_UI, EffectType, ITEM_GRADE_COLORS, stackEffects, applyToll, type UndoRecipe } from "@/lib/game";
import { Map, CircleDollarSign, LoaderPinwheel } from "lucide-react";

export function MapView() {
  const { snap, mutate } = useSnapshot(2500);
  const [team, setTeam] = useState<number | "">("");
  const [coins, setCoins] = useState(0);
  const [points, setPoints] = useState(0);
  const [note, setNote] = useState("");
  const [tollRegion, setTollRegion] = useState("AURORA");
  const [tab, setTab] = useState<"map" | "lottery" | "wheel">("map");

  if (!snap) return <p className="text-sm text-slate-400">載入中…</p>;
  const teams = snap.teams;
  const cur = teams.find((t) => t.id === team);
  const event1 = snap.activeEvents.includes(1);

  return (
    <div className="space-y-4">
      {/* ── Tab bar ──────────────────────────────────────────── */}
      <HudTabs
        active={tab}
        onChange={setTab}
        tabs={[
          ["map", "地圖中控站", <Map key="m" className="h-4 w-4" />],
          ["lottery", "大樂透", <CircleDollarSign key="l" className="h-4 w-4" />],
          ["wheel", "命運輪盤", <LoaderPinwheel key="w" className="h-4 w-4" />],
        ] as const}
      />

      {tab === "lottery" ? (
        <LotteryView />
      ) : tab === "wheel" ? (
        <WheelView teams={teams} team={team} setTeam={setTeam} cur={cur} onDone={mutate} />
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
                <span className="text-xs text-amber-300/80">⚠ 請先選擇作用小隊</span>
              )}
              {event1 && (
                <span className="breathe rounded-md border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-xs font-semibold text-amber-200">
                  事件一：抽卡加倍
                </span>
              )}
            </div>
            <TeamItemBadges
              items={cur?.items ?? []}
              relevantTypes={[EffectType.GOOD_CARD_BONUS, EffectType.BAD_CARD_REDUCE, EffectType.TOLL_PAID, EffectType.REMINDER]}
            />
          </StickyTeam>

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
                    className={`rounded-xl border p-3 text-left transition active:scale-[0.98] ${
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
                          {tollChanged && <span className="text-slate-500"> （基礎 {baseToll}）</span>}
                        </div>
                        {incomeItems.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {incomeItems.map((i) => (
                              <span
                                key={i.id}
                                title={i.description}
                                className={`rounded border px-1 py-0.5 text-[10px] font-medium ${ITEM_GRADE_COLORS[i.grade] ?? "chip"}`}
                              >
                                {i.name} <span className="text-emerald-400">+{(i.effectValue * 100).toFixed(0)}%</span>
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

            <ActionButton
              label="向選定小隊收過路費"
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
                  message: `${cur?.name} 付款 ${r.toll}${r.toll !== r.baseToll ? `（基礎 ${r.baseToll}）` : ""}`,
                  undo: r.undo as UndoRecipe | undefined,
                };
              }}
            />
            <p className="mt-2 text-xs text-slate-500">
              系統依獨佔隊伍現值自動計算（×10%、四捨五入至 50）。踩自己獨佔區或無獨佔則免收。
            </p>
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
                <label className="min-w-0 flex-1 text-xs text-slate-400">
                  <div className="mb-1">備註</div>
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="例如：好運卡效果"
                    className="fld w-full"
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
                      note: note || "自訂",
                    });
                    await mutate();
                    const n = note || "自訂";
                    setCoins(0);
                    setPoints(0);
                    setNote("");
                    return { message: `${cur?.name}：${n}`, undo: r.undo as UndoRecipe | undefined };
                  }}
                />
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
