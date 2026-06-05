"use client";

import { useEffect, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

export function FullscreenButton() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Keep state in sync with browser-level fullscreen changes
  // (e.g. user presses Esc to exit)
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggle = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Hide on browsers that don't support the API (e.g. iOS Safari)
  if (typeof document !== "undefined" && !document.fullscreenEnabled) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isFullscreen}
      title={isFullscreen ? "退出全螢幕" : "全螢幕"}
      className="flex items-center gap-1.5 rounded-lg border border-white/5 px-2.5 py-1.5 text-xs text-slate-400 transition-all hover:border-white/20 hover:bg-white/10 hover:text-slate-200"
    >
      {isFullscreen ? (
        <Minimize2 className="h-3.5 w-3.5" />
      ) : (
        <Maximize2 className="h-3.5 w-3.5" />
      )}
      <span className="hidden sm:inline">{isFullscreen ? "還原" : "全螢幕"}</span>
    </button>
  );
}
