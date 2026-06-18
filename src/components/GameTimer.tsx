"use client";

// 流動關卡計時器（單一事實來源）。
// useGameTimer：倒數狀態 + 控制；TimerRing：說明階段大圓環（可手動調整）；TimerPill：進行中固定角落小膠囊。
// 由呼叫端（GameSession）持有狀態，同一份倒數可同時餵給兩種外觀。
import { useEffect, useRef, useState } from "react";
import { Num } from "@/components/ui";
import { Pause, Play, RotateCcw, Timer as TimerIcon, Maximize2 } from "lucide-react";

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
export function TimerPill({ timer, onExpand }: { timer: GameTimer; onExpand?: () => void }) {
  const { sec, running } = timer;
  const isDanger = sec <= 10 && sec > 0;
  const ended = sec === 0;
  return (
    <div className="fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-full border border-white/15 bg-slate-900/90 px-3 py-2 shadow-lg shadow-black/40 backdrop-blur-md">
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
    </div>
  );
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
