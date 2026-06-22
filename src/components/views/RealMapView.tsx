"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useSnapshot, postJson, TeamSelect, toast } from "@/components/client";
import {
  BOARD,
  BOARD_SIZE,
  boardSquareAt,
  squareToTab,
  squareHint,
  REGION_UI,
  EffectType,
  applyToll,
  stackEffects,
  type BoardSquare,
  type MapTab,
  type RegionCode,
  type UndoRecipe,
} from "@/lib/game";
import {
  MapPin,
  ChevronLeft,
  ChevronRight,
  Dice5,
  ArrowRight,
  X,
} from "lucide-react";

// ── 棋子配色（依小隊清單順序循環）──────────────────────────────
const PIECE_COLORS = [
  "#fbbf24", "#22d3ee", "#f43f5e", "#34d399", "#a78bfa",
  "#f97316", "#38bdf8", "#e879f9", "#a3e635", "#fb7185",
];
function pieceColor(idx: number): string {
  return PIECE_COLORS[idx % PIECE_COLORS.length];
}
const ACCENT = "#22d3ee"; // 未選小隊時的中性主色

// 擲骰前進＝該隊的一回合，會自動結算這些「每輪收益 / 提醒」效果（呼叫 round-income）。
const ROUND_GATE_TYPES: string[] = [
  EffectType.COINS_PER_ROUND,
  EffectType.COMPOUND_INTEREST,
  EffectType.PROPERTY_DIVIDEND,
  EffectType.UNDERDOG,
  EffectType.REMINDER,
];

// 道具 condition（JSON）是否套用於某區（與 service.loadActiveEffects 一致）：
// null=無條件套用；{"region":X} 僅當區域相符才套用。
function condMatchesRegion(condition: string | null, region: string): boolean {
  if (!condition) return true;
  try {
    const c = JSON.parse(condition) as { region?: string };
    return !c.region || c.region === region;
  } catch {
    return false;
  }
}

// 骰面點數位置（3×3 格，index 0..8）。
const PIPS: Record<number, number[]> = {
  1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};
// 點在 100×100 viewBox 中的座標（與 PIPS index 對應）。
const PIP_XY: [number, number][] = [
  [28, 28], [50, 28], [72, 28],
  [28, 50], [50, 50], [72, 50],
  [28, 72], [50, 72], [72, 72],
];

// 骰面：用 SVG 畫，1–6 顯示點數、其餘顯示數字；發光顏色＝當前小隊色。
// SVG 不受 flex/grid/display 影響，必定顯示。
function DieFace({
  value,
  color,
  size,
  rolling = false,
}: {
  value: number;
  color: string;
  size: number;
  rolling?: boolean;
}) {
  const pip = PIPS[value];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`shrink-0 transition-transform ${rolling ? "scale-105" : ""}`}
      style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
    >
      <rect
        x="3" y="3" width="94" height="94" rx="18"
        fill="#020617"
        stroke={color}
        strokeWidth="3"
        opacity="0.95"
      />
      {pip ? (
        pip.map((i) => (
          <circle key={i} cx={PIP_XY[i][0]} cy={PIP_XY[i][1]} r="8.5" fill={color} />
        ))
      ) : (
        <text
          x="50" y="54"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="46"
          fontWeight="900"
          fill={color}
        >
          {value}
        </text>
      )}
    </svg>
  );
}

// 落地格的色調（不動產用區域色；其餘依種類）。
function landingTone(sq: BoardSquare): { chip: string; ring: string } {
  if (sq.kind === "PROPERTY" && sq.region) {
    const ui = REGION_UI[sq.region];
    return { chip: ui.chipBg, ring: ui.border };
  }
  const map: Record<string, { chip: string; ring: string }> = {
    GLOW: { chip: "bg-amber-500/15 text-amber-300", ring: "border-amber-400/40" },
    FOG: { chip: "bg-violet-500/15 text-violet-300", ring: "border-violet-400/40" },
    LOTTERY_REG: { chip: "bg-yellow-500/15 text-yellow-300", ring: "border-yellow-400/40" },
    LOTTERY_DRAW: { chip: "bg-yellow-500/15 text-yellow-300", ring: "border-yellow-400/40" },
    WHEEL: { chip: "bg-fuchsia-500/15 text-fuchsia-300", ring: "border-fuchsia-400/40" },
    SHOP: { chip: "bg-cyan-500/15 text-cyan-300", ring: "border-cyan-400/40" },
    START: { chip: "bg-emerald-500/15 text-emerald-300", ring: "border-emerald-400/40" },
  };
  return map[sq.kind] ?? { chip: "bg-white/10 text-slate-300", ring: "border-white/20" };
}

