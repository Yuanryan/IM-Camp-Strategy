import type { ReactNode } from "react";
import { EVENTS } from "@/lib/game";

// 等寬霓虹數字
export function Num({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={`num ${className}`}>{children}</span>;
}

// 不動產等級：發光光點（0~3）
export function LevelDots({ level }: { level: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 align-middle">
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${
            i <= level
              ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.9)]"
              : "bg-slate-600/70"
          }`}
        />
      ))}
    </span>
  );
}

// 現價 + 受事件影響的漲跌（對比初始價）
export function PriceTag({
  current,
  base,
  className = "",
}: {
  current: number;
  base: number;
  className?: string;
}) {
  const up = current > base;
  const down = current < base;
  return (
    <span className={`num font-bold ${className} ${up ? "text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]" : down ? "text-rose-400" : "text-slate-100"}`}>
      {current}
      {up && <span className="ml-0.5 text-emerald-400">▲</span>}
      {down && <span className="ml-0.5 text-rose-500">▼</span>}
    </span>
  );
}

// 頂部市場事件呼吸橫幅
export function EventBanner({ events }: { events: number[] }) {
  if (!events.length) return null;
  return (
    <div className="breathe rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/10 px-4 py-2 text-sm font-semibold text-fuchsia-200">
      <span className="mr-2">📡 市場事件進行中</span>
      {events.map((i) => EVENTS[i]?.name).filter(Boolean).join("　|　")}
    </div>
  );
}
