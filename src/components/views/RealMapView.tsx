"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useSnapshot, postJson, TeamSelect, toast } from "@/components/client";
import { Card } from "@/components/Shell";
import {
  BOARD,
  boardSquareAt,
  squareToTab,
  squareHint,
  type BoardSquare,
  type MapTab,
  type RegionCode,
  type UndoRecipe,
} from "@/lib/game";
import { MapPin, Dices, ChevronLeft, ChevronRight } from "lucide-react";

// 棋子配色：依小隊在清單中的順序循環取色（與區域霓虹同調）。
const PIECE_COLORS = [
  "#fbbf24", // amber
  "#22d3ee", // cyan
  "#f43f5e", // rose
  "#34d399", // emerald
  "#a78bfa", // violet
  "#f97316", // orange
  "#38bdf8", // sky
  "#e879f9", // fuchsia
  "#a3e635", // lime
  "#fb7185", // pink
];
function pieceColor(idx: number): string {
  return PIECE_COLORS[idx % PIECE_COLORS.length];
}

export function RealMapView({
  team,
  setTeam,
  onLand,
}: {
  team: number | "";
  setTeam: (id: number | "") => void;
  // 棋子停留後，告知父層該切到哪個分頁、（不動產）預選哪一區。
  onLand: (target: { tab: MapTab; region?: RegionCode }) => void;
}) {
  const { snap, mutate } = useSnapshot(2500);
  const [steps, setSteps] = useState(1);
  const [busy, setBusy] = useState(false);
  const [teleport, setTeleport] = useState(false); // 點地圖格＝傳送模式
  // 落地提示（最近一次移動的停留格）
  const [lastLanded, setLastLanded] = useState<BoardSquare | null>(null);

  // 各格上的小隊（依 boardPos 分組，供疊放）
  const teamsBySquare = useMemo(() => {
    const m = new Map<number, { id: number; name: string; colorIdx: number }[]>();
    (snap?.teams ?? []).forEach((t, idx) => {
      const list = m.get(t.boardPos) ?? [];
      list.push({ id: t.id, name: t.name, colorIdx: idx });
      m.set(t.boardPos, list);
    });
    return m;
  }, [snap?.teams]);

  if (!snap) return <p className="text-sm text-slate-400">載入中…</p>;
  const teams = snap.teams;
  const cur = teams.find((t) => t.id === team);

  // 執行移動（steps 前進 或 toIndex 傳送），成功後切分頁 + 落地提示。
  const move = async (payload: { steps?: number; toIndex?: number }) => {
    if (team === "") {
      toast("請先選擇小隊", "err");
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const r = await postJson("/api/map/move", { teamId: team, ...payload });
      await mutate();
      const landed = r.landed as BoardSquare;
      setLastLanded(landed);
      onLand(squareToTab(landed));
      const passMsg = r.passedStart ? "（過起點 +收益）" : "";
      toast(`${cur?.name} 停在「${landed.label}」${passMsg}`, "ok", r.undo as UndoRecipe | undefined);
    } catch (e) {
      toast(e instanceof Error ? e.message : "移動失敗", "err");
    } finally {
      setBusy(false);
    }
  };

  // 點地圖上的某格：傳送模式時直接 toIndex，否則僅作預覽選取（不動）。
  const onSquareClick = (sq: BoardSquare) => {
    if (teleport) {
      move({ toIndex: sq.index });
      setTeleport(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── 控制列 ──────────────────────────────────────────── */}
      <Card title="棋子移動">
        <div className="flex flex-wrap items-center gap-3">
          <TeamSelect teams={teams} value={team} onChange={setTeam} />
          {cur ? (
            <span className="text-xs text-slate-400">
              目前在「<b className="text-slate-200">{boardSquareAt(cur.boardPos).label}</b>」
            </span>
          ) : (
            <span className="text-xs text-amber-300/80">⚠ 請先選擇小隊</span>
          )}
        </div>

        {/* 擲骰快捷 1–6 */}
        <div className="mt-3">
          <div className="mb-1.5 text-xs font-semibold text-slate-400">擲骰前進</div>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                type="button"
                disabled={busy || team === ""}
                onClick={() => move({ steps: n })}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-500/10 text-base font-black text-cyan-200 transition hover:bg-cyan-500/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {n}
              </button>
            ))}
            {/* 自訂步數 */}
            <div className="flex items-end gap-2">
              <label className="text-xs text-slate-400">
                <div className="mb-1">自訂步數</div>
                <input
                  type="number"
                  inputMode="numeric"
                  value={steps}
                  onChange={(e) => setSteps(Number(e.target.value) || 0)}
                  className="fld w-20"
                />
              </label>
              <button
                type="button"
                disabled={busy || team === "" || steps === 0}
                onClick={() => move({ steps })}
                className="btn-cyan inline-flex min-h-[2.75rem] items-center gap-1 rounded-xl px-3 text-sm font-semibold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Dices className="h-4 w-4" /> 前進
              </button>
            </div>
          </div>
        </div>

        {/* 微調 / 傳送 */}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
          <button
            type="button"
            disabled={busy || team === "" || cur == null}
            onClick={() => cur && move({ toIndex: cur.boardPos - 1 })}
            className="inline-flex min-h-[2.75rem] items-center gap-1 rounded-xl border border-white/12 bg-white/5 px-3 text-sm font-medium text-slate-200 transition hover:bg-white/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> 後退 1
          </button>
          <button
            type="button"
            disabled={busy || team === "" || cur == null}
            onClick={() => cur && move({ toIndex: cur.boardPos + 1 })}
            className="inline-flex min-h-[2.75rem] items-center gap-1 rounded-xl border border-white/12 bg-white/5 px-3 text-sm font-medium text-slate-200 transition hover:bg-white/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            前進 1 <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={busy || team === ""}
            onClick={() => setTeleport((v) => !v)}
            className={`inline-flex min-h-[2.75rem] items-center gap-1 rounded-xl border px-3 text-sm font-medium transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
              teleport
                ? "border-amber-400/60 bg-amber-400/15 text-amber-200 ring-1 ring-amber-400/40"
                : "border-white/12 bg-white/5 text-slate-200 hover:bg-white/10"
            }`}
          >
            <MapPin className="h-4 w-4" /> {teleport ? "點地圖選格…" : "傳送到指定格"}
          </button>
        </div>

        {/* 落地提示橫幅 */}
        {lastLanded && (
          <div className="mt-3 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2.5 text-sm">
            <span className="font-bold text-cyan-200">棋子停在「{lastLanded.label}」</span>
            <span className="ml-2 text-slate-300">→ {squareHint(lastLanded)}</span>
          </div>
        )}
      </Card>

      {/* ── 棋盤 ────────────────────────────────────────────── */}
      <Card title="遊戲地圖">
        {teleport && (
          <div className="mb-2 text-xs font-semibold text-amber-300">
            傳送模式：點任一格將該隊移到該格（不發起點收益）。
          </div>
        )}
        <div className="relative mx-auto aspect-square w-full max-w-[640px] overflow-hidden rounded-xl border border-white/10">
          <Image
            src="/map.png"
            alt="遊戲地圖"
            fill
            sizes="(max-width: 640px) 100vw, 640px"
            className="object-contain"
            priority
          />

          {/* 可點選的格子熱區（傳送 / 視覺定位） */}
          {BOARD.map((sq) => {
            const occupants = teamsBySquare.get(sq.index) ?? [];
            const isCur = cur?.boardPos === sq.index;
            return (
              <button
                key={sq.index}
                type="button"
                onClick={() => onSquareClick(sq)}
                title={`${sq.index}. ${sq.label}`}
                style={{ left: `${sq.x}%`, top: `${sq.y}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-md transition ${
                  teleport
                    ? "h-[9%] w-[9%] cursor-pointer ring-1 ring-amber-300/40 hover:bg-amber-300/20"
                    : isCur
                      ? "h-[9%] w-[9%] ring-2 ring-cyan-300/70"
                      : "h-[9%] w-[9%] cursor-default"
                }`}
              >
                {/* 棋子標記：同格多隊水平堆疊 */}
                {occupants.length > 0 && (
                  <span className="pointer-events-none absolute inset-0 flex flex-wrap items-center justify-center gap-0.5">
                    {occupants.map((o, i) => (
                      <span
                        key={o.id}
                        title={o.name}
                        style={{
                          background: pieceColor(o.colorIdx),
                          boxShadow: `0 0 6px ${pieceColor(o.colorIdx)}`,
                          marginLeft: i > 0 ? "-2px" : 0,
                        }}
                        className="inline-flex h-[44%] min-h-[10px] w-[44%] min-w-[10px] max-h-[18px] max-w-[18px] items-center justify-center rounded-full border border-white/70 text-[8px] font-black text-slate-900"
                      >
                        {o.id}
                      </span>
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 圖例：小隊 → 顏色 / 目前格 */}
        <div className="mt-3 flex flex-wrap gap-2">
          {teams.map((t, idx) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTeam(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs transition active:scale-95 ${
                t.id === team ? "border-cyan-400/50 bg-cyan-400/10" : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <span
                style={{ background: pieceColor(idx), boxShadow: `0 0 6px ${pieceColor(idx)}` }}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/70 text-[9px] font-black text-slate-900"
              >
                {t.id}
              </span>
              <span className="font-semibold text-slate-200">{t.name}</span>
              <span className="text-slate-500">{boardSquareAt(t.boardPos).label}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