const TAB_LABEL: Record<MapTab, string> = {
  map: "地圖中控站",
  exchange: "交易所",
  shop: "神秘商店",
  lottery: "大樂透",
  wheel: "命運輪盤",
};

export function RealMapView({
  team,
  setTeam,
  onLand,
}: {
  team: number | "";
  setTeam: (id: number | "") => void;
  onLand: (target: { tab: MapTab; region?: RegionCode }) => void;
}) {
  const { snap, mutate } = useSnapshot(2500);
  const [steps, setSteps] = useState(1);
  const [busy, setBusy] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [teleport, setTeleport] = useState(false);
  const [landed, setLanded] = useState<BoardSquare | null>(null);
  // 棋子逐格動畫：覆蓋某隊在地圖上的顯示位置
  const [anim, setAnim] = useState<{ teamId: number; path: number[]; i: number } | null>(null);
  const rollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const teamsBySquare = useMemo(() => {
    const m = new Map<number, { id: number; name: string; colorIdx: number }[]>();
    (snap?.teams ?? []).forEach((t, idx) => {
      // 動畫進行中：以動畫位置覆蓋該隊
      const pos = anim && anim.teamId === t.id ? anim.path[anim.i] : t.boardPos;
      const list = m.get(pos) ?? [];
      list.push({ id: t.id, name: t.name, colorIdx: idx });
      m.set(pos, list);
    });
    return m;
  }, [snap?.teams, anim]);

  // 逐格推進動畫（每格 90ms）。抵達終點後「不立刻清除」——要等 snapshot 的 boardPos
  // 追上目標格才收尾，否則 anim 一清掉、棋子會閃回尚未更新的舊位置再跳回新位置。
  // 設定 1.2s 後備逾時，避免 mutate 失敗時動畫卡住。新移動會 setAnim(null) 中斷本動畫。
  useEffect(() => {
    if (!anim) return;
    const last = anim.path.length - 1;
    if (anim.i >= last) {
      const committed = snap?.teams.find((t) => t.id === anim.teamId)?.boardPos;
      const caughtUp = committed === anim.path[last];
      const t = setTimeout(() => setAnim(null), caughtUp ? 120 : 1200);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setAnim((a) => (a ? { ...a, i: a.i + 1 } : a)), 90);
    return () => clearTimeout(t);
  }, [anim, snap?.teams]);

  useEffect(() => () => { if (rollTimer.current) clearInterval(rollTimer.current); }, []);

  if (!snap) return <p className="p-6 text-sm text-slate-400">載入中…</p>;
  const teams = snap.teams;
  const curIdx = teams.findIndex((t) => t.id === team);
  const cur = curIdx >= 0 ? teams[curIdx] : undefined;
  const teamColor = cur ? pieceColor(curIdx) : ACCENT;
  // 該隊的「提醒」道具：擲骰前進前先讓關主看到（前進時會自動消耗一次）。
  const reminders = (cur?.items ?? []).filter((i) => i.effectType === EffectType.REMINDER);

  // 某區「所選小隊實付」的過路費：base × (1 + 獨佔隊 TOLL_INCOME + 該隊 TOLL_PAID)，
  // 並依道具 condition 篩選區域。未選小隊時只計獨佔隊的 TOLL_INCOME（顯示基準值）。
  // 與 service.payToll 同口徑，故地圖徽章＝實際扣款金額。
  const tollFor = (regionCode: string, baseToll: number, monopolyTeamId: number): number => {
    const monoItems = teams.find((t) => t.id === monopolyTeamId)?.items ?? [];
    const incomeDelta = stackEffects(
      monoItems
        .filter((i) => i.effectType === EffectType.TOLL_INCOME && condMatchesRegion(i.condition, regionCode))
        .map((i) => i.effectValue),
    );
    const paidDelta =
      team !== ""
        ? stackEffects(
            (cur?.items ?? [])
              .filter((i) => i.effectType === EffectType.TOLL_PAID && condMatchesRegion(i.condition, regionCode))
              .map((i) => i.effectValue),
          )
        : 0;
    return applyToll(baseToll, incomeDelta, paidDelta);
  };

  // 執行移動。steps 正向時播放逐格動畫；落地寫入 routing card（不自動切頁）。
  const move = async (payload: { steps?: number; toIndex?: number }) => {
    if (team === "" || !cur) { toast("請先選擇小隊", "err"); return; }
    if (busy) return; // 序列化網路請求，避免兩筆 POST 競爭同隊位置
    setBusy(true);
    const fromPos = cur.boardPos;
    const isDiceMove = !!payload.steps && payload.steps > 0;

    // 樂觀動畫：擲骰前進「立刻」開始走（路徑＝目前格 + 步數，與伺服器 advance 同算法），
    // 不等任何 API；棋子在等待結算 / 過路費期間維持在動畫途中 / 目的地，不會閃回原位。
    // 微調 / 傳送：直接吃 snapshot 位置（清掉殘留動畫）。
    if (isDiceMove) {
      const path = Array.from({ length: payload.steps! + 1 }, (_, k) => (fromPos + k) % BOARD_SIZE);
      setAnim({ teamId: team, path, i: 0 });
    } else {
      setAnim(null);
    }

    try {
      const r = await postJson("/api/map/move", { teamId: team, ...payload });
      const target = r.landed as BoardSquare;

      // 擲骰前進＝該隊一回合 → 自動結算每輪收益（僅當該隊持有相關道具，否則 API 會報錯）。
      let roundIncome = 0;
      if (isDiceMove && (cur.items ?? []).some((i) => ROUND_GATE_TYPES.includes(i.effectType))) {
        try {
          const s = await postJson("/api/host/round-income", { teamId: team });
          roundIncome = (s.results ?? []).reduce(
            (acc: number, x: { income: number }) => acc + (x.income ?? 0),
            0,
          );
        } catch {
          /* 無收益 / 提醒道具等情況忽略 */
        }
      }

      // 踩到資產格且該區由他隊獨佔 → 自動收過路費（用落地前快照判定獨佔，移動不改變持有）。
      let tollPaid = 0;
      let tollUndo: UndoRecipe | undefined;
      let tollErr: string | null = null;
      if (isDiceMove && target.kind === "PROPERTY" && target.region) {
        const ri = snap.regions.find((x) => x.code === target.region);
        // 僅當該區由他隊獨佔、且「實付」過路費 > 0（免疫道具可能扣到 0）才扣款。
        if (
          ri &&
          ri.monopolyTeamId != null &&
          ri.monopolyTeamId !== team &&
          (ri.toll ?? 0) > 0 &&
          tollFor(target.region, ri.toll, ri.monopolyTeamId) > 0
        ) {
          const prop = snap.properties.find((p) => p.region === target.region);
          if (prop) {
            try {
              const tr = await postJson("/api/exchange/toll", { propertyId: prop.id, payerTeamId: team });
              tollPaid = tr.toll ?? 0;
              tollUndo = tr.undo as UndoRecipe;
            } catch (e) {
              tollErr = e instanceof Error ? e.message : "過路費扣款失敗";
            }
          }
        }
      }

      await mutate();
      setLanded(target);

      // 整合提示與撤銷（過起點 + 過路費 合併 ledger，一鍵還原）。
      if (tollErr) {
        toast(`${cur.name}・過路費未扣（${tollErr}），請至交易所手動收取`, "err");
      } else {
        const undoIds = [
          ...(r.passedStart && r.undo ? (r.undo as UndoRecipe).ledgerIds : []),
          ...(tollUndo ? tollUndo.ledgerIds : []),
        ];
        const undo = undoIds.length ? { label: "撤銷移動結算", ledgerIds: undoIds } : undefined;
        const bits: string[] = [];
        if (roundIncome > 0) bits.push(`回合收益 +${roundIncome}`);
        if (tollPaid > 0) bits.push(`付過路費 -${tollPaid}`);
        if (r.passedStart) bits.push("過起點 +收益");
        if (bits.length) toast(`${cur.name}・${bits.join("・")}`, "ok", undo);
      }
    } catch (e) {
      // 移動 API 失敗 → 取消樂觀動畫，棋子回到實際（未移動）位置。
      setAnim(null);
      toast(e instanceof Error ? e.message : "移動失敗", "err");
    } finally {
      setBusy(false);
    }
  };

  const systemRoll = () => {
    if (rolling || busy || team === "") return;
    setRolling(true);
    let ticks = 0;
    rollTimer.current = setInterval(() => {
      setSteps(1 + Math.floor(Math.random() * 6));
      if (++ticks > 11) {
        if (rollTimer.current) clearInterval(rollTimer.current);
        setRolling(false);
      }
    }, 55);
  };

  const onSquareClick = (sq: BoardSquare) => {
    if (teleport) { move({ toIndex: sq.index }); setTeleport(false); }
  };

  const dieValue = Math.max(1, steps || 1);

  return (
    // 桌機（lg+）跳出 Shell 的 max-w-5xl 置中欄用滿視窗寬度（上限 1700）；
    // 行動裝置不跳出（避免 100vw 因捲軸寬溢出產生橫向捲動），維持正常欄寬堆疊。
    <div className="lg:relative lg:left-1/2 lg:w-screen lg:-translate-x-1/2 lg:px-6">
    <div className="mx-auto flex h-[calc(100dvh-178px)] max-w-[1700px] gap-4 overflow-hidden max-lg:h-auto max-lg:flex-col max-lg:overflow-visible">
      {/* ── 棋盤 ─────────────────────────────────────────────── */}
      {/* 用 container-query 的 cqmin 把地圖縮成「同時塞進寬與高」的正方形，避免裁切，
          且方形容器尺寸＝顯示圖框，% 疊放的棋子才會對齊。 */}
      <div
        className="relative min-w-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#0B1221] shadow-2xl max-lg:aspect-square max-lg:max-h-[60vh] max-lg:w-full max-lg:flex-none"
        style={{ containerType: "size" }}
      >
        <div className="absolute inset-0 m-auto" style={{ width: "100cqmin", height: "100cqmin" }}>
          <Image src="/map.png" alt="遊戲地圖" fill sizes="(min-width:1024px) 80vh, 100vw" className="object-contain" priority />

          {BOARD.map((sq) => {
            const occupants = teamsBySquare.get(sq.index) ?? [];
            const isCur = cur?.boardPos === sq.index && !anim;
            const isLanded = landed?.index === sq.index;
            // 過路費標示：資產格且該區由「他隊」獨佔（相對所選小隊；未選隊＝任何獨佔皆標示）。
            // 金額採「所選小隊實付」口徑（含 TOLL_INCOME / TOLL_PAID 道具），與自動扣款一致。
            const ri = sq.kind === "PROPERTY" && sq.region ? snap.regions.find((x) => x.code === sq.region) : undefined;
            const monopolyByOther = ri?.monopolyTeamId != null && ri.monopolyTeamId !== team && (ri.toll ?? 0) > 0;
            const tollAmt = monopolyByOther ? tollFor(sq.region!, ri!.toll, ri!.monopolyTeamId!) : 0;
            const tollable = monopolyByOther && tollAmt > 0;
            const monoIdx = tollable ? teams.findIndex((t) => t.id === ri!.monopolyTeamId) : -1;
            const monoColor = monoIdx >= 0 ? pieceColor(monoIdx) : "#f43f5e";
            return (
              <button
                key={sq.index}
                type="button"
                onClick={() => onSquareClick(sq)}
                title={`${sq.index}. ${sq.label}${tollable ? `（過路費 ${tollAmt} → ${ri!.monopolyTeamName}）` : ""}`}
                style={{ left: `${sq.x}%`, top: `${sq.y}%`, width: `${sq.w}%`, height: `${sq.h}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-md transition ${
                  teleport
                    ? "cursor-pointer bg-amber-300/15 ring-2 ring-amber-300/70 hover:bg-amber-300/30"
                    : isLanded
                      ? "ring-2 ring-white/80 shadow-[0_0_18px_rgba(255,255,255,0.45)]"
                      : isCur
                        ? "ring-2 ring-cyan-400/70 shadow-[0_0_14px_rgba(34,211,238,0.5)]"
                        : "cursor-default"
                }`}
              >
                {/* 過路費標示：獨佔隊配色的內框 + 金額徽章 */}
                {tollable && (
                  <span
                    className="pointer-events-none absolute inset-0 rounded-md"
                    style={{ boxShadow: `inset 0 0 0 2px ${monoColor}cc, 0 0 8px ${monoColor}55` }}
                  />
                )}
                {tollable && (
                  <span
                    className="pointer-events-none absolute left-1/2 top-px z-10 -translate-x-1/2 whitespace-nowrap rounded-full px-1 py-px text-[8px] font-black leading-none shadow"
                    style={{ background: monoColor, color: "#0b1221" }}
                  >
                    過路{tollAmt}
                  </span>
                )}
                {occupants.length > 0 && (
                  <span className="pointer-events-none absolute inset-0 flex flex-wrap items-center justify-center gap-0.5">
                    {occupants.map((o, i) => {
                      const isActive = o.id === team;
                      return (
                        <span
                          key={o.id}
                          title={o.name}
                          style={{
                            background: pieceColor(o.colorIdx),
                            boxShadow: `0 0 ${isActive ? 12 : 6}px ${pieceColor(o.colorIdx)}`,
                            marginLeft: i > 0 ? "-4px" : 0,
                          }}
                          className={`inline-flex items-center justify-center rounded-full border text-[9px] font-black text-slate-900 transition-all ${
                            isActive ? "h-5 w-5 border-white ring-2 ring-white/70" : "h-4 w-4 border-white/80"
                          }`}
                        >
                          {o.id}
                        </span>
                      );
                    })}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 控制台（側欄）：整頁不捲動，只有隊伍清單在空間不足時內部捲動 ── */}
      <aside className="flex w-[330px] shrink-0 flex-col gap-2.5 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60 p-3 backdrop-blur-xl xl:w-[380px] max-lg:w-full max-lg:overflow-visible">
        {/* 1. 當前小隊 + 擲骰 */}
        <section className="shrink-0 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-400">操作小隊</span>
            {cur && (
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                目前在
                <b className="text-slate-100">{boardSquareAt(cur.boardPos).label}</b>
              </span>
            )}
          </div>
          <TeamSelect teams={teams} value={team} onChange={setTeam} />

          {/* 本隊提醒道具（前進時自動消耗一次；先讓關主看到再擲骰）*/}
          {reminders.length > 0 && (
            <div className="mt-2 space-y-1 rounded-lg border border-amber-400/40 bg-amber-400/10 px-2.5 py-2">
              <div className="text-xs font-bold tracking-wide text-amber-300">⚑ 本隊提醒</div>
              {reminders.map((r) => (
                <div key={r.id} className="text-[11px] leading-snug text-amber-100/90">
                  <span className="font-semibold">{r.name}</span>
                  {r.usesRemaining !== null && (
                    <span className="text-amber-200/70">（剩 {r.usesRemaining} 次）</span>
                  )}
                  <span className="text-amber-200/70"> — {r.description}</span>
                </div>
              ))}
            </div>
          )}

          {/* 骰子儀表 */}
          <div className="mt-4 flex items-center gap-4">
            <DieFace value={dieValue} color={teamColor} size={78} rolling={rolling} />
            <div className="min-w-0 flex-1">
              <div className="mt-1.5 grid grid-cols-6 gap-1">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSteps(n)}
                    disabled={team === ""}
                    style={steps === n ? { borderColor: teamColor, color: teamColor } : undefined}
                    className={`flex h-8 items-center justify-center rounded-lg border text-sm font-black transition active:scale-90 disabled:opacity-30 ${
                      steps === n ? "bg-white/10" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <input
                  type="number"
                  inputMode="numeric"
                  value={steps}
                  onChange={(e) => setSteps(Number(e.target.value) || 0)}
                  className="h-8 w-14 rounded-lg border border-white/10 bg-black/30 text-center text-sm text-white outline-none focus:ring-2 focus:ring-cyan-500"
                  aria-label="自訂步數"
                />
                <button
                  type="button"
                  onClick={systemRoll}
                  disabled={team === "" || rolling || busy}
                  className="flex h-8 flex-1 items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 active:scale-95 disabled:opacity-30"
                >
                  <Dice5 className="h-3.5 w-3.5" /> 擲骰子
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => move({ steps })}
            disabled={team === "" || steps === 0 || busy}
            style={team !== "" && steps !== 0 ? { background: teamColor } : undefined}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-base font-black text-slate-950 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500"
          >
            {busy ? "移動中…" : <>前進 {steps || 0} 格 <ArrowRight className="h-5 w-5" /></>}
          </button>
        </section>

        {/* 2. 落地路由卡 */}
        {landed && <RoutingCard sq={landed} onGo={() => onLand(squareToTab(landed))} onClose={() => setLanded(null)} />}

        {/* 3. 隊伍雷達（佔據剩餘空間；雙欄精簡，必要時僅此處內部捲動）*/}
        <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="mb-2 px-1 text-xs font-semibold tracking-wider text-slate-400">隊伍位置</div>
          <ul className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-1 overflow-y-auto max-lg:max-h-72">
            {teams.map((t, idx) => {
              const active = t.id === team;
              const c = pieceColor(idx);
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setTeam(t.id)}
                    style={active ? { borderColor: `${c}99`, background: `${c}1a` } : undefined}
                    className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1 text-left transition-transform active:scale-[0.99] ${
                      active ? "" : "border-transparent hover:bg-white/5"
                    }`}
                  >
                    <span
                      style={{ background: c, boxShadow: `0 0 6px ${c}` }}
                      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/70 text-[10px] font-black text-slate-900"
                    >
                      {t.id}
                    </span>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate text-xs font-semibold text-slate-100">{t.name}</span>
                      <span className="block truncate text-[10px] text-slate-400">{boardSquareAt(t.boardPos).label}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* 4. 微調 / 傳送 */}
        <section className="shrink-0 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="mb-2 px-1 text-xs font-semibold tracking-wider text-slate-400">微調 / 傳送</div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || !cur}
              onClick={() => cur && move({ toIndex: cur.boardPos - 1 })}
              className="flex h-11 flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 active:scale-95 disabled:opacity-30"
              aria-label="後退一格"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              disabled={busy || !cur}
              onClick={() => cur && move({ toIndex: cur.boardPos + 1 })}
              className="flex h-11 flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 active:scale-95 disabled:opacity-30"
              aria-label="前進一格"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              type="button"
              disabled={busy || team === ""}
              onClick={() => setTeleport((v) => !v)}
              className={`flex h-11 flex-[1.6] items-center justify-center gap-1.5 rounded-xl border text-sm font-bold transition active:scale-95 disabled:opacity-30 ${
                teleport
                  ? "border-amber-400/60 bg-amber-400/20 text-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.3)]"
                  : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
              }`}
            >
              <MapPin className="h-4 w-4" /> {teleport ? "取消傳送" : "傳送"}
            </button>
          </div>
          {teleport && (
            <p className="mt-2 animate-pulse px-1 text-xs font-medium text-amber-300/90">
              點地圖上任一格，將該隊移到該格（不發起點收益）。
            </p>
          )}
        </section>
      </aside>
    </div>
    </div>
  );
}

// 落地路由卡：顯示停留格 + 一句行動指引 + 大顆「前往〔分頁〕」。
function RoutingCard({
  sq,
  onGo,
  onClose,
}: {
  sq: BoardSquare;
  onGo: () => void;
  onClose: () => void;
}) {
  const tone = landingTone(sq);
  const { tab } = squareToTab(sq);
  const showGo = sq.kind !== "START";
  return (
    <section className={`relative shrink-0 rounded-xl border bg-white/[0.04] p-3 ${tone.ring} shadow-[0_0_20px_rgba(255,255,255,0.06)]`}>
      <button
        type="button"
        onClick={onClose}
        className="absolute right-2 top-2 text-slate-500 transition hover:text-slate-200"
        aria-label="關閉"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="mb-1 text-[11px] font-semibold tracking-wider text-slate-400">棋子停在</div>
      <div className="flex items-center gap-2">
        <span className="text-lg font-black text-slate-100">{sq.label}</span>
        <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${tone.chip}`}>第 {sq.index} 格</span>
      </div>
      <p className="mt-1.5 text-sm text-slate-300">{squareHint(sq)}</p>
      {showGo && (
        <button
          type="button"
          onClick={onGo}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 text-sm font-black text-slate-950 transition hover:bg-cyan-400 active:scale-[0.98]"
        >
          前往{TAB_LABEL[tab]} <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </section>
  );
}
