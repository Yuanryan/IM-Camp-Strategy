"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode, type PointerEvent as RPointerEvent, type WheelEvent as RWheelEvent } from "react";
import Image from "next/image";
import { useSnapshot, postJson, TeamSelect, toast, type MoneyRow } from "@/components/client";
import { PhaseDots, Num } from "@/components/ui";
import type { TeamView, ActiveItemView } from "@/lib/snapshot";
import { getTeamColorByIndex } from "@/lib/team-colors";
import {
  drawCard,
  useCardSettle,
  InstantCardPanel,
  TaskObjectivePanel,
  CursePanel,
  type DrawnCard,
} from "@/components/views/LuckDraw";
import {
  BOARD,
  BOARD_SIZE,
  boardSquareAt,
  squareToTab,
  squareHint,
  REGION_UI,
  EffectType,
  ITEM_GRADE_COLORS,
  applyToll,
  applyRoundIncome,
  applyCompoundInterest,
  applyPropertyDividend,
  stackEffects,
  movementMode,
  applyMovement,
  movementActionLabel,
  PASS_START_COINS,
  PASS_START_CARD_POINTS,
  LAND_START_COINS,
  LAND_START_CARD_POINTS,
  FREEBIE_TAB,
  type BoardSquare,
  type MapTab,
  type Freebie,
  type RegionCode,
  type UndoRecipe,
} from "@/lib/game";

