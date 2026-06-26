"use client";

import { useState, useEffect } from "react";
import { postJson, TeamSelect, toast } from "@/components/client";
import { Card, StickyTeam } from "@/components/Shell";
import { Num, TeamItemBadges, TurnCompleteBar } from "@/components/ui";
import { WHEEL_OUTCOMES, applyWheelMaxStake, applyWheelBonus, EffectType, type UndoRecipe } from "@/lib/game";
import type { ActiveItemView } from "@/lib/snapshot";

// 依權重比例切出每一段（x5 權重最低 → 最窄）
const TOTAL = WHEEL_OUTCOMES.reduce((s, o) => s + o.weight, 0);
const SEGMENTS = (() => {
  let start = 0;
  return WHEEL_OUTCOMES.map((o) => {
    const sweep = (o.weight / TOTAL) * 360;
    const seg = { mult: o.mult, start, sweep, center: start + sweep / 2 };
    start += sweep;
    return seg;
  });
})();

// 顏色：青色系漸層，x5 用金色凸顯
const COLORS = ["#334155", "#0e7490", "#155e75", "#0891b2", "#06b6d4", "#facc15"];

// 角度（自正上方順時針）轉直角座標
function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.sin(rad), cy - r * Math.cos(rad)];
}
function arcPath(cx: number, cy: number, r: number, start: number, sweep: number) {
  const [x1, y1] = polar(cx, cy, r, start);
  const [x2, y2] = polar(cx, cy, r, start + sweep);
  const large = sweep > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

type TeamLite = { id: number; name: string; coins: number; items: ActiveItemView[] };

export function WheelView({
  teams,
  team,
  setTeam,
  cur,
  onDone,
  turnMode = false,
  onComplete,
}: {
  teams: TeamLite[];
  team: number | "";
  setTeam: (id: number | "") => void;
  cur?: TeamLite;
  onDone: () => void | Promise<unknown>;
  // 地圖回合操作：顯示「完成」鈕，累計本回合轉盤金流並回報（含投入 / 拿回子列）。
  turnMode?: boolean;
  onComplete?: (delta: number, subRows?: { label: string; amount: number }[]) => void;
}) {
  const [stake, setStake] = useState(100);
  // 本回合累計：投入＝各次押注總和（正數）、拿回＝各次實得總和（正數）。
  // 淨變動 = 拿回 − 投入；「完成」時以「投入 −X / 拿回 +Y」兩條子列回報，合計為淨變動。
  const [turnStakeTotal, setTurnStakeTotal] = useState(0);
  const [turnPayoutTotal, setTurnPayoutTotal] = useState(0);
  const turnDelta = turnPayoutTotal - turnStakeTotal;
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [last, setLast] = useState<{ mult: number; delta: number; baseDelta: number; stake: number } | null>(null);
  // Freeze the coins display at spin-start so mid-animation SWR refreshes
  // don't update the balance or max-stake while the wheel is still moving.
  const [frozenCoins, setFrozenCoins] = useState<number | null>(null);
  const [frozenEffects, setFrozenEffects] = useState<{ hasNoZero: boolean; bonusDelta: number } | null>(null);

  const displayCoins = spinning && frozenCoins !== null ? frozenCoins : (cur?.coins ?? 0);
  const boostDelta = (cur?.items ?? [])
    .filter((i) => i.effectType === "WHEEL_STAKE_BOOST")
    .reduce((s, i) => s + i.effectValue, 0);
  const maxStake = applyWheelMaxStake(displayCoins, boostDelta);

  // 道具效果（鏡像 service.applyWheel）：用於視覺化
  // 旋轉時使用凍結值，避免 SWR 刷新改變輪盤外觀
  const liveBonusDelta = (cur?.items ?? [])
    .filter((i) => i.effectType === "WHEEL_BONUS")
    .reduce((s, i) => s + i.effectValue, 0);
  const liveHasNoZero = (cur?.items ?? []).some((i) => i.effectType === "WHEEL_NO_ZERO");
  const bonusDelta = spinning && frozenEffects !== null ? frozenEffects.bonusDelta : liveBonusDelta;
  const hasNoZero = spinning && frozenEffects !== null ? frozenEffects.hasNoZero : liveHasNoZero;

  // Clamp stake only after the animation ends (maxStake is stable during spinning)
  useEffect(() => {
    if (spinning) return;
    if (stake > maxStake) setStake(maxStake);
  }, [maxStake, spinning]);

  const spin = async () => {
    if (team === "" || spinning) return;
    if (stake < 1 || stake > maxStake) {
      toast(`投入需 1–${maxStake} 光幣`, "err");
      return;
    }
    setFrozenCoins(cur?.coins ?? 0);
    setFrozenEffects({ hasNoZero: liveHasNoZero, bonusDelta: liveBonusDelta });
    setSpinning(true);
    setLast(null);
    try {
      const r = await postJson("/api/map/wheel", { teamId: team, stake });
      const seg = SEGMENTS.find((s) => s.mult === r.mult) ?? SEGMENTS[0];
      // 段內微抖動，讓指針不要每次都停在正中央
      const jitter = (Math.random() - 0.5) * seg.sweep * 0.6;
      const targetMod = ((360 - (seg.center + jitter)) % 360 + 360) % 360;
      setRotation((prev) => {
        const current = ((prev % 360) + 360) % 360;
        let add = targetMod - current;
        if (add < 0) add += 360;
        return prev + 360 * 6 + add; // 轉 6 圈再對準
      });
      window.setTimeout(async () => {
        // 還原加成前的淨變動（base = round(stake×mult) − stake），讓面板顯示加成計算
        const baseDelta = Math.round(stake * r.mult) - stake;
        setLast({ mult: r.mult, delta: r.delta, baseDelta, stake });
        // 回合操作：累計投入（押注）與拿回（押注 + 淨變動），待「完成」拆成兩條子列。
        if (turnMode) {
          setTurnStakeTotal((s) => s + stake);
          setTurnPayoutTotal((p) => p + stake + (r.delta ?? 0));
        }
        toast(
          `×${r.mult}！${r.delta >= 0 ? "賺" : "賠"} ${Math.abs(r.delta)} 光幣`,
          r.delta >= 0 ? "ok" : "err",
          r.undo as UndoRecipe | undefined,
        );
        await onDone();
        setFrozenCoins(null);
        setFrozenEffects(null);
        setSpinning(false);
      }, 4200);
    } catch (e) {
      toast(e instanceof Error ? e.message : "轉盤失敗", "err");
      setSpinning(false);
    }
  };

  return (
    <div className="space-y-4">
      <StickyTeam>
        <div className="flex flex-wrap items-center gap-3">
          <TeamSelect teams={teams} value={team} onChange={setTeam} />
          {cur ? (
            <span className="text-sm text-slate-400">
              光幣 <Num className="neon-gold font-bold">{displayCoins}</Num>
            </span>
          ) : (
            <span className="text-xs text-amber-300/80">⚠ 請先選擇小隊</span>
          )}
        </div>
        <TeamItemBadges
          items={cur?.items ?? []}
          relevantTypes={[EffectType.WHEEL_BONUS, EffectType.WHEEL_NO_ZERO, EffectType.WHEEL_STAKE_BOOST]}
        />
      </StickyTeam>

      <Card title="命運投資輪盤">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
          {/* 左側：輪盤 + 結果；flex-1 給 col 寬度，讓 w-full 的輪盤能正確展開 */}
          <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="relative mx-auto w-full max-w-xs aspect-square sm:max-w-sm">
            {/* 指針（固定在正上方，指向輪盤）*/}
            <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2">
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: "13px solid transparent",
                  borderRight: "13px solid transparent",
                  borderTop: "22px solid #facc15",
                  filter: "drop-shadow(0 0 6px rgba(250,204,21,0.6))",
                }}
              />
            </div>

            <svg
              viewBox="0 0 200 200"
              className="absolute inset-0 h-full w-full drop-shadow-[0_0_22px_rgba(34,211,238,0.25)]"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? "transform 4s cubic-bezier(0.17,0.67,0.21,1)" : "none",
              }}
            >
              <circle cx={100} cy={100} r={99} fill="#020617" stroke="rgba(255,255,255,0.18)" strokeWidth={2} />
              {SEGMENTS.map((s, i) => {
                const [lx, ly] = polar(100, 100, 66, s.center);
                // WHEEL_NO_ZERO：×0 區段被保底道具移除 → 變灰、降透明、打叉提示
                const removed = hasNoZero && s.mult === 0;
                return (
                  <g key={i} opacity={removed ? 0.28 : 1}>
                    <path
                      d={arcPath(100, 100, 96, s.start, s.sweep)}
                      fill={removed ? "#1e293b" : COLORS[i]}
                      stroke={removed ? "rgba(248,113,113,0.5)" : "rgba(2,6,23,0.55)"}
                      strokeWidth={removed ? 1.5 : 1}
                      strokeDasharray={removed ? "3 2" : undefined}
                    />
                    <text
                      x={lx}
                      y={ly}
                      fill={removed ? "#94a3b8" : s.mult === 10 ? "#020617" : "#e2e8f0"}
                      fontSize={s.sweep < 16 ? (s.mult === 10 ? 4 : 9) : 13}
                      fontWeight="bold"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      textDecoration={removed ? "line-through" : undefined}
                      transform={`rotate(${s.center} ${lx} ${ly})`}
                    >
                      ×{s.mult}
                    </text>
                  </g>
                );
              })}
              <circle cx={100} cy={100} r={15} fill="#0f172a" stroke="#facc15" strokeWidth={2} />
            </svg>
          </div>

          </div>{/* end 左側 */}

          {/* 右側：結果 + 控制項 */}
          <div className="flex w-full shrink-0 flex-col sm:w-[330px]">
            {last && (
              <div
                className={`flex shrink-0 items-center gap-4 rounded-xl p-4 ring-1 ${
                  last.delta >= 0
                    ? "bg-emerald-500/10 ring-emerald-400/30"
                    : "bg-rose-500/10 ring-rose-400/30"
                }`}
              >
                <div className="shrink-0 text-center">
                  <div className="text-[10px] uppercase tracking-widest text-slate-500">倍率</div>
                  <Num
                    className={`text-4xl font-black leading-none ${
                      last.delta >= 0 ? "text-emerald-300" : "text-rose-300"
                    }`}
                  >
                    ×{last.mult}
                  </Num>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-400">
                    投入 <Num className="font-bold text-slate-200">{last.stake}</Num>
                    {"  →  "}
                    拿回 <Num className="font-bold text-slate-200">{last.stake + last.delta}</Num>
                  </div>
                  {last.baseDelta > 0 && last.delta !== last.baseDelta && (
                    <div className="mt-0.5 text-xs text-emerald-300/90">
                      <Num className="font-bold">{last.baseDelta}</Num>
                      {" × "}
                      <Num className="font-bold">{(last.delta / last.baseDelta).toFixed(2)}</Num>
                    </div>
                  )}
                  <div
                    className={`num mt-0.5 text-2xl font-black ${
                      last.delta > 0
                        ? "text-emerald-300"
                        : last.delta < 0
                          ? "text-rose-300"
                          : "text-slate-400"
                    }`}
                  >
                    {last.delta > 0 ? `+${last.delta}` : last.delta === 0 ? "持平" : last.delta}{" "}
                    <span className="text-sm font-semibold">光幣</span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-auto shrink-0 flex flex-col gap-3 pt-3">
              {/* Quick-stake chips */}
              <div>
                <div className="mb-1.5 text-xs text-slate-400">
                  投入光幣（上限 <span className="neon-gold font-bold">{maxStake}</span>）
                </div>
                <div className="flex gap-2">
                  {[...new Set([100, 200, 300, 500, maxStake])].sort((a, b) => a - b).map((v) => (
                    <button
                      key={v}
                      disabled={spinning}
                      onClick={() => setStake(v)}
                      className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition active:scale-95 disabled:opacity-40 ${
                        stake === v ? "btn-purple ring-1 ring-purple-400/40" : "chip"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom stake input */}
              <input
                type="number"
                inputMode="numeric"
                value={stake}
                min={1}
                max={maxStake}
                disabled={spinning}
                onChange={(e) => setStake(Number(e.target.value) || 0)}
                className="fld w-full text-center text-lg font-bold"
              />

              {/* Spin button */}
              <button
                onClick={spin}
                disabled={team === "" || spinning}
                className="btn-purple w-full rounded-xl py-4 text-lg font-black tracking-widest transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {spinning ? "轉動中…" : "轉輪盤"}
              </button>
            </div>
          </div>
        </div>
      </Card>

      {turnMode && onComplete && (
        <TurnCompleteBar
          delta={turnDelta}
          onComplete={(net) =>
            onComplete(
              net,
              // 有押注才附「投入 / 拿回」子列；合計（header）為淨變動。
              turnStakeTotal > 0
                ? [
                    { label: "投入", amount: -turnStakeTotal },
                    { label: "拿回", amount: turnPayoutTotal },
                  ]
                : undefined,
            )
          }
        />
      )}
    </div>
  );
}
