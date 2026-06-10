"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { RadioTower, Gavel, ChevronDown } from "lucide-react";
import { EVENTS, EffectType, ITEM_GRADE_COLORS } from "@/lib/game";
import type { ActiveItemView, AuctionSnapshot } from "@/lib/snapshot";

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

// 拍賣公告 / 現場喊價橫幅（小隊端純顯示，無出價鈕——大家用喊的）。
// myCoins 傳入時，拍賣中會提示自身光幣餘額（讓小隊知道喊到哪裡會買不起）。
export function AuctionBanner({
  auction,
  myCoins,
}: {
  auction: AuctionSnapshot;
  myCoins?: number;
}) {
  const { announcement, live } = auction;
  if (!announcement && !live) return null;
  return (
    <div className="breathe overflow-hidden rounded-xl border border-amber-400/50 bg-amber-400/10 shadow-[0_0_18px_rgba(251,191,36,0.25)]">
      {announcement && (
        <div className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold tracking-wide text-amber-200">
          <Gavel className="h-4 w-4 shrink-0 text-amber-300" />
          <span>{announcement}</span>
        </div>
      )}
      {live && (
        <div
          className={`flex items-center justify-between gap-3 px-4 py-3 ${
            announcement ? "border-t border-amber-400/20" : ""
          }`}
        >
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-amber-300/70">拍賣中</div>
            <div className="truncate text-base font-bold text-slate-100">{live.title}</div>
            {myCoins != null && (
              <div className="text-[11px] text-slate-400">
                你目前光幣 <span className="font-semibold text-amber-200">{myCoins}</span>
                ｜舉手喊價，別用按的！
              </div>
            )}
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[10px] uppercase tracking-widest text-amber-300/70">目前喊價</div>
            <Num className="neon-gold text-4xl font-black leading-none">{live.currentBid}</Num>
          </div>
        </div>
      )}
    </div>
  );
}

