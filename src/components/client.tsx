"use client";

import useSWR, { mutate as globalMutate } from "swr";
import { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import type { Snapshot, ActiveItemView } from "@/lib/snapshot";
import type { UndoRecipe } from "@/lib/game";

// 停用驗證時，小隊身分無法從 cookie 取得（dev session 一律 fallback 到第一隊），
// 故把當前檢視的 teamId 夾在 query 上，讓 server 知道現在是「以哪一隊操作」。
//
// authDisabled 由 snapshot 帶下來（env 或執行期 Admin 旗標任一開啟即為 true）。
// 旗標關閉時原樣回傳——server 端身分認 cookie，沒帶 teamId 就 fallback 到第一隊（見 auth.ts）。
export function withTeam(url: string, teamId: number, authDisabled: boolean): string {
  if (!authDisabled) return url;
  return url + (url.includes("?") ? "&" : "?") + `teamId=${teamId}`;
}

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
  label: ReactNode;
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
        if (confirmText && !(await confirmDialog(confirmText))) return;
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
        await postJson("/api/undo", { ledgerIds: undo.ledgerIds, property: undo.property, properties: undo.properties, itemIds: undo.itemIds, lotteryNumberId: undo.lotteryNumberId, lotteryPoolRevert: undo.lotteryPoolRevert });
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

// 一筆金流明細：label＝事件名（過路費→第5隊 等），amount＝帶號金額（正收入 / 負支出）。
// items＝促成這筆金額的動產（收益來源 / 過路費減免等），於階段 2 面板顯示徽章。
// breakdown＝逐項拆分（回合收益按各動產分列：哪個道具貢獻多少），動產徽章呈現。
// subRows＝一般文字子列（如命運輪盤：投入 / 拿回），於面板縮排顯示；header amount 為合計。
// 供地圖階段 2 結算面板（PhaseResult）逐列顯示金額用。
export type MoneyRow = {
  label: string;
  amount: number;
  cardPoints?: number; // 同時發放卡牌點數時附帶顯示（不計入光幣淨變動）
  items?: ActiveItemView[];
  breakdown?: { item: ActiveItemView; amount: number }[];
  subRows?: { label: string; amount: number }[];
};

// 樣式化確認對話框（取代 window.confirm）。回傳 Promise<boolean>：確定=true、取消=false。
// 與 toast 一樣用命令式 DOM 建立，故任何地方都可呼叫、不需 React 掛載點。
export function confirmDialog(message: string): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;" +
      "padding:20px;background:rgba(2,6,23,.7);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);" +
      "animation:appFadeIn .12s ease-out;";

    const card = document.createElement("div");
    card.style.cssText =
      "width:100%;max-width:380px;border-radius:16px;padding:22px;" +
      "background:rgba(15,23,42,.92);border:1px solid rgba(255,255,255,.12);" +
      "box-shadow:0 20px 60px rgba(0,0,0,.5),inset 0 1px 0 0 rgba(255,255,255,.06);" +
      "animation:appPopIn .14s ease-out;";

    const msg = document.createElement("p");
    msg.textContent = message;
    msg.style.cssText =
      "margin:0 0 20px;font-size:15px;line-height:1.6;font-weight:600;color:#e2e8f0;white-space:pre-wrap;";

    const row = document.createElement("div");
    row.style.cssText = "display:flex;gap:10px;justify-content:flex-end;";

    const baseBtn =
      "min-height:2.75rem;padding:8px 18px;border-radius:12px;font-size:14px;font-weight:700;" +
      "cursor:pointer;transition:all .12s;";
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = "取消";
    cancelBtn.style.cssText =
      baseBtn +
      "background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);color:#cbd5e1;";
    const okBtn = document.createElement("button");
    okBtn.type = "button";
    okBtn.textContent = "確定";
    okBtn.style.cssText =
      baseBtn +
      "background:rgba(34,211,238,.12);border:1px solid rgba(34,211,238,.45);color:#67e8f9;";

    let done = false;
    const close = (result: boolean) => {
      if (done) return;
      done = true;
      document.removeEventListener("keydown", onKey);
      overlay.remove();
      resolve(result);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
      else if (e.key === "Enter") close(true);
    };

    cancelBtn.onclick = () => close(false);
    okBtn.onclick = () => close(true);
    overlay.onclick = (e) => {
      if (e.target === overlay) close(false); // 點背景＝取消
    };
    document.addEventListener("keydown", onKey);

    row.append(cancelBtn, okBtn);
    card.append(msg, row);
    overlay.append(card);
    document.body.appendChild(overlay);
    okBtn.focus(); // Enter 直接確定
  });
}

// 小隊下拉選擇（自製，避免原生 <select> 在全螢幕模式下觸發離開全螢幕）
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

  return (
    <div ref={ref} className="relative min-w-36">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fld flex w-full items-center justify-between gap-2 font-medium"
      >
        <span className="truncate">
          {selected ? `${teams.indexOf(selected) + 1}. ${selected.name}` : placeholder}
        </span>
        <span className="text-slate-400">▾</span>
      </button>
      {open && (
        <ul className="absolute left-0 top-full z-50 mt-1 w-full rounded-xl border border-white/10 bg-slate-900 py-1 shadow-xl">
          <li>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onChange(""); setOpen(false); }}
              className="w-full px-3 py-2 text-left text-sm text-slate-400 hover:bg-white/8"
            >
              {placeholder}
            </button>
          </li>
          {teams.map((t, i) => (
            <li key={t.id}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onChange(t.id); setOpen(false); }}
                className={`w-full px-3 py-2 text-left text-sm font-medium hover:bg-white/8 ${value === t.id ? "text-cyan-300" : "text-slate-100"}`}
              >
                {i + 1}. {t.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
