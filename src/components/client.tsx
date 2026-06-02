"use client";

import useSWR from "swr";
import { useState } from "react";
import type { Snapshot } from "@/lib/snapshot";

export const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("讀取失敗");
    return r.json();
  });

// 全場狀態輪詢（投影 / 各站別共用）
export function useSnapshot(refreshMs = 2500) {
  const { data, error, isLoading, mutate } = useSWR<Snapshot>("/api/snapshot", fetcher, {
    refreshInterval: refreshMs,
  });
  return { snap: data, error, isLoading, mutate };
}

export async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "操作失敗");
  return data;
}

// 一顆會顯示結果 / 錯誤的動作按鈕
export function ActionButton({
  label,
  onAction,
  className = "",
  disabled,
  confirmText,
}: {
  label: string;
  onAction: () => Promise<string | void>;
  className?: string;
  disabled?: boolean;
  confirmText?: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy || disabled}
      onClick={async () => {
        if (confirmText && !window.confirm(confirmText)) return;
        setBusy(true);
        try {
          const msg = await onAction();
          if (msg) toast(msg, "ok");
        } catch (e) {
          toast(e instanceof Error ? e.message : "操作失敗", "err");
        } finally {
          setBusy(false);
        }
      }}
      className={`rounded-xl px-3.5 py-2 text-sm font-semibold shadow-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 ${
        className || "bg-zinc-900 text-white hover:bg-zinc-700"
      }`}
    >
      {busy ? "處理中…" : label}
    </button>
  );
}

// 極簡 toast
let toastTimer: ReturnType<typeof setTimeout> | null = null;
export function toast(message: string, kind: "ok" | "err" = "ok") {
  if (typeof document === "undefined") return;
  let el = document.getElementById("app-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "app-toast";
    el.style.position = "fixed";
    el.style.bottom = "20px";
    el.style.left = "50%";
    el.style.transform = "translateX(-50%)";
    el.style.zIndex = "9999";
    el.style.padding = "10px 18px";
    el.style.borderRadius = "10px";
    el.style.fontSize = "15px";
    el.style.fontWeight = "600";
    el.style.boxShadow = "0 4px 16px rgba(0,0,0,.18)";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.style.background = kind === "ok" ? "#16a34a" : "#dc2626";
  el.style.color = "#fff";
  el.style.opacity = "1";
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    if (el) el.style.opacity = "0";
  }, 2600);
}

// 小隊下拉選擇
export function TeamSelect({
  teams,
  value,
  onChange,
  placeholder = "選擇小隊",
}: {
  teams: { id: number; name: string }[];
  value: number | "";
  onChange: (id: number | "") => void;
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
      className="min-w-36 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-medium shadow-sm"
    >
      <option value="">{placeholder}</option>
      {teams.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  );
}
