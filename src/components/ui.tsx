import type { ReactNode } from "react";
import { RadioTower } from "lucide-react";
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
    <div className="breathe flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200">
      <RadioTower className="h-4 w-4 shrink-0 text-cyan-400" />
      <span className="mr-1 shrink-0 tracking-wide">市場事件進行中</span>
      <span className="text-cyan-300/90">
        {events.map((i) => EVENTS[i]?.name).filter(Boolean).join("　|　")}
      </span>
    </div>
  );
}

// 科技感 HUD 頁籤（發光底線）— 各分頁頁面共用
export function HudTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: readonly (readonly [T, ReactNode, ReactNode])[];
  active: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="flex gap-6 border-b border-white/10 pb-1">
      {tabs.map(([key, label, icon]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`relative flex items-center gap-2 px-2 py-3 text-sm font-bold tracking-wider transition-all ${
            active === key
              ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          {icon}
          {label}
          {active === key && (
            <span className="absolute bottom-[-1px] left-0 h-[2px] w-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)]" />
          )}
        </button>
      ))}
    </div>
  );
}
