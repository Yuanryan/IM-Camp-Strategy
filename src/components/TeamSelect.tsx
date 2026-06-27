"use client";

import { useState, useRef, useEffect } from "react";

export type TeamOption = {
  id: number;
  name: string;
  color?: string;
  colorName?: string;
  colorText?: string;
  colorRing?: string;
};

// 小隊下拉選擇（自製，避免原生 <select> 在全螢幕模式下觸發離開全螢幕）。
// 觸發鈕寬度以「最長選項」為準：用隱藏量測層撐出固定寬度，選擇切換時不會抖動。
export function TeamSelect({
  teams,
  value,
  onChange,
  placeholder = "選擇小隊",
}: {
  teams: TeamOption[];
  value: number | "";
  onChange: (id: number | "") => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = teams.find((t) => t.id === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // 觸發鈕的標籤文字（含序號）；selected 為空時顯示 placeholder。
  const labelOf = (t: TeamOption) => `${teams.indexOf(t) + 1}. ${t.name}`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fld grid items-center font-medium"
      >
        {/* 量測層：把所有選項（含 placeholder）堆在同一格，撐出「最長選項」的寬度後隱藏。
            可見內容與量測層共用同一 grid cell，故鈕寬永遠等於最長選項。 */}
        <span className="pointer-events-none invisible col-start-1 row-start-1 h-0 overflow-hidden">
          {[placeholder, ...teams.map(labelOf)].map((txt, i) => (
            <span key={i} className="flex items-center gap-2 whitespace-nowrap pr-6">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" />
              <span>{txt}</span>
            </span>
          ))}
        </span>

        {/* 可見內容 */}
        <span className="col-start-1 row-start-1 flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            {selected?.color && (
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/60"
                style={{
                  background: selected.color,
                  boxShadow: selected.colorRing ? `0 0 7px ${selected.colorRing}` : undefined,
                }}
                title={selected.colorName}
              />
            )}
            <span className="truncate">
              {selected ? labelOf(selected) : placeholder}
            </span>
          </span>
          <span className="text-slate-400">▾</span>
        </span>
      </button>
      {open && (
        <ul className="absolute left-0 top-full z-50 mt-1 w-full rounded-xl border border-white/10 bg-slate-900 py-1 shadow-xl">
          <li>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onChange(""); setOpen(false); }}
              className="w-full whitespace-nowrap px-3 py-2 text-left text-sm text-slate-400 hover:bg-white/8"
            >
              {placeholder}
            </button>
          </li>
          {teams.map((t, i) => (
            <li key={t.id}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onChange(t.id); setOpen(false); }}
                className={`flex w-full items-center gap-2 whitespace-nowrap px-3 py-2 text-left text-sm font-medium hover:bg-white/8 ${value === t.id ? "text-cyan-300" : "text-slate-100"}`}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/60 bg-slate-500"
                  style={t.color ? {
                    background: t.color,
                    boxShadow: t.colorRing ? `0 0 7px ${t.colorRing}` : undefined,
                  } : undefined}
                  title={t.colorName}
                />
                <span>
                  {i + 1}. {t.name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
