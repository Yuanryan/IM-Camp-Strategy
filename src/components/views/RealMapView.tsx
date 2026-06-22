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

// 骰面點數位置（3×3 格，index 0..8）。
const PIPS: Record<number, number[]> = {
  1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};

// 骰面：1–6 顯示點數，其餘（卡片指定步數）顯示數字；發光顏色＝當前小隊色。
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
  const dot = Math.round(size * 0.13);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderColor: `${color}88`,
        boxShadow: `0 0 22px ${color}55, inset 0 0 14px ${color}22`,
      }}
      className={`grid shrink-0 grid-cols-3 grid-rows-3 rounded-2xl border-2 bg-slate-950/80 p-[14%] transition-transform ${
        rolling ? "scale-105" : ""
      }`}
    >
      {pip ? (
        Array.from({ length: 9 }).map((_, i) => (
          <span key={i} className="flex items-center justify-center">
            {pip.includes(i) && (
              <span
                style={{ width: dot, height: dot, background: color, boxShadow: `0 0 8px ${color}` }}
                className="rounded-full"
              />
            )}
          </span>
        ))
      ) : (
        <span
          style={{ color, gridColumn: "1 / span 3", gridRow: "1 / span 3" }}
          className="num flex items-center justify-center text-3xl font-black"
        >
          {value}
        </span>
      )}
    </div>
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

  // 逐格推進動畫
  useEffect(() => {
    if (!anim) return;
    if (anim.i >= anim.path.length - 1) {
      const t = setTimeout(() => setAnim(null), 280);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setAnim((a) => (a ? { ...a, i: a.i + 1 } : a)), 110);
    return () => clearTimeout(t);
  }, [anim]);

  useEffect(() => () => { if (rollTimer.current) clearInterval(rollTimer.current); }, []);

  if (!snap) return <p className="p-6 text-sm text-slate-400">載入中…</p>;
  const teams = snap.teams;
  const curIdx = teams.findIndex((t) => t.id === team);
  const cur = curIdx >= 0 ? teams[curIdx] : undefined;
  const teamColor = cur ? pieceColor(curIdx) : ACCENT;

  // 執行移動。steps 正向時播放逐格動畫；落地寫入 routing card（不自動切頁）。
  const move = async (payload: { steps?: number; toIndex?: number }) => {
    if (team === "" || !cur) { toast("請先選擇小隊", "err"); return; }
    if (busy) return;
    setBusy(true);
    const fromPos = cur.boardPos;
    try {
      const r = await postJson("/api/map/move", { teamId: team, ...payload });
      const target = r.landed as BoardSquare;
      // 逐格動畫（僅正向擲骰）
      if (payload.steps && payload.steps > 0) {
        const path = Array.from({ length: payload.steps + 1 }, (_, k) => (fromPos + k) % BOARD_SIZE);
        setAnim({ teamId: team, path, i: 0 });
      }
      await mutate();
      setLanded(target);
      if (r.passedStart) {
        toast(`${cur.name} 過起點 +收益`, "ok", r.undo as UndoRecipe | undefined);
      }
    } catch (e) {
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
    // 跳出 Shell 的 max-w-5xl 置中欄，讓中控台用滿視窗寬度（上限 1700）。
    <div className="relative left-1/2 w-screen -translate-x-1/2 px-4 sm:px-6">
    <div className="mx-auto flex h-[calc(100vh-140px)] min-h-[640px] max-w-[1700px] gap-4 max-lg:h-auto max-lg:flex-col">
      {/* ── 棋盤 ─────────────────────────────────────────────── */}
      {/* 用 container-query 的 cqmin 把地圖縮成「同時塞進寬與高」的正方形，避免裁切，
          且方形容器尺寸＝顯示圖框，% 疊放的棋子才會對齊。 */}
      <div
        className="relative min-w-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#0B1221] shadow-2xl max-lg:aspect-square max-lg:flex-none"
        style={{ containerType: "size" }}
      >
        <div className="absolute inset-0 m-auto" style={{ width: "100cqmin", height: "100cqmin" }}>
          <Image src="/map.png" alt="遊戲地圖" fill sizes="(min-width:1024px) 80vh, 100vw" className="object-contain" priority />

          {BOARD.map((sq) => {
            const occupants = teamsBySquare.get(sq.index) ?? [];
            const isCur = cur?.boardPos === sq.index && !anim;
            const isLanded = landed?.index === sq.index;
            return (
              <button
                key={sq.index}
                type="button"
                onClick={() => onSquareClick(sq)}
                title={`${sq.index}. ${sq.label}`}
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

      {/* ── 控制台（側欄）─────────────────────────────────────── */}
      <aside className="flex w-[360px] shrink-0 flex-col gap-3 overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/60 p-4 backdrop-blur-xl max-lg:w-full">
        {/* 1. 當前小隊 + 擲骰 */}
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
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

          {/* 骰子儀表 */}
          <div className="mt-4 flex items-center gap-4">
            <DieFace value={dieValue} color={teamColor} size={84} rolling={rolling} />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold tracking-wider text-slate-500">
                點選擲出的點數
              </div>
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
                  <Dice5 className="h-3.5 w-3.5" /> 系統擲骰
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

        {/* 3. 隊伍雷達 */}
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="mb-2 px-1 text-xs font-semibold tracking-wider text-slate-400">隊伍位置</div>
          <ul className="space-y-1">
            {teams.map((t, idx) => {
              const active = t.id === team;
              const c = pieceColor(idx);
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setTeam(t.id)}
                    style={active ? { borderColor: `${c}99`, background: `${c}1a` } : undefined}
                    className={`flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-left transition active:scale-[0.99] ${
                      active ? "" : "border-transparent hover:bg-white/5"
                    }`}
                  >
                    <span
                      style={{ background: c, boxShadow: `0 0 6px ${c}` }}
                      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/70 text-[10px] font-black text-slate-900"
                    >
                      {t.id}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-100">{t.name}</span>
                    <span className="shrink-0 text-xs text-slate-400">{boardSquareAt(t.boardPos).label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* 4. 微調 / 傳送 */}
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
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
    <section className={`relative rounded-xl border bg-white/[0.04] p-4 ${tone.ring} shadow-[0_0_20px_rgba(255,255,255,0.06)]`}>
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