import {
  MapPin,
  ChevronLeft,
  ChevronRight,
  Dice5,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";

// 右側控制台三段流程的名稱（指示箭頭顯示目標階段用）。
const PHASE_NAME: Record<1 | 2 | 3, string> = { 1: "移動", 2: "結算", 3: "抽卡" };

// ── 棋子配色（依小隊清單順序循環；色盤見 lib/team-colors.ts）────────
function pieceColor(team: Pick<TeamView, "color"> | undefined, idx: number): string {
  return team?.color ?? getTeamColorByIndex(idx).hex;
}
function pieceTextColor(team: Pick<TeamView, "colorText"> | undefined, idx: number): string {
  return team?.colorText ?? getTeamColorByIndex(idx).text;
}
function pieceRingColor(team: Pick<TeamView, "colorRing"> | undefined, idx: number): string {
  return team?.colorRing ?? getTeamColorByIndex(idx).ring;
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
  actionResult,
  clearActionResult,
  visible = true,
}: {
  team: number | "";
  setTeam: (id: number | "") => void;
  onLand: (target: { tab: MapTab; region?: RegionCode; freebie?: Freebie }) => void;
  // 分頁「完成」帶回的累計金流（label＝分頁名、delta＝淨變動、subRows＝可選文字子列）；
  // 併入階段 2 後由 clearActionResult 清掉。
  actionResult?: { label: string; delta: number; subRows?: { label: string; amount: number }[] } | null;
  clearActionResult?: () => void;
  visible?: boolean;
}) {
  const { snap, mutate } = useSnapshot(2500);
  const [steps, setSteps] = useState(1);
  // 已選取的主動移動道具（一次一件）；選取後其效果直接套用到擲骰步數與前進按鈕。
  const [selectedMoveId, setSelectedMoveId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [teleport, setTeleport] = useState(false);
  const [landed, setLanded] = useState<BoardSquare | null>(null);
  // 本回合是否已從操作分頁「完成」回來（金流已併入階段 2）：
  // 為 true 時階段 2 的按鈕改為「結束回合」（清隊伍、回階段 1），而非再次前往分頁。
  const [actionDone, setActionDone] = useState(false);
  // 右側面板流程階段：1 移動 / 2 結算結果 / 3 抽卡（GLOW・FOG 才可達）。
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  // 階段 3 就地抽到的即時卡。
  const [drawn, setDrawn] = useState<DrawnCard | null>(null);
  // 階段 3 抽卡結算摘要：套用 / 登記完成後顯示總結算 + 「回到地圖」。null = 尚未結算。
  const [cardResult, setCardResult] = useState<{ message: string; label?: string; finalDelta?: number; undo?: UndoRecipe } | null>(null);
  // 階段 2 結算結果（與 toast 同資料）：逐筆金流明細，於面板顯示。
  // result：本回合結算明細。noSettle=true 代表本次移動由卡片觸發、刻意不結算（顯示「本回合不結算」）；
  // rows 為空且非 noSettle → 正常移動但無金錢變動（顯示「本回合無結算項目」）。
  const [result, setResult] = useState<{ rows: MoneyRow[]; undo?: UndoRecipe; noSettle?: boolean } | null>(null);
  // 移動時快照任務列表，保持顯示直到結束回合（避免結算後 completedAt 非 null 導致任務從快照消失）。
  const [frozenObjectives, setFrozenObjectives] = useState<NonNullable<typeof cur>["objectives"]>([]);
  // 階段滑動：記錄 pointerdown 起點，放開時判定是否為水平滑動（切換階段）。
  const phaseSwipeRef = useRef<{ x: number; y: number; locked: boolean } | null>(null);
  // 拖曳中的即時水平位移（px）：讓滑動容器跟著手指走；放開後歸 0、由 transition 補完。
  const [phaseDrag, setPhaseDrag] = useState(0);
  // 滑動軌道寬度（量單頁寬度，用來把位移換算成百分比 / 限制拖曳範圍）。
  const phaseTrackRef = useRef<HTMLDivElement>(null);
  // 面板寬度鎖：量階段 1（最大）的渲染寬度，套到滑動容器 width，
  // 讓階段 2/3 維持同樣寬度、不縮水。
  const phase1Ref = useRef<HTMLDivElement>(null);
  const [phaseBoxW, setPhaseBoxW] = useState<number | null>(null);
  // 棋子逐格動畫：覆蓋某隊在地圖上的顯示位置
  const [anim, setAnim] = useState<{ teamId: number; path: number[]; i: number } | null>(null);
  const rollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── 地圖縮放 / 平移（Google Maps 風：滾輪 / 捏合縮放、拖曳平移）──
  const [zoomLevel, setZoomLevel] = useState(1); // 僅供按鈕顯示 / 是否可拖曳判斷；實際 transform 走 ref
  const [showOriginal, setShowOriginal] = useState(false); // 顯示原圖：隱藏棋子 / 過路費徽章
  const [twoFingerHint, setTwoFingerHint] = useState(false); // 單指觸控提示
  const twoFingerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const areaRef = useRef<HTMLDivElement>(null); // 棋盤外框（量中心點用）
  const viewRef = useRef<HTMLDivElement>(null); // 受 transform 的內層
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const panDragRef = useRef<{ sx: number; sy: number; bx: number; by: number; moved: boolean } | null>(null);
  const panMovedRef = useRef(false);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>()); // 目前按下的指標
  const pinchRef = useRef<{ startDist: number; startZoom: number; lastMid: { x: number; y: number } } | null>(null);
  const ctrlHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 桌機 / 橫向 iPad 的並排版面高度：量「本列頂端到可視區底部」的實際像素，
  // 不用 100dvh-178px 這種寫死的魔術數字（標題列 / 分頁列高度一變就會切掉棋盤底部，
  // 且捲動已鎖死無法捲回）。visualViewport 在 iPad 工具列顯示 / 隱藏時也會更新，
  // 故工具列固定可見後高度仍精準。lg 以下走縱向堆疊（max-lg:h-auto），不套用此高度。
  const rowRef = useRef<HTMLDivElement>(null);
  const [rowH, setRowH] = useState<number | null>(null);
  useEffect(() => {
    const measure = () => {
      const el = rowRef.current;
      if (!el) return;
      // 僅在並排版面（lg：寬度 ≥ 1024）才鎖定高度；縱向堆疊維持 auto 由內容撐開。
      if (window.innerWidth < 1024) { setRowH(null); return; }
      // Hidden via display:none (e.g. covered by another tab) → getBoundingClientRect returns 0;
      // skip to avoid locking height to the full viewport on next unhide.
      if (el.offsetParent === null) return;
      const top = el.getBoundingClientRect().top;
      const vh = window.visualViewport?.height ?? window.innerHeight;
      setRowH(Math.max(320, vh - top - 8)); // 留 8px 底部喘息
    };
    measure();
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("scroll", measure);
    // snapshot 載入後 DOM 才出現本列 → 下一個 frame 再量一次，確保取得正確 top。
    const raf = requestAnimationFrame(measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("scroll", measure);
    };
  }, [snap, visible]);

  const teamsBySquare = useMemo(() => {
    const m = new Map<number, { id: number; name: string; color: string; colorText: string; colorRing: string }[]>();
    (snap?.teams ?? []).forEach((t, idx) => {
      // 動畫進行中：以動畫位置覆蓋該隊
      const pos = anim && anim.teamId === t.id ? anim.path[anim.i] : t.boardPos;
      const list = m.get(pos) ?? [];
      list.push({
        id: t.id,
        name: t.name,
        color: pieceColor(t, idx),
        colorText: pieceTextColor(t, idx),
        colorRing: pieceRingColor(t, idx),
      });
      m.set(pos, list);
    });
    return m;
  }, [snap?.teams, anim]);

  // 逐格推進動畫（每格 90ms）。抵達終點後「停在目的格」等 snapshot 的 boardPos 追上才收尾，
  // 否則 anim 一清掉、棋子會閃回尚未更新的舊位置再跳回新位置（多支 API：移動 / 結算 / 過路費
  // 串接時尤其明顯）。boardPos 由 mutate 或 2.5s 輪詢更新後，本 effect（dep snap?.teams）重跑收尾。
  // 安全逾時設長（6s，遠大於正常 API 時間），僅防極端情況卡住，不會造成提早閃回。
  useEffect(() => {
    if (!anim) return;
    const last = anim.path.length - 1;
    if (anim.i >= last) {
      const committed = snap?.teams.find((t) => t.id === anim.teamId)?.boardPos;
      const caughtUp = committed === anim.path[last];
      const t = setTimeout(() => setAnim(null), caughtUp ? 120 : 6000);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setAnim((a) => (a ? { ...a, i: a.i + 1 } : a)), 90);
    return () => clearTimeout(t);
  }, [anim, snap?.teams]);

  useEffect(() => () => {
    if (rollTimer.current) clearInterval(rollTimer.current);
    if (ctrlHideTimer.current) clearTimeout(ctrlHideTimer.current);
    if (twoFingerTimer.current) clearTimeout(twoFingerTimer.current);
  }, []);

  // 換隊時清掉已選的移動道具（避免套用到別隊不存在的道具），關閉落地路由卡（屬上一隊），
  // 並把流程退回階段 1（重新驅動棋子）。
  useEffect(() => { setSelectedMoveId(null); setLanded(null); setDrawn(null); setCardResult(null); setResult(null); setActionDone(false); setPhase(1); setFrozenObjectives([]); }, [team]);

  // 分頁操作完成回傳金流 → 評估任務 → 併入階段 2 結算面板，刷新餘額並跳到階段 2，最後清掉來源。
  // 注意：mutate / clearActionResult 不放 deps，避免其 identity 變動重複觸發。
  const mutateRef = useRef(mutate);
  mutateRef.current = mutate;
  const clearActionResultRef = useRef(clearActionResult);
  clearActionResultRef.current = clearActionResult;
  useEffect(() => {
    if (!actionResult) return;
    const { label, delta, subRows } = actionResult;
    void (async () => {
      // 立即顯示分頁金流並切到階段 2，不等任務結算 API。
      setResult((prev) => {
        const rows = [...(prev?.rows ?? [])];
        if (delta !== 0 || (subRows && subRows.length > 0)) rows.push({ label, amount: delta, subRows });
        return { rows, undo: prev?.undo, noSettle: prev?.noSettle };
      });
      setPhase(2);
      setActionDone(true);
      clearActionResultRef.current?.();

      // 好運卡任務目標：在分頁操作完成後（買地、完成交易等）評估，讓同回合的行動也算數。
      // 在背景執行，完成後把任務獎勵列附加到 result。
      if (team !== "") {
        try {
          const os = await postJson("/api/map/objective/settle", { teamId: team });
          const objSettled = (os.settled ?? []) as { cardName: string; reward: number; undo: UndoRecipe }[];
          if (objSettled.length > 0) {
            setResult((prev) => {
              const rows = [...(prev?.rows ?? [])];
              for (const o of objSettled) rows.push({ label: `任務完成・${o.cardName}`, amount: o.reward });
              const extraUndoIds = objSettled.flatMap((o) => o.undo.ledgerIds);
              const prevUndo = prev?.undo;
              const undo: UndoRecipe | undefined = extraUndoIds.length
                ? { label: prevUndo?.label ?? "撤銷結算", ledgerIds: [...(prevUndo?.ledgerIds ?? []), ...extraUndoIds] }
                : prevUndo;
              return { rows, undo, noSettle: prev?.noSettle };
            });
          }
        } catch {
          /* 任務結算失敗不阻斷 */
        }
      }
      await mutateRef.current();
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionResult, team]);

  // 量階段 1 的渲染寬度 → 套到滑動容器 width，讓階段 2/3 維持同寬不縮水。
  useEffect(() => {
    if (phase !== 1) return;
    const measure = () => {
      const el = phase1Ref.current;
      if (el && el.offsetWidth > 0) setPhaseBoxW(el.offsetWidth);
    };
    measure();
    const raf = requestAnimationFrame(measure); // 字體 / 道具徽章載入後再量一次
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, [phase, snap]);

  // 兩指（捏合 / 拖移棋盤）時阻止瀏覽器捲動 / 縮放；單指放行給頁面捲動。
  // 必須用原生 non-passive 監聽，React 合成事件無法可靠 preventDefault。
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 2) e.preventDefault();
    };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, []);

  // 抽卡結算 hook（與 LuckDraw 同口徑：含動產加成 / 減免、undo、刷新）。
  // 必須在任何提前 return 之前呼叫（Rules of Hooks）；輸入由 snapshot 安全推導（可能尚未載入）。
  const settleTeam = snap?.teams.find((t) => t.id === team);
  const settler = useCardSettle({ team, curName: settleTeam?.name, items: settleTeam?.items ?? [], onDone: mutate });

  if (!snap) return <p className="p-6 text-sm text-slate-400">載入中…</p>;
  const teams = snap.teams;
  const curIdx = teams.findIndex((t) => t.id === team);
  const cur = curIdx >= 0 ? teams[curIdx] : undefined;
  const teamColor = cur ? pieceColor(cur, curIdx) : ACCENT;
  // 該隊的「提醒」道具：擲骰前進前先讓關主看到（前進時會自動消耗一次）。
  const reminders = (cur?.items ?? []).filter((i) => i.effectType === EffectType.REMINDER);
  // 該隊的「主動移動」道具：可在擲骰後以徽章選取，效果直接套到步數與前進按鈕，前進時消耗一次。
  const movements = (cur?.items ?? []).filter((i) => i.effectType === EffectType.MOVEMENT);
  // 目前選取的移動道具（一次一件）；若已不在清單（換隊 / 耗盡）則視為未選。
  const selectedMove = movements.find((m) => m.id === selectedMoveId) ?? null;
  // 套用選取道具後的「實際前進步數」：未選＝原始擲骰步數；已選＝依該道具效果換算。
  const effectiveSteps = selectedMove
    ? applyMovement(movementMode(selectedMove.condition), selectedMove.effectValue, Math.max(0, steps))
    : steps;

  // ── 流程階段（右側面板）：可達上限 + 抽卡相關 ──
  const event1 = (snap.activeEvents ?? []).includes(1);
  const isCardSquare = landed?.kind === "GLOW" || landed?.kind === "FOG";
  // 階段 2 需選隊才可達；階段 3 再加上落在抽卡格。
  const reachablePhase: 1 | 2 | 3 = team === "" ? 1 : isCardSquare ? 3 : 2;
  const goPhase = (p: number) => {
    if (p < 1 || p > reachablePhase) return;
    setPhase(p as 1 | 2 | 3);
  };

  // 階段滑動：水平位移 > 50px 且明顯大於垂直位移 → 切換階段（不攔截內部垂直捲動）。
  // 過程中即時更新 phaseDrag，讓軌道跟著手指走；放開歸 0 由 transition 滑入定位。
  const onPhasePointerDown = (e: RPointerEvent) => {
    phaseSwipeRef.current = { x: e.clientX, y: e.clientY, locked: false };
  };
  const onPhasePointerMove = (e: RPointerEvent) => {
    const s = phaseSwipeRef.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    // 尚未判定方向：垂直為主就放棄滑動（留給內部捲動）；水平為主才鎖定為滑頁。
    if (!s.locked) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dx) <= Math.abs(dy)) { phaseSwipeRef.current = null; return; }
      s.locked = true;
    }
    // 已到邊界（最前 / 最後階段）的方向加阻尼，給出「滑不動」的回饋。
    const atStart = phase <= 1 && dx > 0;
    const atEnd = phase >= reachablePhase && dx < 0;
    setPhaseDrag(atStart || atEnd ? dx * 0.25 : dx);
  };
  const onPhasePointerUp = (e: RPointerEvent) => {
    const s = phaseSwipeRef.current;
    phaseSwipeRef.current = null;
    setPhaseDrag(0);
    if (!s || !s.locked) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      goPhase(phase + (dx < 0 ? 1 : -1)); // 左滑＝下一階段、右滑＝上一階段
    }
  };
  const onPhasePointerCancel = () => {
    phaseSwipeRef.current = null;
    setPhaseDrag(0);
  };

  // 階段 3 抽卡：好運卡含即時獎勵卡與任務目標卡（後者抽到即登記）；厄運卡為即時卡。
  // 抽好運卡時排除該隊已有進行中的任務種類（避免同種堆疊）。
  const handleDraw = (side: "good" | "bad") => {
    if (team === "") { toast("請先選擇小隊", "err"); return; }
    const objs = cur?.objectives ?? [];
    const openArg = { kinds: new Set(objs.map((o) => o.taskKind)), count: objs.length };
    setCardResult(null);
    setDrawn(drawCard(side, openArg));
  };

  // move 類即時好運卡（向前躍進 / 時光倒流 / 傳送門）：就地用面板移動控制執行。
  // 文字含「前進」→ +2；「後退 / 倒流」→ toIndex −2（不重觸發過起點 / 過路費，同微調語意）；
  // 其餘（傳送門）→ 進入傳送模式，由關主點目標格。
  const runMapReward = (rewardText?: string) => {
    if (!cur) { toast("請先選擇小隊", "err"); return; }
    const t = rewardText ?? "";
    // 卡片觸發的移動一律 noSettle（不重觸發回合結算 / 過路費）。
    if (/前進|躍進/.test(t)) { void move({ steps: 2, noSettle: true }); }
    else if (/後退|倒流/.test(t)) { void move({ toIndex: cur.boardPos - 2, noSettle: true }); }
    else { setTeleport(true); toast("已開啟傳送：點地圖上目標格", "ok"); }
  };

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
  // useItemId：本次由主動移動道具觸發，伺服器會消耗該道具一次。
  // noSettle：本次由卡片獎勵觸發（向前躍進 / 時光倒流 / 傳送門），刻意不做回合結算 / 過路費。
  const move = async (payload: { steps?: number; toIndex?: number; useItemId?: number; noSettle?: boolean }) => {
    if (team === "" || !cur) { toast("請先選擇小隊", "err"); return; }
    if (busy) return; // 序列化網路請求，避免兩筆 POST 競爭同隊位置
    setBusy(true);
    setActionDone(false); // 新一次移動＝新落地，清掉上一回合「已完成」狀態
    setFrozenObjectives(cur.objectives); // 快照任務列表，結算後繼續顯示直到結束回合
    const fromPos = cur.boardPos;
    const isDiceMove = !!payload.steps && payload.steps > 0;
    const doSettle = isDiceMove && !payload.noSettle; // 卡片觸發的移動不結算

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
      // noSettle 純前端旗標，不送伺服器（只送 steps / toIndex / useItemId）。
      const r = await postJson("/api/map/move", {
        teamId: team,
        steps: payload.steps,
        toIndex: payload.toIndex,
        useItemId: payload.useItemId,
      });
      const target = r.landed as BoardSquare;

      // 擲骰前進＝該隊一回合 → 自動結算每輪收益。房收 / SPECTRA 卡點不依賴動產道具，
      // 且與動產收益同一次 API 結算，故只要 doSettle 就呼叫（無相關道具時後端回空 results）。
      let roundIncome = 0;
      let houseIncome = 0;
      let spectraPoints = 0;
      if (doSettle) {
        try {
          const s = await postJson("/api/host/round-income", { teamId: team });
          roundIncome = (s.results ?? []).reduce(
            (acc: number, x: { income: number }) => acc + (x.income ?? 0),
            0,
          );
          houseIncome = s.houseIncome ?? 0;
          spectraPoints = s.cardPoints ?? 0;
        } catch {
          /* 無收益 / 提醒道具等情況忽略 */
        }
      }

      // 踩到資產格且該區由他隊獨佔 → 自動收過路費（用落地前快照判定獨佔，移動不改變持有）。
      let tollPaid = 0;
      let tollPayee: string | null = null; // 收款的獨佔隊名（明細用）
      let tollUndo: UndoRecipe | undefined;
      let tollErr: string | null = null;
      if (doSettle && target.kind === "PROPERTY" && target.region) {
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
              tollPayee = ri.monopolyTeamName;
              tollUndo = tr.undo as UndoRecipe;
            } catch (e) {
              tollErr = e instanceof Error ? e.message : "過路費扣款失敗";
            }
          }
        }
      }

      await mutate();
      setLanded(target);
      setDrawn(null); // 新一次移動 → 清掉上一格抽到的即時卡
      setCardResult(null); // 清掉上一格抽卡結算摘要
      // 移動成功後清掉已選的移動道具（已消耗一次；下一回合重新選取）。
      if (payload.useItemId != null) setSelectedMoveId(null);

      // 金流明細（過起點 + 過路費 + 任務獎勵 合併 ledger，一鍵還原）：存進 result 供階段 2 面板顯示，並彈簡易 toast。
      if (tollErr) {
        setResult(null);
        toast(`${cur.name}・過路費未扣（${tollErr}），請至交易所手動收取`, "err");
      } else {
        const undoIds = [
          ...(r.passedStart && r.undo ? (r.undo as UndoRecipe).ledgerIds : []),
          ...(tollUndo ? tollUndo.ledgerIds : []),
        ];
        const undo = undoIds.length ? { label: "撤銷移動結算", ledgerIds: undoIds } : undefined;
        const rows: MoneyRow[] = [];
        if (r.passedStart) {
          rows.push({ label: "通過起點收益", amount: PASS_START_COINS, cardPoints: PASS_START_CARD_POINTS });
        }
        if (r.landedOnStart) {
          rows.push({ label: "中央燈塔收益", amount: LAND_START_COINS, cardPoints: LAND_START_CARD_POINTS });
        }
        // 回合收益列：僅在本回合確實結算（doSettle，即擲骰前進且非卡片觸發）時才列出。
        // 卡片觸發的移動（noSettle）不結算每輪收益 → 不列此列，面板顯示「本回合不結算」。
        if (doSettle) {
          // 來源：本隊持有的每輪收益 / 詛咒型道具（提醒類不計金額，排除）。
          // UNDERDOG（末位補貼）僅在該隊為全場最低淨值時才觸發 → 否則不列為來源（與伺服器一致）。
          // 詛咒道具（COINS_PER_ROUND 負值）會讓 roundIncome 變負或淨額抵銷，亦需列出。
          const minNW = Math.min(...teams.map((t) => t.netWorth));
          const isLast = cur.netWorth === minNW;
          const incomeItems = (cur.items ?? []).filter(
            (i) =>
              ROUND_GATE_TYPES.includes(i.effectType) &&
              i.effectType !== EffectType.REMINDER &&
              (i.effectType !== EffectType.UNDERDOG || isLast),
          );
          // 逐項拆分：用與 distributeRoundIncome 相同公式算出每個動產的貢獻（含負值詛咒），
          // 讓面板把「回合收益」按來源道具一條一條列出。基準值取移動前快照
          // （cur.coins / cur.propertyValue），與伺服器結算口徑一致。
          const breakdown = incomeItems
            .map((it) => {
              let amount = 0;
              if (it.effectType === EffectType.COINS_PER_ROUND) {
                amount = applyRoundIncome(it.effectValue);
              } else if (it.effectType === EffectType.COMPOUND_INTEREST) {
                amount = applyCompoundInterest(cur.coins, it.effectValue);
              } else if (it.effectType === EffectType.PROPERTY_DIVIDEND) {
                amount = applyPropertyDividend(cur.propertyValue, it.effectValue);
              } else if (it.effectType === EffectType.UNDERDOG) {
                amount = Math.round(it.effectValue);
              }
              return { item: it, amount };
            })
            .filter((b) => b.amount !== 0); // 含負值（詛咒扣款）
          // 有任何來源道具（含詛咒）或非零淨額就列出，net 為負時顯示為紅色扣款。
          if (incomeItems.length > 0 || roundIncome !== 0) {
            rows.push({ label: "回合收益", amount: roundIncome, items: incomeItems, breakdown });
          }
          // 不動產進階：獨佔 SPECTRA 卡點 / 1-3 房被動營收（後端已入帳，此處列出供關主檢視）。
          if (houseIncome > 0) {
            rows.push({ label: "房產營收", amount: houseIncome });
          }
          if (spectraPoints > 0) {
            rows.push({ label: "獨佔靈序：卡牌點數", amount: 0, cardPoints: spectraPoints });
          }
        }
        if (tollPaid > 0) {
          // 過路費減免來源：本隊套用到該區的 TOLL_PAID 道具（讓關主看出為何金額被打折）。
          const tollItems = (cur.items ?? []).filter(
            (i) => i.effectType === EffectType.TOLL_PAID && (!target.region || condMatchesRegion(i.condition, target.region)),
          );
          rows.push({ label: `過路費 → ${tollPayee ?? "獨佔隊"}`, amount: -tollPaid, items: tollItems });
        }
        // 卡片觸發（noSettle）→ 標記不結算；正常移動無變動 → 空 rows（面板顯示「本回合無結算項目」）。
        setResult({ rows, undo: rows.length ? undo : undefined, noSettle: payload.noSettle });
        const bits: string[] = [];
        if (roundIncome > 0) bits.push(`回合收益 +${roundIncome}`);
        if (houseIncome > 0) bits.push(`房產營收 +${houseIncome}`);
        if (spectraPoints > 0) bits.push(`卡點 +${spectraPoints}`);
        if (tollPaid > 0) bits.push(`付過路費 -${tollPaid}`);
        if (r.passedStart) bits.push("過起點 +收益");
        if (bits.length) toast(`${cur.name}・${bits.join("・")}`, "ok", undo);
      }
      // 擲骰前進（一回合）→ 自動推進到階段 2 結算結果；道具移動維持目前階段（不打斷流程）。
      if (isDiceMove) setPhase(2);
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
    setSelectedMoveId(null); // 重新擲骰即取消已選的移動道具，從原始骰數重新計算
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

  // 拖曳後緊接的 click 視為「平移」而非點格，避免誤觸傳送。
  const onSquareClick = (sq: BoardSquare) => {
    if (panMovedRef.current) return;
    if (teleport) { move({ toIndex: sq.index }); setTeleport(false); }
  };

  // 套用目前縮放 / 平移（直接改 DOM，平移期間不觸發 React 重繪，保持流暢）。
  const applyTransform = () => {
    const el = viewRef.current;
    if (el) el.style.transform = `translate(${panRef.current.x}px, ${panRef.current.y}px) scale(${zoomRef.current})`;
  };
  // 平移範圍夾住：縮放後不可把棋盤拖出視窗外。
  const clampPan = () => {
    const el = viewRef.current;
    if (!el) return;
    const max = (s: number) => Math.max(0, (s * (zoomRef.current - 1)) / 2);
    panRef.current.x = Math.max(-max(el.offsetWidth), Math.min(max(el.offsetWidth), panRef.current.x));
    panRef.current.y = Math.max(-max(el.offsetHeight), Math.min(max(el.offsetHeight), panRef.current.y));
  };
  const ZOOM_MIN = 1, ZOOM_MAX = 5;
  // 朝某「螢幕點」縮放（捏合 / 滾輪用）：調整 pan 讓該點下方的棋盤位置維持不動。
  const zoomAt = (z: number, sx: number, sy: number) => {
    const area = areaRef.current;
    const z1 = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
    if (area) {
      const rect = area.getBoundingClientRect();
      const cx = sx - (rect.left + rect.width / 2);
      const cy = sy - (rect.top + rect.height / 2);
      const k = z1 / zoomRef.current;
      panRef.current = {
        x: cx * (1 - k) + panRef.current.x * k,
        y: cy * (1 - k) + panRef.current.y * k,
      };
    }
    zoomRef.current = z1;
    setZoomLevel(z1);
    clampPan();
    applyTransform();
  };

  // ── 指標 / 觸控：1 指平移、2 指捏合縮放 ──
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
  const mid2 = (pts: { x: number; y: number }[]) => ({ x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 });
  const onPointerDown = (e: RPointerEvent) => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointersRef.current.values()];
    if (pts.length === 2) {
      // 兩指 → 取消單指提示，捏合縮放 + 兩指拖移（取消單指平移，鎖定兩指）
      if (twoFingerTimer.current) clearTimeout(twoFingerTimer.current);
      setTwoFingerHint(false);
      pinchRef.current = { startDist: dist(pts[0], pts[1]), startZoom: zoomRef.current, lastMid: mid2(pts) };
      panDragRef.current = null;
      panMovedRef.current = true;
      for (const id of pointersRef.current.keys()) {
        try { (e.currentTarget as HTMLElement).setPointerCapture(id); } catch { /* ignore */ }
      }
    } else if (pts.length === 1 && zoomRef.current > 1 && e.pointerType !== "touch") {
      // 單指平移：滑鼠 / 觸控筆。
      panDragRef.current = { sx: e.clientX, sy: e.clientY, bx: panRef.current.x, by: panRef.current.y, moved: false };
      panMovedRef.current = false;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } else if (pts.length === 1 && e.pointerType === "touch") {
      // 觸控單指：重置 panMoved，讓 tap 可正常觸發（傳送模式點格）。
      panMovedRef.current = false;
      // 傳送模式 + 已縮放：允許單指拖曳平移（touch-action 已設 none，不會與頁面捲動衝突）。
      if (teleport && zoomRef.current > 1) {
        panDragRef.current = { sx: e.clientX, sy: e.clientY, bx: panRef.current.x, by: panRef.current.y, moved: false };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }
    }
  };
  const onPointerMove = (e: RPointerEvent) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointersRef.current.values()];
    if (pts.length >= 2 && pinchRef.current) {
      const m = mid2(pts);
      const ratio = dist(pts[0], pts[1]) / pinchRef.current.startDist;
      zoomAt(pinchRef.current.startZoom * ratio, m.x, m.y); // 朝中點縮放
      // 兩指一起移動 → 跟著平移
      panRef.current = {
        x: panRef.current.x + (m.x - pinchRef.current.lastMid.x),
        y: panRef.current.y + (m.y - pinchRef.current.lastMid.y),
      };
      pinchRef.current.lastMid = m;
      clampPan();
      applyTransform();
      panMovedRef.current = true;
    } else if (pts.length === 1 && e.pointerType === "touch" && zoomRef.current > 1) {
      // 單指觸控拖動且已縮放：拖超過 0.5 秒才顯示「請用兩指」提示
      if (!twoFingerHint && !twoFingerTimer.current) {
        twoFingerTimer.current = setTimeout(() => {
          setTwoFingerHint(true);
          twoFingerTimer.current = setTimeout(() => { setTwoFingerHint(false); twoFingerTimer.current = null; }, 1500);
        }, 200);
      }
    } else if (panDragRef.current) {
      const d = panDragRef.current;
      const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) { d.moved = true; panMovedRef.current = true; }
      panRef.current = { x: d.bx + dx, y: d.by + dy };
      clampPan();
      applyTransform();
    }
  };
  const onPointerUp = (e: RPointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 0) panDragRef.current = null;
    // 傳送模式的觸控 tap：因為指標可能被容器 capture，按鈕的 onClick 不一定觸發 →
    // 直接用放開點下方的元素找出目標格並傳送（沒有平移才算 tap）。
    if (e.pointerType === "touch" && teleport && !panMovedRef.current) {
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const idxAttr = el?.closest<HTMLElement>("[data-sq-index]")?.dataset.sqIndex;
      if (idxAttr != null) { move({ toIndex: Number(idxAttr) }); setTeleport(false); }
    }
    if (e.pointerType === "touch") {
      // 手指放開：取消待顯示的提示（若尚未出現）
      if (twoFingerTimer.current) { clearTimeout(twoFingerTimer.current); twoFingerTimer.current = null; }
      setTwoFingerHint(false);
      // armHideControls(); // 觸控放開後 1 秒收起
    }
  };
  const onWheel = (e: RWheelEvent) => {
    zoomAt(zoomRef.current * (e.deltaY < 0 ? 1.12 : 1 / 1.12), e.clientX, e.clientY);
  };
  const pannable = zoomLevel > 1;

  // 骰面顯示「實際前進步數」：選了移動道具就顯示換算後的數字（與前進按鈕一致）。
  const dieValue = Math.max(1, effectiveSteps || 1);

  return (
    <div className="lg:relative lg:left-1/2 lg:w-screen lg:-translate-x-1/2 lg:px-6">
    {/* 高度由 rowRef 量得（本列頂端 → 可視區底部），而非寫死的 lvh/dvh 扣魔術數字：
        頁面捲動已鎖死，高度只要差一點棋盤底部就被切掉且捲不回來。量到實際像素最穩。
        rowH 為 null（lg 以下縱向堆疊）時回退到 h-auto 由內容撐開。*/}
    <div
      ref={rowRef}
      style={rowH != null ? { height: rowH } : undefined}
      className="relative mx-auto flex max-w-[1700px] gap-4 overflow-hidden overscroll-contain max-lg:h-auto max-lg:flex-col max-lg:overflow-visible"
    >
      {/* ── 棋盤 ─────────────────────────────────────────────── */}
      <div
        ref={areaRef}
        className={`relative min-w-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#0B1221] shadow-2xl max-lg:aspect-square max-lg:max-h-[60vh] max-lg:w-full max-lg:flex-none ${
          pannable ? "cursor-grab active:cursor-grabbing" : ""
        }`}
        // 傳送模式：touch-action none → 單指 tap / 拖曳都歸我們處理（不被頁面捲動搶走）。
        // 平時：pan-y → 單指可捲動頁面、瀏覽器不捏合縮放；兩指由原生 touchmove 接管。
        style={{ containerType: "size", touchAction: teleport ? "none" : "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <div
          ref={viewRef}
          className="absolute inset-0 m-auto origin-center"
          style={{ width: "100cqmin", height: "100cqmin" }}
        >
          <Image src="/map.png" alt="遊戲地圖" fill sizes="(min-width:1024px) 80vh, 100vw" className="object-contain select-none" draggable={false} priority />

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
            const monoTeam = monoIdx >= 0 ? teams[monoIdx] : undefined;
            const monoColor = monoIdx >= 0 ? pieceColor(monoTeam, monoIdx) : "#f43f5e";
            const monoTextColor = monoIdx >= 0 ? pieceTextColor(monoTeam, monoIdx) : "#0b1221";
            const monoRingColor = monoIdx >= 0 ? pieceRingColor(monoTeam, monoIdx) : "#f43f5e";
            return (
              <button
                key={sq.index}
                type="button"
                data-sq-index={sq.index}
                onClick={() => onSquareClick(sq)}
                title={`${sq.index}. ${sq.label}${tollable ? `（過路費 ${tollAmt} → ${ri!.monopolyTeamName}）` : ""}`}
                style={{ left: `${sq.x}%`, top: `${sq.y}%`, width: `${sq.w}%`, height: `${sq.h}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-md ${
                  teleport
                    ? "cursor-pointer bg-amber-300/15 ring-2 ring-amber-300/70 hover:bg-amber-300/30 transition"
                    : isLanded
                      ? "ring-2 ring-white/80 shadow-[0_0_18px_rgba(255,255,255,0.45)] transition"
                      : isCur
                        ? "cur-square"
                        : "cursor-default transition"
                }`}
              >
                {/* 當前小隊格：呼吸光暈疊層（opacity 動畫，iOS 相容）*/}
                {isCur && (
                  <span className="cur-square-glow pointer-events-none absolute inset-0 rounded-md" />
                )}
                {/* 過路費標示：獨佔隊配色的內框 + 金額徽章（尺寸隨棋盤縮放 cqmin）。顯示原圖時隱藏。*/}
                {!showOriginal && tollable && (
                  <span
                    className="pointer-events-none absolute inset-0 rounded-md"
                    style={{ boxShadow: `inset 0 0 0 0.4cqmin ${monoRingColor}cc, 0 0 1.2cqmin ${monoRingColor}55` }}
                  />
                )}
                {!showOriginal && tollable && (
                  <span
                    className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 whitespace-nowrap font-black leading-none shadow"
                    style={{ background: monoColor, color: monoTextColor, fontSize: "1.7cqmin", padding: "0.3cqmin 0.7cqmin", borderRadius: "1cqmin" }}
                  >
                    過路{tollAmt}
                  </span>
                )}
                {/* 獨佔效果指示移至投影頁（DominanceBadge 文字標籤），棋盤不再顯示 emoji。*/}
                {!showOriginal && occupants.length > 0 && (
                  <span className="pointer-events-none absolute inset-0">
                    {occupants.map((o, i) => {
                      const isActive = o.id === team;
                      const n = occupants.length;
                      // 同格有選取的小隊時，其他棋子淡化以凸顯所選隊。
                      const hasActiveHere = occupants.some((x) => x.id === team);
                      const dimmed = hasActiveHere && !isActive;
                      // 單一棋子置中；多棋子沿圓環散開（依索引等分角度），永不重疊。
                      // 半徑隨棋子數略增（2→2.6cqmin，多隊→上限約 3.4cqmin）。
                      const radius = n <= 1 ? 0 : Math.min(3.4, 1.8 + n * 0.25);
                      const angle = (i / n) * 2 * Math.PI - Math.PI / 2; // 從正上方起算
                      const dxCq = radius * Math.cos(angle); // 環狀位移（cqmin＝% of board）
                      const dyCq = radius * Math.sin(angle);
                      // ── Safari 安全定位：完全不用 cqmin 於 transform / margin（Safari 會忽略或錯算，
                      // 造成整個環偏移）。改用「格內 % 座標」：盤為正方 100cqmin，故 1cqmin = 1% of board，
                      // 換算成該格寬高的百分比 → left/top 純 %，translate(-50%,-50%) 只用 % 置中 dot 本身。
                      const leftPct = 50 + (dxCq / sq.w) * 100;
                      const topPct = 45 + (dyCq / sq.h) * 100;
                      return (
                        <span
                          key={o.id}
                          style={{
                            position: "absolute",
                            left: `${leftPct}%`,
                            top: `${topPct}%`,
                            transform: "translate(-50%, -50%)",
                            // 選取隊的棋子壓在過路費徽章（z-10）之上；其餘照舊 1/2 互疊。
                            zIndex: isActive ? 20 : 1,
                            opacity: dimmed ? 0.4 : undefined,
                          }}
                        >
                          <span
                            style={{
                              width: isActive ? "4.5cqmin" : "3cqmin",
                              height: isActive ? "4.5cqmin" : "3cqmin",
                              fontSize: "1.8cqmin",
                              background: o.color,
                              boxShadow: `0 0 ${isActive ? "1.8cqmin" : "1.05cqmin"} ${o.colorRing}`,
                              color: o.colorText,
                            }}
                            className={`inline-flex items-center justify-center rounded-full border-2 font-black text-slate-900 ${
                              isActive ? "cur-piece border-white" : "border-white/80 transition-all"
                            }`}
                          >
                            {o.id}
                          </span>
                        </span>
                      );
                    })}
                  </span>
                )}
              </button>
            );
          })}

          {/* 落地結算改於右側面板「階段 2」顯示（取代舊的浮動路由卡）。*/}
        </div>

        {/* ── 原圖切換鈕（互動後 3 秒自動隱藏）── */}
        {(
          <div
            className="absolute bottom-3 right-3 z-30"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <ZoomBtn
              label={showOriginal ? "顯示棋子 / 過路費" : "顯示原始地圖"}
              active={showOriginal}
              onClick={() => setShowOriginal((v) => !v)}
            >
              {showOriginal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </ZoomBtn>
          </div>
        )}
        {/* 兩指提示覆蓋層 */}
        {twoFingerHint && (
          <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
            <div className="rounded-2xl bg-black/50 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm">
              請用兩指縮放或平移地圖
            </div>
          </div>
        )}
        {/* 縮放倍率指示 */}
        {zoomLevel > 1 && (
          <div className="pointer-events-none absolute bottom-3 left-3 z-30 rounded-md border border-white/10 bg-slate-950/80 px-2 py-1 text-[11px] font-bold text-slate-300">
            {zoomLevel.toFixed(1)}×
          </div>
        )}
      </div>

      {/* ── 控制台（側欄）：三段流程（移動 / 結算 / 抽卡），分頁點切換、可左右滑動 ──
          外層 relative 包裝，讓階段指示箭頭可貼在面板左右兩側（面板本身 overflow-hidden）。*/}
      <div className="relative flex shrink-0 max-lg:w-full">
      <aside
        ref={phase1Ref}
        style={{ width: phaseBoxW ?? undefined }}
        className="flex w-[330px] shrink-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60 p-2.5 backdrop-blur-xl xl:w-[360px] max-lg:!w-full max-lg:h-auto max-lg:overflow-visible"
      >
        {/* 流程分頁點：指示目前階段 + 可點切換（階段 2/3 需有落地結果才可達）*/}
        <PhaseDots phase={phase} reachable={reachablePhase} color={teamColor} onJump={goPhase} />

        {/* 滑動視窗：水平滑動切換階段（不攔截內部垂直捲動），垂直留給頁面 / 內捲。
            三階段並排成軌道，靠 translateX 滑入；拖曳中跟著手指（phaseDrag）。*/}
        <div
          ref={phaseTrackRef}
          className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden"
          style={{ touchAction: "pan-y" }}
          onPointerDown={onPhasePointerDown}
          onPointerMove={onPhasePointerMove}
          onPointerUp={onPhasePointerUp}
          onPointerCancel={onPhasePointerCancel}
        >
        <div
          className="flex min-h-0 w-full flex-1"
          style={{
            transform: `translateX(calc(${-(phase - 1) * 100}% + ${phaseDrag}px))`,
            transition: phaseDrag ? "none" : "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
        {/* ── 階段 1：移動 ───────────────────────────────────── */}
        <div className="flex min-h-0 w-full min-w-0 shrink-0 flex-col gap-2 overflow-hidden">
        {/* 1. 當前小隊 + 擲骰 */}
        <section className="shrink-0 rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
          <div className="mb-2 flex items-center justify-between">
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
            <div
              data-scrollable
              className="mt-2 max-h-[5.5rem] space-y-1 overflow-y-auto overscroll-contain rounded-lg border border-amber-400/40 bg-amber-400/10 px-2.5 py-2"
            >
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
          <div className="mt-2.5 flex items-center gap-3">
            <DieFace value={dieValue} color={teamColor} size={66} rolling={rolling} />
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

          {/* 主動移動道具：以徽章呈現（同 sticky 頂列風格），可選取一件；選取後其效果
              直接套用到上方骰面與下方前進按鈕，前進時消耗一次。再點一次取消選取。*/}
          {movements.length > 0 && (
            <div
              data-scrollable
              className="mt-2.5 flex max-h-[4.5rem] flex-wrap items-center gap-1.5 overflow-y-auto overscroll-contain"
            >
              <span className="text-[11px] font-semibold text-slate-400">移動道具</span>
              {movements.map((m) => {
                const mode = movementMode(m.condition);
                const sel = selectedMoveId === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={team === "" || busy}
                    onClick={() => setSelectedMoveId((cur) => (cur === m.id ? null : m.id))}
                    title={m.description}
                    className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-medium transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
                      sel
                        ? "border-sky-400/70 bg-sky-500/20 text-sky-100 ring-1 ring-sky-400/70"
                        : `${ITEM_GRADE_COLORS[m.grade] ?? "chip"}`
                    }`}
                  >
                    <span className="font-bold opacity-70">{m.grade}</span>
                    <span className="max-w-[7rem] truncate">{m.name}</span>
                    <span className="font-mono text-sky-300">{movementActionLabel(mode, m.effectValue)}</span>
                    {m.usesRemaining !== null && <span className="text-slate-400">×{m.usesRemaining}</span>}
                  </button>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={() => move({ steps: effectiveSteps, useItemId: selectedMove?.id })}
            disabled={team === "" || effectiveSteps === 0 || busy}
            style={team !== "" && effectiveSteps !== 0 ? { background: teamColor } : undefined}
            className="mt-2.5 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-base font-black text-slate-950 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500"
          >
            {busy ? (
              "移動中…"
            ) : (
              <>
                前進 {effectiveSteps || 0} 格
                {selectedMove && (
                  <span className="rounded bg-black/25 px-1.5 py-0.5 text-xs font-bold">
                    {selectedMove.name} {movementActionLabel(movementMode(selectedMove.condition), selectedMove.effectValue)}
                  </span>
                )}
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </section>

        {/* 3. 隊伍雷達（佔據剩餘空間；雙欄精簡，必要時僅此處內部捲動）*/}
        <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-white/10 bg-white/[0.03] p-2.5 max-lg:flex-none">
          <div className="mb-1.5 px-1 text-xs font-semibold tracking-wider text-slate-400">隊伍位置</div>
          <ul
            data-scrollable
            className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-1 overflow-y-auto overscroll-contain max-lg:!min-h-fit max-lg:overflow-visible"
          >
            {teams.map((t, idx) => {
              const active = t.id === team;
              const c = pieceColor(t, idx);
              const textColor = pieceTextColor(t, idx);
              const ringColor = pieceRingColor(t, idx);
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
                      style={{ background: c, boxShadow: `0 0 8px ${ringColor}`, color: textColor }}
                      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-white/80 text-[10px] font-black text-slate-900"
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
        <section className="shrink-0 rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
          <div className="mb-1.5 px-1 text-xs font-semibold tracking-wider text-slate-400">移動選項 (不觸發結算 / 過路費) </div>
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
        </div>

        {/* ── 階段 2：結算結果 + 路由 ─────────────────────────── */}
        <div className="flex min-h-0 w-full min-w-0 shrink-0 flex-col overflow-hidden">
          <PhaseResult
            landed={landed}
            result={result}
            team={cur}
            objectives={[
              ...frozenObjectives,
              ...(cur?.objectives ?? []).filter((o) => !frozenObjectives.some((f) => f.id === o.id)),
            ].map((o) => ({
              ...o,
              done: o.done || (result?.rows ?? []).some((r) => r.label.includes(o.cardName)),
            }))}
            teamColor={teamColor}
            isCardSquare={isCardSquare}
            actionDone={actionDone}
            onGoTab={() => landed && onLand(squareToTab(landed))}
            onRoute={(square) => onLand(squareToTab(square))}
            onDraw={() => setPhase(3)}
            onDrawAt={(square) => { setLanded(square); setPhase(3); }}
            onEndTurn={() => setTeam("")}
          />
        </div>

        {/* ── 階段 3：抽卡（GLOW・FOG）─────────────────────────── */}
        <div className="flex min-h-0 w-full min-w-0 shrink-0 flex-col overflow-hidden">
          <section className="flex min-h-0 flex-1 flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-slate-400">
                {landed?.kind === "GLOW" ? "光源點・抽好運卡" : "迷霧區・抽厄運卡"}
              </span>
              {cur && <span className="text-xs text-slate-400">{cur.name}</span>}
            </div>
            {/* 尚未結算才顯示抽卡鈕；已結算（cardResult）則保留卡面、底部換成「回到地圖」。*/}
            {!cardResult && (
              <button
                type="button"
                disabled={team === ""}
                onClick={() => handleDraw(landed?.kind === "FOG" ? "bad" : "good")}
                className={`h-11 w-full rounded-xl text-sm font-bold transition active:scale-95 disabled:opacity-40 ${
                  landed?.kind === "FOG" ? "btn-rose" : "btn-amber"
                }`}
              >
                {drawn ? "重新抽卡" : landed?.kind === "FOG" ? "抽厄運卡" : "抽好運卡"}
              </button>
            )}
            {drawn && (
              <div data-scrollable className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {drawn.side === "good" && drawn.task ? (
                  <TaskObjectivePanel
                    drawn={drawn}
                    team={team}
                    registered={!!cardResult}
                    onRegistered={() => { void mutate(); setCardResult({ message: `已發放任務・${drawn.card.name}` }); }}
                  />
                ) : drawn.side === "curse" ? (
                  <CursePanel
                    drawn={drawn}
                    team={team}
                    registered={!!cardResult}
                    onRegistered={() => { void mutate(); setCardResult({ message: `已套用詛咒・${drawn.card.name}` }); }}
                  />
                ) : (
                  <InstantCardPanel
                    drawn={drawn}
                    settler={settler}
                    team={team}
                    event1={event1}
                    settled={!!cardResult}
                    onMapMove={(_reward, card) => runMapReward(card.rewardText)}
                    onRouteReward={(kind) => onLand({ tab: FREEBIE_TAB[kind], freebie: kind })}
                    onSettled={(r) => setCardResult(r
                      ? { ...r, label: drawn.card.name }
                      : { message: "已套用" }
                    )}
                  />
                )}
              </div>
            )}
            {cardResult && (
              <button
                type="button"
                onClick={() => {
                  if (cardResult.finalDelta != null && cardResult.label) {
                    const cardUndo = cardResult.undo;
                    setResult((prev) => {
                      const rows = [...(prev?.rows ?? []), { label: cardResult.label!, amount: cardResult.finalDelta! }];
                      const prevUndo = prev?.undo;
                      const undo: UndoRecipe | undefined = cardUndo
                        ? { label: prevUndo?.label ?? "撤銷結算", ledgerIds: [...(prevUndo?.ledgerIds ?? []), ...cardUndo.ledgerIds] }
                        : prevUndo;
                      return { rows, undo, noSettle: prev?.noSettle };
                    });
                  }
                  setActionDone(true);
                  setPhase(2);
                }}
                className="mt-auto flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-cyan-500 text-sm font-black text-slate-950 transition hover:bg-cyan-400 active:scale-[0.98]"
              >
                回到結算畫面 <ArrowLeft className="h-4 w-4" />
              </button>
            )}
          </section>
        </div>
        </div>
        </div>
      </aside>

      {/* 階段切換指示：浮在面板外側（左／右），無底色、含目標階段名稱（移動／結算／抽卡），
          提示可左右滑動切換；點擊亦可跳階。拖曳中淡出避免干擾。並排版面才顯示（縱向堆疊隱藏）。*/}
      {phase > 1 && (
        <button
          type="button"
          aria-label={`上一階段：${PHASE_NAME[(phase - 1) as 1 | 2 | 3]}`}
          onClick={() => goPhase(phase - 1)}
          style={{ opacity: phaseDrag ? 0 : undefined }}
          className="pointer-events-auto absolute -left-3.5 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-1 text-slate-400 transition-opacity duration-200 hover:text-slate-200 max-lg:hidden"
        >
          <ChevronLeft className="h-6 w-6" />
          <span className="text-[11px] font-bold tracking-wider [writing-mode:vertical-rl]">
            {PHASE_NAME[(phase - 1) as 1 | 2 | 3]}
          </span>
        </button>
      )}
      {phase < reachablePhase && (
        <button
          type="button"
          aria-label={`下一階段：${PHASE_NAME[(phase + 1) as 1 | 2 | 3]}`}
          onClick={() => goPhase(phase + 1)}
          style={{ color: teamColor, opacity: phaseDrag ? 0 : undefined }}
          className="pointer-events-auto absolute right-1 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-1 transition-opacity duration-200 max-lg:hidden"
        >
          <ChevronRight className="hint-swipe-x h-6 w-6" />
          <span className="text-[11px] font-bold tracking-wider [writing-mode:vertical-rl]">
            {PHASE_NAME[(phase + 1) as 1 | 2 | 3]}
          </span>
        </button>
      )}
      </div>
    </div>
    </div>
  );
}

// 階段 2：結算結果 + 路由（面板版的落地卡）。顯示停留格、金流明細（收入綠 / 支出紅、含淨變動），
// 以及下一步：抽卡格 → 進階段 3 抽卡；其餘格 → 前往對應分頁。
function PhaseResult({
  landed,
  result,
  team,
  objectives,
  teamColor,
  isCardSquare,
  actionDone,
  onGoTab,
  onRoute,
  onDraw,
  onDrawAt,
  onEndTurn,
}: {
  landed: BoardSquare | null;
  result: { rows: MoneyRow[]; undo?: UndoRecipe; noSettle?: boolean } | null;
  team?: TeamView;
  objectives: TeamView["objectives"];
  teamColor: string;
  isCardSquare: boolean;
  actionDone: boolean;
  onGoTab: () => void;
  onRoute: (square: BoardSquare) => void; // 前往任一格對應分頁（尚未落地時用棋子當前格）
  onDraw: () => void;
  onDrawAt: (square: BoardSquare) => void; // 尚未落地時於棋子當前抽卡格抽卡（先設落地格再進階段 3）
  onEndTurn: () => void;
}) {
  // 尚未落地（未移動）：比照「本回合不結算」呈現 —— 顯示不結算提示 + 該隊資產 / 進行中任務。
  // 下一步＝前往「棋子當前所在格」對應分頁（routing）；抽卡格（地圖中控站 GLOW/FOG）→ 前往抽卡；
  // START 格無分頁則收尾結束回合。
  if (!landed) {
    const here = team ? boardSquareAt(team.boardPos) : null;
    const hereIsCard = here?.kind === "GLOW" || here?.kind === "FOG";
    const hereTab = here ? squareToTab(here).tab : null;
    return (
      <section className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="rounded-lg border border-white/10 bg-slate-950/40 px-3 py-3 text-center text-sm font-semibold text-slate-400">
          本回合不結算
        </div>
        {team && <TeamAssetSummary team={team} net={0} />}
        {objectives.length > 0 && <ObjectiveList objectives={objectives} />}
        <div className="mt-auto">
          {hereIsCard && here ? (
            <button
              type="button"
              onClick={() => onDrawAt(here)}
              style={{ background: teamColor }}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-black text-slate-950 transition active:scale-[0.98]"
            >
              前往抽卡 <ArrowRight className="h-4 w-4" />
            </button>
          ) : here && hereTab && here.kind !== "START" ? (
            <button
              type="button"
              onClick={() => onRoute(here)}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 text-sm font-black text-slate-950 transition hover:bg-cyan-400 active:scale-[0.98]"
            >
              前往{TAB_LABEL[hereTab]} <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onEndTurn}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-black text-slate-950 transition hover:bg-emerald-400 active:scale-[0.98]"
            >
              <Check className="h-4 w-4" /> 結束回合
            </button>
          )}
        </div>
      </section>
    );
  }
  const tone = landingTone(landed);
  const { tab } = squareToTab(landed);
  const rows = result?.rows ?? [];
  const net = rows.reduce((s, r) => s + r.amount, 0);
  // 空結算的兩種訊息：卡片觸發＝刻意不結算；正常移動但無項目＝無結算項目。
  const emptyMsg = result?.noSettle ? "本回合不結算（卡片移動）" : "本回合無結算項目";
  return (
    <section className={`flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain rounded-xl border bg-white/[0.03] p-3 ${tone.ring}`}>
      <div>
        <div className="text-[11px] font-semibold tracking-wider text-slate-400">棋子停在</div>
        <div className="text-lg font-black text-slate-100">{landed.label}</div>
        <p className="mt-0.5 text-sm text-slate-300">{squareHint(landed)}</p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-slate-950/40 px-3 py-3 text-center text-sm font-semibold text-slate-400">
          {emptyMsg}
        </div>
      ) : (
        <div className="rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2">
          <div className="mb-1 text-[11px] font-bold tracking-wide text-slate-400">本次結算</div>
          {rows.map((r, i) => (
            <div key={i} className="border-b border-white/5 py-1 last:border-0">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-slate-200">{r.label}</span>
                <span className="flex items-center gap-2">
                  {r.cardPoints != null && r.cardPoints !== 0 && (
                    <span className="font-mono font-extrabold tabular-nums text-cyan-400">
                      +{r.cardPoints}pt
                    </span>
                  )}
                  {r.amount !== 0 && (
                    <span className={`font-mono font-extrabold tabular-nums ${r.amount > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {r.amount > 0 ? `+${r.amount}` : r.amount}
                    </span>
                  )}
                </span>
              </div>
              {/* 逐項拆分：回合收益按來源動產一條一條列出（左側 grade 徽章 + 右側該筆貢獻光幣）。*/}
              {r.breakdown && r.breakdown.length > 0 ? (
                <div className="mt-1 space-y-1">
                  {r.breakdown.map((b) => (
                    <div key={b.item.id} className="flex items-center justify-between gap-3 pl-2">
                      <span
                        title={b.item.description}
                        className={`inline-flex min-w-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${ITEM_GRADE_COLORS[b.item.grade] ?? "chip"}`}
                      >
                        <span className="shrink-0 font-bold opacity-70">{b.item.grade}</span>
                        <span className="max-w-[8rem] truncate">{b.item.name}</span>
                        <span className={`shrink-0 font-mono ${b.item.effectValue >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {itemEffectLabel(b.item)}
                        </span>
                      </span>
                      <span className={`shrink-0 font-mono text-xs tabular-nums ${b.amount >= 0 ? "text-emerald-400/90" : "text-rose-400/90"}`}>
                        {b.amount >= 0 ? `+${b.amount}` : b.amount}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                /* 無逐項拆分者（如過路費減免）退回顯示來源道具徽章（效果值文字）。*/
                r.items && r.items.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {r.items.map((it) => (
                      <ItemBadge key={it.id} item={it} />
                    ))}
                  </div>
                )
              )}
              {/* 文字子列（如命運輪盤：投入 / 拿回）：縮排顯示，header amount 為合計。*/}
              {r.subRows && r.subRows.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {r.subRows.map((s, j) => (
                    <div key={j} className="flex items-center justify-between gap-3 pl-2 text-xs">
                      <span className="text-slate-400">{s.label}</span>
                      <span className={`shrink-0 font-mono tabular-nums ${s.amount >= 0 ? "text-emerald-400/90" : "text-rose-400/90"}`}>
                        {s.amount >= 0 ? `+${s.amount}` : s.amount}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {rows.length > 1 && (
            <div className="mt-1 flex items-center justify-between gap-4 border-t border-white/10 pt-1 text-sm">
              <span className="font-bold text-slate-400">淨變動</span>
              <span className={`font-mono font-black tabular-nums ${net >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {net >= 0 ? `+${net}` : net}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 該隊目前資產價值（光幣 + 不動產現值 = 結算淨值），讓關主一眼掌握全局。*/}
      {team && <TeamAssetSummary team={team} net={net} />}

      {/* 該隊進行中好運卡任務目標（達標後回合結算自動發獎；與「本次結算」同卡片風格）。*/}
      {objectives.length > 0 && <ObjectiveList objectives={objectives} />}

      <div className="mt-auto">
        {actionDone ? (
          /* 已從操作分頁完成回來 → 結束本回合：清空選隊並退回階段 1，準備下一隊。*/
          <button
            type="button"
            onClick={onEndTurn}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-black text-slate-950 transition hover:bg-emerald-400 active:scale-[0.98]"
          >
            <Check className="h-4 w-4" /> 結束回合
          </button>
        ) : isCardSquare ? (
          <button
            type="button"
            onClick={onDraw}
            style={{ background: teamColor }}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-black text-slate-950 transition active:scale-[0.98]"
          >
            前往抽卡 <ArrowRight className="h-4 w-4" />
          </button>
        ) : landed.kind !== "START" ? (
          <button
            type="button"
            onClick={onGoTab}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 text-sm font-black text-slate-950 transition hover:bg-cyan-400 active:scale-[0.98]"
          >
            前往{TAB_LABEL[tab]} <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onEndTurn}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-black text-slate-950 transition hover:bg-emerald-400 active:scale-[0.98]"
          >
            <Check className="h-4 w-4" /> 結束回合
          </button>
        )}
      </div>
    </section>
  );
}

// 該隊目前資產價值卡（光幣 + 不動產現值 = 結算淨值）。net !== 0 時光幣顯示「原值 → 新值」。
// 階段 2（已落地結算）與「尚未落地」皆共用此卡。
function TeamAssetSummary({ team, net }: { team: TeamView; net: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2">
      <div className="mb-1 text-[11px] font-bold tracking-wide text-slate-400">{team.name}・目前資產價值</div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400">光幣</span>
        {net !== 0 ? (
          <span className="flex items-center gap-1.5 font-mono tabular-nums">
            <Num className="text-slate-500">{team.coins - net}</Num>
            <ArrowRight className="h-3 w-3 text-slate-500" />
            <Num className="neon-gold font-bold">{team.coins}</Num>
          </span>
        ) : (
          <Num className="neon-gold font-bold tabular-nums">{team.coins}</Num>
        )}
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400">不動產現值</span>
        <Num className="font-bold tabular-nums text-cyan-300">{team.propertyValue}</Num>
      </div>
      <div className="mt-1 flex items-center justify-between border-t border-white/10 pt-1 text-sm">
        <span className="font-bold text-slate-300">總資產價值</span>
        <Num className="font-black tabular-nums text-emerald-300">{team.netWorth}</Num>
      </div>
    </div>
  );
}

// 該隊進行中好運卡 / 詛咒任務目標清單（達標後回合結算自動發獎 / 解咒）。
function ObjectiveList({ objectives }: { objectives: TeamView["objectives"] }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2">
      <div className="mb-1 text-[11px] font-bold tracking-wide text-slate-400">進行中任務</div>
      {objectives.map((o) => (
        <div key={o.id} className="flex items-start justify-between gap-4 border-b border-white/5 py-1 text-sm last:border-0">
          <span className="min-w-0">
            {o.isCurse && <span className="mr-1 font-bold text-fuchsia-300">☠ 詛咒</span>}
            <span className="text-slate-200">{o.description}</span>
          </span>
          <span className={`shrink-0 font-mono font-extrabold tabular-nums ${o.done ? "text-emerald-400" : o.isCurse ? "text-rose-300" : "text-slate-400"}`}>
            {o.done ? (o.isCurse ? "已解咒 ✓" : "已完成任務 ✓") : `${o.current}/${o.target}`}
          </span>
        </div>
      ))}
    </div>
  );
}

// 道具效果值文字：每輪收益 +N/輪、補貼 +N光幣、其餘以百分比表示（過路費減免、複利、分紅等）。
function itemEffectLabel(item: ActiveItemView): string {
  // 負值（詛咒：每回合扣光幣）需顯示為「-100/輪」而非「+-100/輪」，故只在非負時加 +。
  const sign = item.effectValue >= 0 ? "+" : "";
  return item.effectType === EffectType.COINS_PER_ROUND
    ? `${sign}${item.effectValue}/輪`
    : item.effectType === EffectType.ALLIANCE_BONUS || item.effectType === EffectType.UNDERDOG
      ? `${sign}${item.effectValue}光幣`
      : `${sign}${(item.effectValue * 100).toFixed(0)}%`;
}

// 結算明細裡的來源道具徽章（grade 配色 + 名稱 + 效果值；title 顯示完整說明）。
function ItemBadge({ item }: { item: ActiveItemView }) {
  return (
    <span
      title={item.description}
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${ITEM_GRADE_COLORS[item.grade] ?? "chip"}`}
    >
      <span className="font-bold opacity-70">{item.grade}</span>
      <span className="max-w-[8rem] truncate">{item.name}</span>
      <span className={`font-mono ${item.effectValue >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{itemEffectLabel(item)}</span>
    </span>
  );
}

// 地圖縮放控制按鈕（毛玻璃方鈕，附 tooltip 標籤）。
function ZoomBtn({
  children,
  label,
  onClick,
  disabled,
  active,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`flex h-9 w-9 items-center justify-center rounded-lg border backdrop-blur-md transition active:scale-90 disabled:cursor-not-allowed disabled:opacity-30 ${
        active
          ? "border-amber-400/60 bg-amber-400/20 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.3)]"
          : "border-white/15 bg-slate-950/70 text-slate-200 hover:bg-slate-800/80"
      }`}
    >
      {children}
    </button>
  );
}
