"use client";

// 流動關卡計時器（單一事實來源）。
// useGameTimer：倒數狀態 + 控制；TimerRing：說明階段大圓環（可手動調整）；TimerPill：進行中固定角落小膠囊。
// 由呼叫端（GameSession）持有狀態，同一份倒數可同時餵給兩種外觀。
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Num } from "@/components/ui";
import { Pause, Play, RotateCcw, Timer as TimerIcon, Maximize2, GripVertical } from "lucide-react";

const MAX_SEC = 99 * 60 + 59;
const clampSec = (n: number) => Math.max(0, Math.min(MAX_SEC, Math.floor(n)));
const mmss = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;

export type GameTimer = ReturnType<typeof useGameTimer>;

export function useGameTimer(initialSec = 0, onComplete?: () => void) {
  const [sec, setSec] = useState(clampSec(initialSec));
  const [totalSec, setTotalSec] = useState(clampSec(initialSec)); // 圓環滿格基準
  const [running, setRunning] = useState(false);

  // 最新的 onComplete 存 ref，避免把它放進 effect 依賴而重啟 interval（在 effect 內更新，勿於 render 期間寫 ref）
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  // 倒數：每秒 -1，歸零時停並觸發 onComplete（在事件回呼中呼叫，非 effect 同步 setState）
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSec((s) => {
        if (s > 1) return s - 1;
        setRunning(false);
        onCompleteRef.current?.();
        return 0;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const setTime = (n: number) => {
    const v = clampSec(n);
    setSec(v);
    setTotalSec(v);
  };
  return {
    sec, totalSec, running,
    setTime,
    adjust: (d: number) => setTime(sec + d),
    setMinutes: (m: number) => setTime((Number.isFinite(m) ? Math.max(0, m) : 0) * 60 + (sec % 60)),
    setSeconds: (s: number) => setTime(Math.floor(sec / 60) * 60 + (Number.isFinite(s) ? Math.min(59, Math.max(0, s)) : 0)),
    start: () => { if (sec > 0) setRunning(true); },
    pause: () => setRunning(false),
    toggle: () => setRunning((r) => (r ? false : sec > 0)),
    reset: () => { setRunning(false); setSec(0); setTotalSec(0); },
  };
}

// 大圓環（說明階段）：暫停時可點分 / 秒直接輸入、±微調；timer 為 useGameTimer 回傳值。
export function TimerRing({ timer }: { timer: GameTimer }) {
  const { sec, totalSec, running } = timer;
  const isDanger = running && sec <= 10 && sec > 0;

  const stroke = 8;
  const normalizedRadius = 120 - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = totalSec > 0 ? circumference - (sec / totalSec) * circumference : circumference;

  return (
    <div className="flex flex-col items-center gap-6 rounded-lg border border-white/5 bg-slate-950/50 p-6">
      <div className="relative flex h-[260px] w-[260px] items-center justify-center md:h-[300px] md:w-[300px]">
        <svg className="absolute inset-0 h-full w-full -rotate-90 transform" viewBox="0 0 240 240">
          <circle cx="120" cy="120" r={normalizedRadius} fill="transparent" strokeWidth={stroke} className="stroke-slate-800/50" />
          <circle
            cx="120" cy="120" r={normalizedRadius} fill="transparent" strokeWidth={stroke}
            strokeDasharray={circumference + " " + circumference}
            style={{ strokeDashoffset, transition: "stroke-dashoffset 1s linear" }}
            strokeLinecap="round"
            className={`transition-colors duration-300 ${
              isDanger ? "stroke-rose-500 drop-shadow-[0_0_8px_rgba(225,29,72,0.4)]" : "stroke-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.25)]"
            }`}
          />
        </svg>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`absolute transition-all duration-500 ease-out ${running ? "translate-y-0 scale-[1.15] md:scale-[1.2]" : "-translate-y-5 scale-100 md:-translate-y-6"}`}>
            {running ? (
              <Num className={`font-mono text-6xl font-black tracking-widest md:text-7xl ${
                isDanger ? "animate-pulse text-rose-500 drop-shadow-[0_0_15px_rgba(225,29,72,0.8)]" : "text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]"
              }`}>
                {mmss(sec)}
              </Num>
            ) : (
              <div className="flex items-center justify-center py-2 font-mono text-6xl font-black leading-none tracking-widest text-slate-200 md:text-7xl">
                <TimeField value={Math.floor(sec / 60)} max={99} align="right" label="分鐘" onCommit={timer.setMinutes} />
                <span className="px-0.5">:</span>
                <TimeField value={sec % 60} max={59} align="left" label="秒數" onCommit={timer.setSeconds} />
              </div>
            )}
          </div>

          {/* ±微調（暫停時顯示） */}
          <div className={`absolute flex gap-2 transition-all duration-500 ease-out ${running ? "pointer-events-none translate-y-16 scale-90 opacity-0 md:translate-y-20" : "translate-y-10 scale-100 opacity-100 md:translate-y-12"}`}>
            {[["-30s", -30], ["+30s", 30], ["+1m", 60]].map(([label, d]) => (
              <button key={label as string} onClick={() => timer.adjust(d as number)}
                className="flex items-center justify-center rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-300 transition-colors hover:bg-white/20 active:scale-95 md:text-sm">
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2 flex w-full gap-3 md:px-8">
        <button onClick={timer.toggle} disabled={sec === 0}
          className={`group flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-4 text-base font-bold tracking-widest transition-all active:scale-[0.98] disabled:scale-100 disabled:opacity-40 md:py-5 md:text-lg ${
            running ? "border border-amber-500/50 bg-amber-500/20 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:bg-amber-500/30"
                    : "border border-cyan-500/50 bg-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:bg-cyan-500/30"
          }`}>
          {running ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
        </button>
        <button onClick={timer.reset}
          className="group flex max-w-[120px] flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-sm font-bold text-slate-400 transition-all hover:border-rose-500/30 hover:bg-rose-500/20 hover:text-rose-300 active:scale-[0.98] md:py-5 md:text-base">
          <RotateCcw className="h-5 w-5 opacity-80 transition-opacity group-hover:opacity-100" />
        </button>
      </div>
    </div>
  );
}

// 固定角落小膠囊（進行中）：mm:ss + 暫停 / 繼續，點 mm:ss 可呼叫 onExpand 展開大圓環。
// 可拖曳：在觸控或滑鼠上按住整個膠囊（非按鈕區）拖移到螢幕任意位置。
export function TimerPill({ timer, onExpand }: { timer: GameTimer; onExpand?: () => void }) {
  const { sec, running } = timer;
  const isDanger = sec <= 10 && sec > 0;
  const ended = sec === 0;

  // 拖曳狀態：pos=null 表示尚未定位（mount 後會錨到遊戲卡片右上角）。
  // 用「同一事件串流內的指標位移量」累加，避免 clientX 與 getBoundingClientRect 座標空間不一致
  // （例如裝置模擬 / 縮放）造成的固定偏移。drag 含上次指標位置、目前 pill 左上座標、膠囊尺寸。
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ lastX: number; lastY: number; x: number; y: number; w: number; h: number } | null>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  // 不被 portal 出去的錨點：留在卡片內，用來量「遊戲卡片」在視窗中的位置，定出初始右上角座標
  const anchorRef = useRef<HTMLSpanElement>(null);

  // 透過 portal 掛到 <body>：避免被 .glass 的 backdrop-filter（會替 fixed 子元素建立 containing block）
  // 當成定位基準，導致膠囊錨在卡片左上而非視窗。portal 需在 mount 後才有 document。
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // mount 後把初始位置定在所屬遊戲卡片的右上角（往內縮 12px）。pillRef 此時已 portal 完成。
  useEffect(() => {
    if (!mounted || pos) return;
    const card = anchorRef.current?.closest("section");
    const cardRect = card?.getBoundingClientRect();
    const w = pillRef.current?.offsetWidth ?? 160;
    const h = pillRef.current?.offsetHeight ?? 48;
    if (cardRect) {
      setPos(clampToViewport(cardRect.right - w - 12, cardRect.top + 12, w, h));
    } else {
      // 找不到卡片就退回右下角
      setPos(clampToViewport(window.innerWidth - w - 16, window.innerHeight - h - 16, w, h));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // 夾在可視區域內：x/y 不得超出 [0, viewport - 膠囊尺寸]
  const clampToViewport = (x: number, y: number, w: number, h: number) => ({
    x: Math.max(0, Math.min(window.innerWidth - w, x)),
    y: Math.max(0, Math.min(window.innerHeight - h, y)),
  });

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    const el = pillRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    e.currentTarget.setPointerCapture(e.pointerId);
    // 以目前實際位置與尺寸為基準（拖曳期間尺寸不變），之後只累加位移量
    drag.current = { lastX: e.clientX, lastY: e.clientY, x: rect.left, y: rect.top, w: rect.width, h: rect.height };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    d.x += e.clientX - d.lastX;
    d.y += e.clientY - d.lastY;
    d.lastX = e.clientX;
    d.lastY = e.clientY;
    const c = clampToViewport(d.x, d.y, d.w, d.h);
    d.x = c.x; // 把夾住後的值寫回，避免拖出邊界後「累積債務」需反向拖很久才回來
    d.y = c.y;
    setPos(c);
  };

  const endDrag = (e: React.PointerEvent) => {
    if (drag.current && e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    drag.current = null;
  };

  // 視窗縮放時把膠囊拉回可視範圍內，避免卡在畫面外
  useEffect(() => {
    if (!pos) return;
    const onResize = () => {
      const el = pillRef.current;
      const w = el?.offsetWidth ?? 160;
      const h = el?.offsetHeight ?? 48;
      setPos((p) => (p ? clampToViewport(p.x, p.y, w, h) : p));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pos]);

  const style: React.CSSProperties = {
    // touchAction:none → 觸控拖曳時不觸發頁面捲動 / 下拉刷新（否則會與拖曳衝突、視覺視窗位移）
    touchAction: "none",
    maxWidth: "calc(100vw - 2rem)",
    ...(pos
      ? { position: "fixed", left: pos.x, top: pos.y, bottom: "auto", right: "auto" }
      : { position: "fixed", bottom: "1rem", right: "1rem" }),
  };

  return (
    <>
      {/* 量測用錨點：留在卡片 DOM 內（不被 portal），用來定出初始右上角座標 */}
      <span ref={anchorRef} className="hidden" aria-hidden="true" />
      {mounted &&
        createPortal(
          <div
            ref={pillRef}
            style={style}
            className="z-30 flex cursor-grab items-center gap-1.5 rounded-full border border-white/15 bg-slate-900/90 py-2 pl-2 pr-3 shadow-lg shadow-black/40 backdrop-blur-md active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {/* 拖曳把手：三點，提示可拖移 */}
            <GripVertical className="h-4 w-4 shrink-0 text-slate-500" aria-label="拖曳移動" />
            <TimerIcon className={`h-4 w-4 ${ended ? "text-rose-400" : "text-cyan-400"}`} />
            <button onClick={onExpand} title="展開計時器"
              className={`font-mono text-xl font-black tabular-nums tracking-wider ${
                ended ? "animate-pulse text-rose-400" : isDanger ? "animate-pulse text-rose-400" : "text-cyan-300"
              }`}>
              {mmss(sec)}
            </button>
            <button onClick={timer.toggle} disabled={ended}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/10 text-slate-200 transition hover:bg-white/20 active:scale-95 disabled:opacity-40">
              {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
            {onExpand && (
              <button onClick={onExpand} className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/15 active:scale-95" title="展開">
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

// 浮動計時器：角落小膠囊；點擊展開成置中大圓環覆蓋層（可調整 / 啟動）。多處共用。
export function FloatingTimer({
  timer, expanded, setExpanded,
}: {
  timer: GameTimer; expanded: boolean; setExpanded: (v: boolean) => void;
}) {
  if (expanded) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" onClick={() => setExpanded(false)}>
        <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
          <TimerRing timer={timer} />
          <button onClick={() => setExpanded(false)} className="chip mt-3 w-full py-2 text-sm">收合</button>
        </div>
      </div>
    );
  }
  return <TimerPill timer={timer} onExpand={() => setExpanded(true)} />;
}

// 計時器暫停時的「分 / 秒」輸入格：本地 draft 讓你能清空並連打兩位數，失焦時補零對齊。
function TimeField({ value, max, align, label, onCommit }: {
  value: number; max: number; align: "left" | "right"; label: string; onCommit: (n: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft !== null ? draft : String(value).padStart(2, "0");
  return (
    <input
      type="text" inputMode="numeric" pattern="[0-9]*" aria-label={label}
      value={shown}
      onFocus={() => setDraft("")}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "").slice(-2);
        setDraft(digits);
        onCommit(Math.min(max, digits === "" ? 0 : parseInt(digits, 10)));
      }}
      onBlur={() => setDraft(null)}
      className={`w-[2.2ch] bg-transparent leading-none outline-none focus:text-cyan-300 ${align === "right" ? "text-right" : "text-left"}`}
    />
  );
}
