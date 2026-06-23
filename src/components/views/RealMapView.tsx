"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode, type CSSProperties, type PointerEvent as RPointerEvent, type WheelEvent as RWheelEvent } from "react";
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
  ITEM_GRADE_COLORS,
  applyToll,
  stackEffects,
  movementMode,
  applyMovement,
  movementActionLabel,
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
  Eye,
  EyeOff,
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
  // 已選取的主動移動道具（一次一件）；選取後其效果直接套用到擲骰步數與前進按鈕。
  const [selectedMoveId, setSelectedMoveId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [teleport, setTeleport] = useState(false);
  const [landed, setLanded] = useState<BoardSquare | null>(null);
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
  }, [snap]);

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

  // 換隊時清掉已選的移動道具（避免套用到別隊不存在的道具），並關閉落地路由卡（屬上一隊）。
  useEffect(() => { setSelectedMoveId(null); setLanded(null); }, [team]);

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

  if (!snap) return <p className="p-6 text-sm text-slate-400">載入中…</p>;
  const teams = snap.teams;
  const curIdx = teams.findIndex((t) => t.id === team);
  const cur = curIdx >= 0 ? teams[curIdx] : undefined;
  const teamColor = cur ? pieceColor(curIdx) : ACCENT;
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
  const move = async (payload: { steps?: number; toIndex?: number; useItemId?: number }) => {
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
      // 移動成功後清掉已選的移動道具（已消耗一次；下一回合重新選取）。
      if (payload.useItemId != null) setSelectedMoveId(null);

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
      className="mx-auto flex max-w-[1700px] gap-4 overflow-hidden overscroll-contain max-lg:h-auto max-lg:flex-col max-lg:overflow-visible"
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
            const monoColor = monoIdx >= 0 ? pieceColor(monoIdx) : "#f43f5e";
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
                    style={{ boxShadow: `inset 0 0 0 0.4cqmin ${monoColor}cc, 0 0 1.2cqmin ${monoColor}55` }}
                  />
                )}
                {!showOriginal && tollable && (
                  <span
                    className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 whitespace-nowrap font-black leading-none shadow"
                    style={{ background: monoColor, color: "#0b1221", fontSize: "1.7cqmin", padding: "0.3cqmin 0.7cqmin", borderRadius: "1cqmin" }}
                  >
                    過路{tollAmt}
                  </span>
                )}
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
                              background: pieceColor(o.colorIdx),
                              boxShadow: `0 0 ${isActive ? "1.6cqmin" : "0.9cqmin"} ${pieceColor(o.colorIdx)}`,
                            }}
                            className={`inline-flex items-center justify-center rounded-full border font-black text-slate-900 ${
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

          {/* 落地路由卡：浮在地圖上、貼在停留格的正下方 */}
          {landed && (
            <MapRoutingCard
              sq={landed}
              onGo={() => onLand(squareToTab(landed))}
              onClose={() => setLanded(null)}
            />
          )}
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

      {/* ── 控制台（側欄）：整頁不捲動，只有隊伍清單在空間不足時內部捲動 ── */}
      <aside className="flex w-[300px] shrink-0 flex-col gap-2 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60 p-2.5 backdrop-blur-xl xl:w-[360px] max-lg:h-auto max-lg:w-full max-lg:overflow-visible">
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
      </aside>
    </div>
    </div>
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

// 落地路由卡：顯示停留格 + 一句行動指引 + 大顆「前往〔分頁〕」。
// 浮在地圖上的落地路由卡：座標系與棋格相同（盤為 100cqmin 正方，1cqmin = 1% of board）。
// 預設貼在停留格正下方並水平置中；靠近盤底時改貼在格子上方，靠左右邊時夾住避免溢出。
function MapRoutingCard({
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

  // 卡片實際高度（cqmin）。高度由內容決定，固定估值會讓底部夾不準（內容多時溢出底圈格）。
  // 量出卡身像素高 ÷ 棋盤像素邊長 × 100 → 換成 cqmin，回饋給下方夾住計算。
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardHCq, setCardHCq] = useState(22); // 估值；量到後覆蓋
  useEffect(() => {
    const el = cardRef.current;
    const board = el?.offsetParent as HTMLElement | null; // 100cqmin 正方棋盤
    if (!el || !board) return;
    const measure = () => {
      const side = Math.min(board.clientWidth, board.clientHeight) || 1;
      setCardHCq((el.offsetHeight / side) * 100);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(board);
    return () => ro.disconnect();
  }, [sq]);

  // 座標系與棋格相同（盤為 100cqmin 正方）。卡片可蓋住中央插畫，但絕不能蓋到
  // 外圈格子（棋子所在）。外圈格帶約佔每邊 RING；卡片整體落在中央安全區
  // [RING, 100-RING]，但會「跟著棋子」沿安全區邊緣滑動，再夾住避免壓到任何格子。
  const RING = 17; // 外圈格帶寬（cqmin）
  const SAFE_MIN = RING;
  const SAFE_MAX = 100 - RING;
  const CARD_W = 40; // 卡片寬（cqmin）；以左上角為定位點
  const CARD_H = cardHCq; // 卡片實高（cqmin，量得）；用於夾住與三角定位
  const GAP = 0.8;

  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

  let leftCq: number;
  let topCq: number;

  // 棋子在左 / 右欄 → 卡片往盤內水平展開，垂直跟著棋子；其餘 → 往盤內垂直展開，水平跟著棋子。
  const fromLeft = sq.x < RING;
  const fromRight = sq.x > 100 - RING;

  if (fromLeft || fromRight) {
    // 水平貼著該欄內緣往盤內；垂直中心跟隨棋子（夾在安全區內）。
    leftCq = fromLeft ? sq.x + sq.w / 2 + GAP : sq.x - sq.w / 2 - GAP - CARD_W;
    const cy = clamp(sq.y, SAFE_MIN + CARD_H / 2, SAFE_MAX - CARD_H / 2);
    topCq = cy - CARD_H / 2;
  } else {
    // 垂直貼著該排內緣往盤內；水平中心跟隨棋子（夾在安全區內）。
    const fromTop = sq.y < 50;
    topCq = fromTop ? sq.y + sq.h / 2 + GAP : sq.y - sq.h / 2 - GAP - CARD_H;
    const cx = clamp(sq.x, SAFE_MIN + CARD_W / 2, SAFE_MAX - CARD_W / 2);
    leftCq = cx - CARD_W / 2;
  }

  // 最終再夾一次左上角，確保整張卡都在安全區內，絕不壓到外圈格子。
  leftCq = clamp(leftCq, SAFE_MIN, SAFE_MAX - CARD_W);
  topCq = clamp(topCq, SAFE_MIN, SAFE_MAX - CARD_H);

  const style: CSSProperties = {
    left: `${leftCq}cqmin`,
    top: `${topCq}cqmin`,
    width: `${CARD_W}cqmin`,
  };

  // ── 指向棋子的小三角 ──
  // 依棋子相對卡片框的位置決定三角落在哪一邊：超出卡左/右 → 左/右；超出卡上/下 → 上/下。
  // 角格會同時明顯超出兩軸 → 用對角（topLeft / topRight / bottomLeft / bottomRight），
  // 三角貼在卡片該角、指向對角方向（修正角格箭頭）。
  const overLeft = leftCq - sq.x; // >0：棋子在卡左外
  const overRight = sq.x - (leftCq + CARD_W); // >0：棋子在卡右外
  const overTop = topCq - sq.y; // >0：棋子在卡上外
  const overBottom = sq.y - (topCq + CARD_H); // >0：棋子在卡下外
  const hOut = Math.max(overLeft, overRight, 0);
  const vOut = Math.max(overTop, overBottom, 0);
  const DIAG = 2.5; // 兩軸皆超出此量（cqmin）即視為對角（角格）
  const isDiagonal = hOut > DIAG && vOut > DIAG;
  const horiz = overLeft >= overRight ? "left" : "right"; // 主要水平方向
  const vert = overTop >= overBottom ? "top" : "bottom"; // 主要垂直方向
  type ArrowSide = "left" | "right" | "top" | "bottom" | "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
  const arrowSide: ArrowSide = isDiagonal
    ? (`${vert === "top" ? "top" : "bottom"}${horiz === "left" ? "Left" : "Right"}` as ArrowSide)
    : hOut >= vOut
      ? horiz
      : vert;

  // 三角沿該邊的位置：對齊棋子中心，轉成佔卡片該軸的百分比，留邊距避免跑到圓角外。
  const SIZE = 1.6; // 三角邊長（cqmin）
  const off = `-${SIZE / 2}cqmin`; // 三角中心壓在卡邊上
  const along =
    arrowSide === "left" || arrowSide === "right"
      ? clamp(((sq.y - topCq) / CARD_H) * 100, 14, 86)
      : clamp(((sq.x - leftCq) / CARD_W) * 100, 14, 86);
  const isCorner = arrowSide.length > 6; // topLeft / topRight / bottomLeft / bottomRight

  // ── 正交邊：旋轉 45° 的方塊，角直直朝棋子戳出；只描朝棋子的兩邊，與卡框連續。 ──
  const sideStyles: Record<string, CSSProperties> = {
    left: { left: off, top: `${along}%`, marginTop: off },
    right: { right: off, top: `${along}%`, marginTop: off },
    top: { top: off, left: `${along}%`, marginLeft: off },
    bottom: { bottom: off, left: `${along}%`, marginLeft: off },
  };
  const squareBorderClass: Record<string, string> = {
    left: "border-b border-l",
    right: "border-t border-r",
    top: "border-t border-l",
    bottom: "border-b border-r",
  };
  const squareStyle: CSSProperties = {
    position: "absolute",
    width: `${SIZE}cqmin`,
    height: `${SIZE}cqmin`,
    background: "rgb(2 6 23 / 0.85)", // 與卡片底色一致
    transform: "rotate(45deg)",
    ...sideStyles[arrowSide],
  };

  // ── 對角（角格）：和正交邊同款「旋轉 45° 的方塊」，但往斜對角推出卡角。 ──
  // 旋轉後方塊的四個尖點朝上下左右；把方塊往斜對角平移，使「朝棋子那一點」露出卡角外
  // 成為尖端，對側點壓進卡身相連，再描出朝棋子的兩條外緣 → 與卡框連續的斜向箭頭。
  const D = SIZE * 0.2; // 沿各軸往卡外推的量（cqmin）；露出一個尖角、另一點仍咬住卡身
  const triPos: Record<string, CSSProperties> = {
    bottomRight: { bottom: `-${D}cqmin`, right: `-${D}cqmin` },
    bottomLeft: { bottom: `-${D}cqmin`, left: `-${D}cqmin` },
    topRight: { top: `-${D}cqmin`, right: `-${D}cqmin` },
    topLeft: { top: `-${D}cqmin`, left: `-${D}cqmin` },
  };
  // 旋轉 45° 後，朝棋子的兩條外緣 = 露在外面那一點兩側的邊。
  const triBorderClass: Record<string, string> = {
    bottomRight: "border-b border-r",
    bottomLeft: "border-b border-l",
    topRight: "border-t border-r",
    topLeft: "border-t border-l",
  };
  const triStyle: CSSProperties = {
    position: "absolute",
    width: `${SIZE}cqmin`,
    height: `${SIZE}cqmin`,
    background: "rgb(2 6 23 / 0.85)", // 與卡片底色一致
    ...triPos[arrowSide],
  };

  return (
    <div ref={cardRef} className="pointer-events-none absolute z-30" style={style}>
      <section
        className={`pointer-events-auto relative rounded-xl border bg-slate-950/85 p-3 backdrop-blur-md ${tone.ring} shadow-[0_8px_30px_rgba(0,0,0,0.55)]`}
      >
        {isCorner ? (
          <span aria-hidden className={`${tone.ring} ${triBorderClass[arrowSide]}`} style={triStyle} />
        ) : (
          <span aria-hidden className={`${tone.ring} ${squareBorderClass[arrowSide]}`} style={squareStyle} />
        )}
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
    </div>
  );
}
