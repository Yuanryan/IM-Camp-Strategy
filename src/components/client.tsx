"use client";

import useSWR, { mutate as globalMutate } from "swr";
import { useState } from "react";
import type { Snapshot } from "@/lib/snapshot";
import type { UndoRecipe } from "@/lib/game";

// 動作按鈕的回傳：字串＝成功訊息；物件＝成功訊息＋（選用）幾秒內可撤銷的配方
export type ActionResult = { message?: string; undo?: UndoRecipe };

export const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("讀取失敗");
    return r.json();
  });

// 全場狀態輪詢（投影 / 各站別共用）。
// endpoint 預設要登入的 /api/snapshot；免登入的投影頁傳入 /api/public/snapshot。
export function useSnapshot(refreshMs = 2500, endpoint = "/api/snapshot") {
  const { data, error, isLoading, mutate } = useSWR<Snapshot>(endpoint, fetcher, {
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
  onAction: () => Promise<string | void | ActionResult>;
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
          const res = await onAction();
          if (res) {
            if (typeof res === "string") toast(res, "ok");
            else if (res.message || res.undo) toast(res.message ?? "完成", "ok", res.undo);
          }
        } catch (e) {
          toast(e instanceof Error ? e.message : "操作失敗", "err");
        } finally {
          setBusy(false);
        }
      }}
      className={`inline-flex min-h-[2.75rem] items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 ${
        className || "btn-cyan"
      }`}
    >
      {busy ? "處理中…" : label}
    </button>
  );
}

// 極簡 toast（帶 undo 時會多一顆「撤銷」按鈕，顯示 5 秒）
let toastTimer: ReturnType<typeof setTimeout> | null = null;
export function toast(message: string, kind: "ok" | "err" = "ok", undo?: UndoRecipe) {
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
    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.gap = "12px";
    el.style.padding = "10px 18px";
    el.style.borderRadius = "10px";
    el.style.fontSize = "15px";
    el.style.fontWeight = "600";
    el.style.boxShadow = "0 4px 16px rgba(0,0,0,.18)";
    document.body.appendChild(el);
  }
  el.replaceChildren();
  const span = document.createElement("span");
  span.textContent = message;
  el.appendChild(span);
  el.style.background = kind === "ok" ? "#16a34a" : "#dc2626";
  el.style.color = "#fff";
  el.style.opacity = "1";
  if (toastTimer) clearTimeout(toastTimer);

  const hideAfter = (ms: number) => {
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      if (el) el.style.opacity = "0";
    }, ms);
  };

  if (undo && undo.ledgerIds?.length) {
    const btn = document.createElement("button");
    btn.textContent = "撤銷";
    btn.style.cssText =
      "background:rgba(255,255,255,.22);color:#fff;border:1px solid rgba(255,255,255,.5);" +
      "border-radius:8px;padding:4px 12px;font-size:14px;font-weight:700;cursor:pointer;";
    btn.onclick = async () => {
      btn.disabled = true;
      btn.style.opacity = "0.5";
      try {
        await postJson("/api/undo", { ledgerIds: undo.ledgerIds, property: undo.property });
        await globalMutate(() => true); // 重新抓所有輪詢資料，畫面馬上回到撤銷後狀態
        span.textContent = "已撤銷";
        el!.style.background = "#0891b2";
        btn.remove();
        hideAfter(1600);
      } catch (e) {
        span.textContent = e instanceof Error ? e.message : "撤銷失敗";
        el!.style.background = "#dc2626";
        btn.disabled = false;
        btn.style.opacity = "1";
        hideAfter(2600);
      }
    };
    el.appendChild(btn);
    hideAfter(5000);
  } else {
    hideAfter(2600);
  }
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
      className="fld min-w-36 font-medium"
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
