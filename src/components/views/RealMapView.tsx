"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode, type PointerEvent as RPointerEvent, type WheelEvent as RWheelEvent } from "react";
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

  // ── 地圖縮放 / 平移（Google Maps 風：滾輪 / 捏合縮放、拖曳平移）──
  const [zoomLevel, setZoomLevel] = useState(1); // 僅供按鈕顯示 / 是否可拖曳判斷；實際 transform 走 ref
  const [showOriginal, setShowOriginal] = useState(false); // 顯示原圖：隱藏棋子 / 過路費徽章
  const [controlsShown, setControlsShown] = useState(false); // 控制叢集是否顯示（互動後幾秒自動隱藏）
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
    revealControls();
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
      // 單指平移只給滑鼠 / 觸控筆；觸控單指保留給瀏覽器捲動頁面（避免與頁面捲動衝突）。
      panDragRef.current = { sx: e.clientX, sy: e.clientY, bx: panRef.current.x, by: panRef.current.y, moved: false };
      panMovedRef.current = false;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
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
    if (e.pointerType === "touch") {
      // 手指放開：取消待顯示的提示（若尚未出現）
      if (twoFingerTimer.current) { clearTimeout(twoFingerTimer.current); twoFingerTimer.current = null; }
      setTwoFingerHint(false);
      armHideControls(); // 觸控放開後 1 秒收起
    }
  };
  const onWheel = (e: RWheelEvent) => {
    revealControls();
    zoomAt(zoomRef.current * (e.deltaY < 0 ? 1.12 : 1 / 1.12), e.clientX, e.clientY);
  };
  const pannable = zoomLevel > 1;

  // 控制叢集顯示 / 隱藏：互動時顯示，3 秒無操作自動隱藏。
  const revealControls = () => {
    if (ctrlHideTimer.current) clearTimeout(ctrlHideTimer.current);
    setControlsShown(true);
    ctrlHideTimer.current = setTimeout(() => { setControlsShown(false); }, 3000);
  };
  const armHideControls = () => {
    if (ctrlHideTimer.current) clearTimeout(ctrlHideTimer.current);
    ctrlHideTimer.current = setTimeout(() => { setControlsShown(false);}, 1000);
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
        ref={areaRef}
        className={`relative min-w-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#0B1221] shadow-2xl max-lg:aspect-square max-lg:max-h-[60vh] max-lg:w-full max-lg:flex-none ${
          pannable ? "cursor-grab active:cursor-grabbing" : ""
        }`}
        // touch-action: pan-y → 單指可捲動頁面、瀏覽器不捏合縮放；兩指由原生 touchmove 接管
        style={{ containerType: "size", touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onMouseEnter={revealControls}
        onMouseLeave={armHideControls}
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
                    style={{ background: monoColor, color: "#0b1221", fontSize: "2.1cqmin", padding: "0.3cqmin 0.7cqmin", borderRadius: "1cqmin" }}
                  >
                    過路{tollAmt}
                  </span>
                )}
                {!showOriginal && occupants.length > 0 && (
                  <span className="pointer-events-none absolute inset-0 flex flex-wrap items-center justify-center">
                    {occupants.map((o, i) => {
                      const isActive = o.id === team;
                      return (
                        <span
                          key={o.id}
                          title={o.name}
                          style={{
                            width: isActive ? "5.2cqmin" : "4.2cqmin",
                            height: isActive ? "5.2cqmin" : "4.2cqmin",
                            fontSize: "2.2cqmin",
                            background: pieceColor(o.colorIdx),
                            boxShadow: `0 0 ${isActive ? "1.6cqmin" : "0.9cqmin"} ${pieceColor(o.colorIdx)}`,
                            marginLeft: i > 0 ? "-1cqmin" : 0,
                          }}
                          className={`inline-flex items-center justify-center rounded-full border font-black text-slate-900 transition-all ${
                            isActive ? "border-white ring-2 ring-white/70" : "border-white/80"
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

        {/* ── 原圖切換鈕（互動後 3 秒自動隱藏）── */}
        {controlsShown && (
          <div
            className="absolute bottom-3 right-3 z-30"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseEnter={revealControls}
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
