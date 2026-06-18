"use client";

import { useState, useEffect } from "react";
import { useSnapshot, postJson, ActionButton, TeamSelect, toast } from "@/components/client";
import { RewardButtons } from "@/components/RewardPanel";
import { LotteryView } from "@/components/views/LotteryView";
import { WheelView } from "@/components/views/WheelView";
import { LuckDraw } from "@/components/views/LuckDraw";
import { Card, StickyTeam } from "@/components/Shell";
import { Num, EventBanner, HudTabs, TeamItemBadges, FloatingDesc } from "@/components/ui";
import { MAP_REWARD_PRESETS, REGIONS, REGION_UI, EffectType, ITEM_GRADE_COLORS, stackEffects, applyToll, type UndoRecipe } from "@/lib/game";
import { Map, CircleDollarSign, LoaderPinwheel } from "lucide-react";
import type { Snapshot } from "@/lib/snapshot";

export function MapView() {
  const { snap, mutate } = useSnapshot(2500);
  const [team, setTeam] = useState<number | "">("");
  const [coins, setCoins] = useState(0);
  const [points, setPoints] = useState(0);
  const [tollRegion, setTollRegion] = useState("AURORA");
  const [tab, setTab] = useState<"map" | "lottery" | "wheel">("map");
  const [openItemId, setOpenItemId] = useState<number | null>(null);
  const [hoverItemId, setHoverItemId] = useState<number | null>(null);
  // 回合結算門檻：已結算過的小隊 id；切換小隊即重置 → 回到任何隊都要重新結算
  const [settledTeam, setSettledTeam] = useState<number | "">("");
  useEffect(() => {
    setSettledTeam("");
  }, [team]);
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

  // 回合結算門檻：該隊持有每輪收益 / 提醒道具時，須先按「結算」才解鎖其他操作卡。
  const hasRoundItems =
    !!cur && (cur.items ?? []).some((i) => ROUND_GATE_TYPES.includes(i.effectType));
  const needsSettle = hasRoundItems && settledTeam !== team;
  // 操作卡鎖定：尚未選小隊，或該隊尚未結算本回合
  const cardsLocked = team === "" || needsSettle;

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
        <LotteryView team={team} setTeam={setTeam} />
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
              relevantTypes={[EffectType.GOOD_CARD_BONUS, EffectType.BAD_CARD_REDUCE, EffectType.WHEEL_ON_GOOD_CARD, EffectType.TOLL_PAID, EffectType.PIRACY, EffectType.REMINDER]}
            />
          </StickyTeam>

          {/* ── 回合結算（每輪收益 + 提醒）─────────────────────── */}
          <RoundSettlePanel
            team={cur}
            settled={settledTeam === team}
            onSettled={() => setSettledTeam(team)}
            onDone={mutate}
          />

          {/* 未選小隊或回合結算門檻未完成時，鎖定以下操作卡 */}
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
                      note: note || "自訂",
                    });
                    await mutate();
                    const n = note || "自訂";
                    setCoins(0);
                    setPoints(0);
                    return { message: `${cur?.name}：${n}`, undo: r.undo as UndoRecipe | undefined };
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

// 每輪收益類效果（與 service.distributeRoundIncome 的 ROUND_TYPES 一致）
const ROUND_INCOME_TYPES: string[] = [
  EffectType.COINS_PER_ROUND,
  EffectType.COMPOUND_INTEREST,
  EffectType.PROPERTY_DIVIDEND,
  EffectType.UNDERDOG,
];
// 觸發回合結算門檻的效果（每輪收益 + 提醒）
const ROUND_GATE_TYPES: string[] = [...ROUND_INCOME_TYPES, EffectType.REMINDER];

// ── 回合結算（單一小隊）：列出該隊每輪收益 / 提醒道具，並一鍵結算消耗提醒次數 ──
// 該隊無任何相關道具時整張卡不顯示。
function RoundSettlePanel({
  team,
  settled,
  onSettled,
  onDone,
}: {
  team: Snapshot["teams"][number] | undefined;
  settled: boolean;
  onSettled: () => void;
  onDone: () => void | Promise<unknown>;
}) {
  const [busy, setBusy] = useState(false);

  const items = team?.items ?? [];
  const reminders = items.filter((i) => i.effectType === EffectType.REMINDER);
  const incomeItems = items.filter((i) => ROUND_INCOME_TYPES.includes(i.effectType));
  if (!team) return null;

  // 該隊無每輪收益 / 提醒道具 → 無需結算，直接放行
  if (reminders.length === 0 && incomeItems.length === 0) {
    return (
      <Card title={`回合結算`}>
        <div className="flex items-center gap-2 text-sm text-emerald-300">
          <span>本回合無需結算。</span>
        </div>
      </Card>
    );
  }

  const settle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await postJson("/api/host/round-income", { teamId: team.id });
      await onDone();
      const gained = (r.results ?? []).reduce((s: number, x: { income: number }) => s + x.income, 0);
      toast(gained > 0 ? `${team.name} 回合收益 +${gained} 光幣` : `${team.name} 本回合無收益`, "ok");
      onSettled();
    } catch (e) {
      toast(e instanceof Error ? e.message : "結算失敗", "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title={`回合結算`} className={settled ? "opacity-60" : "ring-1 ring-amber-400/40"}>
      {!settled && (
        <div className="mb-2 text-xs font-semibold text-amber-300">
          ⚠ 請先結算本回合，再進行其他操作
        </div>
      )}
      {incomeItems.length > 0 && (
        <div className="mb-3">
          <div className="mb-1.5 text-xs font-semibold text-emerald-300">每輪收益</div>
          <ul className="space-y-1.5">
            {incomeItems.map((i) => (
              <li key={i.id} className="text-xs">
                <span className="text-slate-200">{i.name}</span>
                {i.usesRemaining !== null && (
                  <span className="ml-1 text-emerald-300/80">（剩 {i.usesRemaining} 次）</span>
                )}
                <div className="mt-0.5 text-slate-400">{i.description}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {reminders.length > 0 && (
        <div className="mb-3">
          <div className="mb-1.5 text-xs font-semibold text-amber-300">⚑ 提醒事項</div>
          <ul className="space-y-1.5">
            {reminders.map((r) => (
              <li key={r.id} className="text-xs">
                <span className="text-slate-200">{r.name}</span>
                {r.usesRemaining !== null && (
                  <span className="ml-1 text-amber-300/80">（剩 {r.usesRemaining} 次）</span>
                )}
                <div className="mt-0.5 text-slate-400">{r.description}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={settle}
        disabled={busy || settled}
        className="btn-amber w-full rounded-xl py-3 text-sm font-black tracking-wide transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? "結算中…" : settled ? "✓ 本回合已結算" : `結算 ${team.name} 本回合`}
      </button>
      {!settled && (
        <button
          onClick={onSettled}
          disabled={busy}
          className="mt-2 w-full rounded-lg py-1 text-xs font-medium text-slate-400 transition hover:text-slate-200 disabled:opacity-40"
        >
          略過結算
        </button>
      )}
    </Card>
  );
}