// 底部導航欄（玩家頁面專用，fixed bottom）
export function BottomNav<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: readonly (readonly [T, ReactNode, ReactNode])[];
  active: T;
  onChange: (key: T) => void;
}) {
  return (
    <nav className="bottom-nav">
      <div className="mx-auto flex max-w-5xl">
        {tabs.map(([key, label, icon]) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-3.5 text-[11px] font-semibold tracking-wide transition-all ${
              active === key ? "text-cyan-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <span
              className={`transition-transform duration-150 ${
                active === key ? "scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" : ""
              }`}
            >
              {icon}
            </span>
            {label}
            {active === key && (
              <span className="absolute top-0 left-0 right-0 h-[2px] bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)]" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}

// 當前小隊與頁面相關的動產效果徽章（顯示在 StickyTeam 內）
// 點擊（或滑鼠 hover）顯示說明 — 平板無 hover，故同時支援點擊展開。
export function TeamItemBadges({
  items,
  relevantTypes,
}: {
  items: ActiveItemView[];
  relevantTypes: EffectType[];
}) {
  // 點擊（平板）或 hover（桌機）皆顯示浮動說明；點擊版本數秒後自動消失
  const [openId, setOpenId] = useState<number | null>(null);
  const [hoverId, setHoverId] = useState<number | null>(null);
  useEffect(() => {
    if (openId === null) return;
    const t = setTimeout(() => setOpenId(null), 2000);
    return () => clearTimeout(t);
  }, [openId]);
  const relevant = items.filter((i) => (relevantTypes as string[]).includes(i.effectType));
  if (!relevant.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {relevant.map((item) => (
        <div
          key={item.id}
          className="relative"
          onMouseEnter={() => setHoverId(item.id)}
          onMouseLeave={() => setHoverId((cur) => (cur === item.id ? null : cur))}
        >
          <button
            type="button"
            onClick={() => setOpenId((cur) => (cur === item.id ? null : item.id))}
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-medium transition active:scale-95 ${ITEM_GRADE_COLORS[item.grade] ?? "chip"} ${openId === item.id ? "ring-1 ring-white/50" : ""}`}
          >
            <span className="font-bold opacity-70">{item.grade}</span>
            <span>{item.name}</span>
            {item.effectType !== EffectType.REMINDER && item.effectType !== EffectType.WHEEL_NO_ZERO && (
              <span className={`font-mono ${item.effectValue >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {item.effectType === EffectType.COINS_PER_ROUND
                  ? `+${item.effectValue}/輪`
                  : item.effectType === EffectType.ALLIANCE_BONUS || item.effectType === EffectType.UNDERDOG
                    ? `+${item.effectValue}光幣`
                    : `${item.effectValue >= 0 ? "+" : ""}${(item.effectValue * 100).toFixed(0)}%`}
              </span>
            )}
            {item.usesRemaining !== null && (
              <span className="text-slate-400">×{item.usesRemaining}</span>
            )}
          </button>
          {(openId === item.id || hoverId === item.id) && (
            <FloatingDesc>{item.description}</FloatingDesc>
          )}
        </div>
      ))}
    </div>
  );
}

// 浮動說明卡：絕對定位，覆蓋於內容之上（不擠壓版面）。由父層控制顯示時機。
export function FloatingDesc({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none absolute left-0 top-full z-50 mt-1 w-max max-w-[15rem] rounded-lg border border-white/15 bg-slate-900 px-2.5 py-1.5 text-xs leading-snug text-slate-200 shadow-xl shadow-black/50">
      {children}
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

// 動產選擇器：自訂下拉，trigger 維持窄寬，清單列可換行顯示完整說明。
// 取代原生 <select>（option 無法換行/裁切，長說明會撐爆版面）。
type AssetOption = { id: number; name: string; grade: string; description?: string };
export function AssetPicker({
  assets,
  value,
  onChange,
  placeholder = "選擇動產",
  className = "",
}: {
  assets: AssetOption[];
  value: number | "";
  onChange: (id: number | "") => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<{ left: number; top: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const selected = value === "" ? undefined : assets.find((a) => a.id === value);

  // 量測 trigger 位置 → 以 fixed 定位 portal 內的清單（脫離 overflow/stacking 限制）
  const measure = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ left: r.left, top: r.bottom + 4, width: r.width });
  }, []);

  useEffect(() => {
    if (!open) return;
    measure();
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onReflow = () => measure();
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    window.addEventListener("scroll", onReflow, true); // capture：含內層捲動容器
    window.addEventListener("resize", onReflow);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
      window.removeEventListener("scroll", onReflow, true);
      window.removeEventListener("resize", onReflow);
    };
  }, [open, measure]);

  return (
    <div className={`min-w-0 ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fld flex w-full items-center justify-between gap-2 text-left"
      >
        <span className={`truncate ${selected ? "text-slate-100" : "text-slate-500"}`}>
          {selected ? `[${selected.grade}] ${selected.name}` : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && rect && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popRef}
            style={{ position: "fixed", left: rect.left, top: rect.top, width: rect.width, zIndex: 9999 }}
            className="max-h-72 overflow-y-auto rounded-xl border border-white/15 bg-slate-900 shadow-xl shadow-black/50"
          >
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className="block w-full px-3 py-2 text-left text-sm text-slate-400 hover:bg-white/5"
            >
              {placeholder}
            </button>
            {assets.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => { onChange(a.id); setOpen(false); }}
                className={`block w-full border-t border-white/5 px-3 py-2 text-left transition hover:bg-white/8 ${
                  a.id === value ? "bg-cyan-400/10" : ""
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${ITEM_GRADE_COLORS[a.grade] ?? "chip"}`}>
                    {a.grade}
                  </span>
                  <span className="text-sm font-semibold text-slate-100">{a.name}</span>
                </div>
                {a.description && (
                  <p className="mt-0.5 text-xs leading-snug text-slate-400">{a.description}</p>
                )}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
