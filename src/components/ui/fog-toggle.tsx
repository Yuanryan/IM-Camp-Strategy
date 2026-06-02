"use client";

import { Cloud, CloudOff } from "lucide-react";
import { useFog } from "@/components/ui/fog-context";

// 標題列：背景霧氣動態開關（關閉時霧氣靜止以省電，偏好存 localStorage）
export function FogToggle() {
  const { enabled, toggle } = useFog();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      title={enabled ? "凍結背景霧氣（省電，畫面保留）" : "恢復背景霧氣流動"}
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-all ${
        enabled
          ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20"
          : "border-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
      }`}
    >
      {enabled ? (
        <Cloud className="h-3.5 w-3.5" />
      ) : (
        <CloudOff className="h-3.5 w-3.5" />
      )}
      <span className="hidden sm:inline">霧氣</span>
    </button>
  );
}
